# Backend Wiring — into `sneat-go`

How an extension's Go backend gets served by the Sneat platform. The extension's
implementation lives in **its own repo**; `sneat-go` mounts it through a thin
adapter at two fixed **injection points**.

Live examples to copy from: `sneat-go/pkg/modules/eventus/` and
`sneat-go/pkg/modules/gameboard/`.

## The shape

```
<ext> repo                         sneat-go
─────────────────────────────      ───────────────────────────────────────────
backend/<ext>/                     pkg/modules/<ext>/module.go   (thin adapter)
  NewHandler(...) *Handler           ├─ facade/identity adapters
  (*Handler).Register(mux)           ├─ getMux()  (lazy build)
                                      ├─ RegisterHttpRoutes(handle)
                                      └─ Extension() extension.Config
                                   pkg/sneatmain/sneat_main.go    (registration)
                                      startServer( …, <ext>.Extension() )
```

## Step 1 — the extension's own backend module

In the extension repo, the `backend/<ext>/` Go module exposes a constructor and a
route registrar. It imports only core/foundational packages — never `sneat-go`.

```go
// github.com/sneat-co/<ext>/backend/<ext>
func NewHandler(store Store, /* …other deps… */) *Handler { … }
func (h *Handler) Register(mux *http.ServeMux)            { … } // Go 1.22 route patterns
```

## Step 2 — the thin adapter in `sneat-go`

Create `sneat-go/pkg/modules/<ext>/module.go`. It does four things:

```go
package <ext>

import (
	"context"
	"net/http"
	"sync"

	<ext>lib "github.com/sneat-co/<ext>/backend/<ext>"
	"github.com/sneat-co/sneat-go-core/extension"
	"github.com/sneat-co/sneat-go-core/facade"
)

const extensionID = "<ext>"

// (1) Adapters bridging core facades to the extension's interfaces
//     (membership, identity, enricher, …). Keep them tiny.
type membershipAdapter struct{}
// … implement the methods the extension's NewHandler expects …

// (2) Lazily build the handler + its ServeMux on first request, so
//     facade.GetSneatDB has been initialised by the time it runs.
var (
	muxOnce sync.Once
	mux     *http.ServeMux
)

func getMux() *http.ServeMux {
	muxOnce.Do(func() {
		db, err := facade.GetSneatDB(context.Background())
		if err != nil {
			panic(err) // startup/infra error — fail loud
		}
		h := <ext>lib.NewHandler(<ext>lib.NewDalgoStore(db), membershipAdapter{} /*, …*/)
		m := http.NewServeMux()
		h.Register(m)
		mux = m
	})
	return mux
}

func serve<Ext>(w http.ResponseWriter, r *http.Request) {
	getMux().ServeHTTP(w, r) // request passes through unchanged so PathValue works
}

// (3) Mount under the standard /v0/ prefix so the authenticated SneatApiService
//     client can reach it. The extension mux does its own method+path matching,
//     so register each method as a catch-all.
func RegisterHttpRoutes(handle extension.HTTPHandleFunc) {
	for _, method := range []string{http.MethodGet, http.MethodPost, http.MethodPut} {
		handle(method, "/v0/api4<ext>/*path", serve<Ext>)
	}
}

// (4) The registration entry point.
func Extension() extension.Config {
	return extension.NewExtension(extensionID, extension.RegisterRoutes(RegisterHttpRoutes))
}
```

**Route convention:** the public path prefix is **`/v0/api4<ext>/`** (e.g.
`/v0/api4eventus/`). Only list the HTTP methods the extension actually serves.

## Step 3 — the registration injection point

In `sneat-go/pkg/sneatmain/sneat_main.go`, import the package and add
`<ext>.Extension()` to the `startServer(...)` list:

```go
import (
	// …
	"github.com/sneat-co/sneat-go/pkg/modules/<ext>"
)

// …inside Main():
startServer(
	reportPanic,
	wrapHandler,
	httpRouter,
	emailClient,
	// …existing extensions…
	eventus.Extension(),
	gameboard.Extension(),
	<ext>.Extension(), // ← your extension here
)
```

That's the whole wiring. Adding one line to `startServer(...)` plus the
`pkg/modules/<ext>/module.go` adapter is all `sneat-go` needs.

## Checklist

- [ ] `backend/<ext>/` module exposes `NewHandler(...)` + `Register(mux)`, no
      `sneat-go` import.
- [ ] `sneat-go/pkg/modules/<ext>/module.go` with adapters, `getMux()`,
      `RegisterHttpRoutes`, `Extension()`.
- [ ] Routes mounted under `/v0/api4<ext>/*path` for the methods used.
- [ ] `<ext>.Extension()` added to `startServer(...)` in `sneat_main.go`.
- [ ] `go build ./...` and `go test ./...` green in `sneat-go`.

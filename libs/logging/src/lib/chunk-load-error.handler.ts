import { ErrorHandler, Provider } from '@angular/core';

/**
 * Delegating {@link ErrorHandler} that reloads the app once when a lazy-loaded
 * chunk fails to load, and forwards every other error to an inner handler.
 *
 * After a deploy, the hash-named lazy chunks are replaced on the server. A tab
 * that was already open is still running an older `main.js` that references the
 * previous chunk hashes, so navigating to a lazy route fetches a chunk URL that
 * now 404s. Firebase Hosting's SPA rewrite then returns `index.html` for the
 * missing `.js`, and the browser throws a `ChunkLoadError` /
 * "'text/html' is not a valid JavaScript MIME type". A single full reload pulls
 * the current `index.html` + matching chunks and transparently recovers.
 *
 * Non-chunk errors are delegated unchanged, so existing error reporting (e.g.
 * the Sentry handler) keeps working. A short time-based guard (in
 * `sessionStorage`) prevents a reload loop when a chunk is genuinely broken.
 *
 * Alternative considered: an Angular service worker (ngsw) + `SwUpdate` would
 * largely *prevent* this by caching a consistent version set and prompting on a
 * new deploy. We deliberately do NOT add a service worker just for this — the
 * apps currently ship without one, and a SW brings its own caching/staleness
 * complexity. If a PWA service worker is adopted later (for offline/installable
 * support), this handler can stay as a cheap backstop.
 */
export class ChunkLoadErrorHandler implements ErrorHandler {
	private static readonly reloadKey = 'sneat:chunk-reload-at';
	private static readonly reloadGuardMs = 10_000;

	constructor(private readonly delegate: ErrorHandler) {}

	handleError(error: unknown): void {
		if (
			ChunkLoadErrorHandler.isChunkLoadError(error) &&
			this.reloadOnceWithinGuard()
		) {
			return;
		}
		this.delegate.handleError(error);
	}

	/** Reloads at most once per guard window; returns true if a reload was triggered. */
	private reloadOnceWithinGuard(): boolean {
		let lastReloadAt = 0;
		try {
			lastReloadAt = Number(
				sessionStorage.getItem(ChunkLoadErrorHandler.reloadKey) ?? 0,
			);
		} catch {
			// sessionStorage may be unavailable (e.g. private mode) — fall through.
		}
		if (Date.now() - lastReloadAt <= ChunkLoadErrorHandler.reloadGuardMs) {
			// Reloaded very recently and still failing -> stop to avoid a loop.
			return false;
		}
		try {
			sessionStorage.setItem(
				ChunkLoadErrorHandler.reloadKey,
				String(Date.now()),
			);
		} catch {
			// ignore storage failures; still attempt the reload below.
		}
		location.reload();
		return true;
	}

	private static isChunkLoadError(error: unknown): boolean {
		const err = error as { name?: string; message?: string } | null;
		const name = err?.name ?? '';
		const message = err?.message ?? String(error);
		return (
			name === 'ChunkLoadError' ||
			/Failed to fetch dynamically imported module/i.test(message) ||
			/error loading dynamically imported module/i.test(message) ||
			/Loading chunk [\w-]+ failed/i.test(message) ||
			/Importing a module script failed/i.test(message) ||
			/is not a valid JavaScript MIME type/i.test(message)
		);
	}
}

/**
 * Provides a baseline {@link ChunkLoadErrorHandler} wrapping Angular's default
 * `ErrorHandler`. Apps get this via `getStandardSneatProviders`. When Sentry is
 * configured its own (also chunk-aware) handler is provided later and wins; this
 * baseline covers apps without Sentry.
 */
export function provideChunkLoadErrorRecovery(): Provider {
	return {
		provide: ErrorHandler,
		useFactory: () => new ChunkLoadErrorHandler(new ErrorHandler()),
	};
}

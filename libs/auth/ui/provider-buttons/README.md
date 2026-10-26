# OAuth provider buttons

> **Web UI:** follow the [Sneat web UI bible](https://github.com/sneat-co/sneat-specs/blob/main/standards/frontend-ux/README.md).

Import `AuthProviderButtonsComponent` from `@sneat/auth-ui/provider-buttons`.
This standalone OnPush component renders the existing Google, Apple, Microsoft,
Facebook and GitHub provider rows. It needs no auth, router, user-record,
Firestore or analytics providers. Selecting a native Ionic button emits
`providerSelected: OAuthProviderId`; the host owns authentication, navigation,
errors and account readiness. Construction starts no authentication or storage
operation. SVG icons are bundled through the component's direct Ionicons dependency,
so consumers need no global icon registration or icon-asset requests.

Inputs:

- `providers`: optional provider allowlist; omitted shows all five, `[]` shows none.
  Display order stays Google, Apple, Microsoft, Facebook, GitHub.
- `busy`: optional active provider; shows its spinner and disables all buttons.
- `disabled`: disables every button, including while another sign-in method is busy.
- `labels`: partial plain-text map keyed by provider ID. Missing, blank or labels
  longer than 160 characters fall back to the existing English label.

For example, `[labels]="{'google.com': 'Войти через Google'}"` localizes that
button. Content is interpolated as text. The component supplies rows/columns
without a card or page shell, so it can remain inside the existing AuthPanel grid
or a host-owned login dialog. Telegram, company SSO, email and account-readiness
behavior remain in AuthPanel.

A consumer must install a published `@sneat/auth-ui` release containing this
secondary entry; source aliases alone do not make it available in an older package.
Lazy hosts should load the entry only on explicit login intent.

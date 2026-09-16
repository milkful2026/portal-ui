# portal-ui Style Guide

This is the first `STYLE_GUIDE.md` for `portal-ui`. It was established by
implementing **MA-128 (Admin User & Role Management)** — the spec explicitly
notes that no style guide existed before this feature and that this
implementation sets the baseline (see spec §10a, §13). It documents what was
actually built, not aspirational conventions.

## Stack

- Vite + React 18 + TypeScript
- **MUI (Material UI) v9** — component library and theme
- **React Router v7** — routing
- **TanStack Query v5** — server state (fetching, caching, mutations)
- **MSW (Mock Service Worker) v2** — API mocking for dev and E2E tests
- **notistack** — toast/snackbar notifications
- **jwt-decode** — reading claims off the JWT client-side (never used for
  verification — that only happens server-side)
- **Vitest + Testing Library** — unit tests
- **Playwright** — E2E tests

## Theme (`src/theme.ts`)

A single `createTheme()` call is the source of truth for design tokens:

- **Palette:** primary `#1B5E20` (deep green), secondary `#0277BD`, semantic
  `error`/`warning`/`success` colors, off-white `background.default`
  (`#F5F7F5`) vs. white `background.paper`.
- **Typography:** Inter with a system-font fallback stack; `h1`–`h3` and
  `body1`/`body2` sizes are set explicitly, everything else inherits MUI
  defaults.
- **Shape:** 8px border radius baseline.
- **Component defaults:** buttons are `disableElevation` with no
  text-transform; text fields default to `variant="outlined"`.

Future specs should extend this theme file rather than hardcoding colors or
spacing in components.

## Component conventions

- **Forms:** MUI `TextField` (`variant="outlined"`, the theme default) +
  `Button` (`variant="contained"` for the primary action, plain/`outlined`
  for secondary).
- **Dialogs:** MUI `Dialog` + `DialogTitle`/`DialogContent`/`DialogActions`.
  Destructive actions (Deactivate) use `color="error"` on the confirm button.
  Confirmation dialogs (role change, deactivate) are separate, focused
  dialogs rather than overloading the edit form's own dialog.
- **Tables:** plain MUI `Table` (not `DataGrid`) — see "Deviation from spec
  §10a" below.
- **Status indicators:** never color alone. `StatusBadge` pairs a MUI `Chip`
  with both an icon (`CheckCircle`/`Schedule`/`Block`) and a text label.
- **Toasts:** `notistack`'s `enqueueSnackbar`, `variant="success"` /
  `variant="error"`, wrapped once at the app root via `SnackbarProvider`.
- **Icon-only buttons:** always carry an explicit `aria-label` (e.g. row
  action menus use `Actions for {name}`).

## Routing conventions

- Unauthenticated routes (`/login`, `/login/2fa`) are declared outside the
  authenticated route subtree.
- `RequireAuth` (in `src/routes/guards.tsx`) redirects to `/login` when
  there's no valid session, preserving the original destination in
  `location.state.from` for post-login redirect.
- `RequireSuperAdmin` redirects non-SuperAdmin roles to `/403` — used to
  guard both the route (deep-link protection) and paired with hiding the
  nav link entirely for other roles.
- Role comes from the decoded JWT's `cognito:groups` claim
  (`src/auth/AuthContext.tsx`) — this is a UX/navigation convenience only;
  the actual authorization boundary is server-side (MA-129), per spec NFR
  "Security" (§5).

## API client conventions

- One typed client per domain (`src/api/client.ts`: `authApi`, `adminUsersApi`),
  built on `fetch`, not axios — no extra dependency needed for this surface.
  area.
- All responses are expected in the envelope shape
  `{ requestId, status, data }` / `{ requestId, status: 'error', error }`,
  matching the shape shown in spec §7 for `GET /v1/admin/users` and extended
  consistently to every other endpoint in §6 (see "Resolved ambiguities"
  below).
- `ApiError` carries a machine-readable `code` and the human-readable
  `message` the backend is expected to supply — screens generally render
  `err.message` directly rather than re-deriving copy client-side, so backend
  copy changes propagate without a UI redeploy.

## Mocking conventions (MSW)

- `src/mocks/db.ts` — an in-memory seed dataset (5 admins covering every role
  and status), reset on every full page load. Never treat this as durable
  storage; it exists to make the UI demoable and E2E-testable with zero
  backend dependency.
- `src/mocks/handlers.ts` — implements the full contract from spec §6,
  including the edge cases in §9 (lockout, pending/deactivated login
  messaging, duplicate email).
- The mock worker is started unconditionally in `src/main.tsx` (not just in
  `import.meta.env.DEV`), because this app has no real backend to call yet —
  MA-129 is being built in parallel. When MA-129 ships, gate
  `enableMocking()` behind an env flag and point `src/api/client.ts`'s
  `BASE_URL` at the real API Gateway origin.

## Testing conventions

- Unit tests (Vitest) live next to the module they test (`*.test.ts`), for
  pure logic only (CIDR parsing, role-change confirmation gating). UI
  components are not unit-tested here — Playwright covers user-facing
  behavior.
- E2E tests (Playwright, `e2e/*.spec.ts`) implement the spec's Testing
  Strategy scenarios verbatim. Selector priority follows the spec: `getByRole`
  > `getByText` > `getByLabel` > `getByTestId`. No CSS class selectors.
- When a label's accessible name collides with another visible label
  (e.g. "Name" vs. "Search by name or email"), scope the locator to the
  containing `dialog`/`row` role rather than reaching for a CSS selector or
  `data-testid`.

## Resolved ambiguities

The spec (MA-128) intentionally left some shapes to be filled in by
implementation, since the paired backend spec (MA-129) is being built in
parallel. Decisions made here, to be reconciled with MA-129 as "tech debt,
not silently reconciled" per spec §8:

1. **Envelope shape for endpoints beyond `GET /v1/admin/users`.** §7 only
   specifies that one DTO. This implementation uses the same
   `{ requestId, status, data }` / `{ requestId, status: 'error', error: { code, message } }`
   envelope for every endpoint in §6's table.
2. **Login/2FA request-response shapes.** Invented as: `POST .../login`
   returns `{ mfaToken }` on success; `POST .../2fa/verify` takes
   `{ mfaToken, code }` and returns `{ accessToken, refreshToken }` on
   success.
3. **The "access revoked mid-session" 403 (§9)** is distinguished from an
   ordinary permission-denied 403 by an assumed error code, `ACCESS_REVOKED`
   — only that code triggers the forced-logout redirect described in §9;
   any other 403 shows a "Permission denied" toast without logging the user
   out.
4. **Edit-form save toast copy.** Spec gives exact toast text for create
   (FR-3) and deactivate (FR-4) but not for a successful role/session-IP
   edit. This implementation uses "Admin account updated." and
   "{name} has been reactivated." for reactivation (also not specified).
5. **Client-side analytics event sink.** NFR "Observability" (§5) requires
   structured client-side analytics events but names no vendor/pipeline.
   `src/utils/analytics.ts` logs a structured event to `console.info` as a
   swappable seam — replace with a real analytics SDK call when one is
   chosen.
6. **Tablet "Last Login via row expand" (§10b).** Implemented as a toggle
   button in the table header that shows/hides the Last Login column for
   all rows at once, rather than a per-row expand affordance — a simpler
   approximation of the same "hidden by default, reachable on demand" intent.

## Deviation from spec §10a: Table component

Spec §10a's Component Map lists MUI `DataGrid` for the Admin Users table.
This implementation uses a plain MUI `Table` instead. Reasoning:

- `@mui/x-data-grid` was already present in `package.json` from a prior
  attempt, but its v9 API and licensing surface add complexity (column
  models, row models, its own internal ARIA structure) without a
  functional requirement in §4 that needs a full data-grid feature set —
  the spec asks for a table with search/filter, not virtualization,
  editing, or grouping.
- A plain `Table` gives direct control over the exact ARIA structure §10c
  requires (`role="table"`, real `<th scope="col">` header cells) and keeps
  Playwright selectors (`getByRole('row')`, `getByRole('cell')`) predictable.
- The functional requirements (§4) and accessibility requirements (§10c) are
  fully met either way; only the specific component choice differs from the
  (explicitly "not yet ratified", per §12 Q1) component map.

If a future spec formally ratifies `DataGrid` as the standard, revisit this
table and either migrate it or record the plain-`Table` choice as the
ratified convention instead.

## Environment note: Node 18

This environment runs Node 18.17.1. Two dependencies needed pinning below
their latest majors to stay compatible:

- `jsdom` is pinned to `^24` (Vitest's jsdom environment) — v30 requires
  Node ≥20.
- `@playwright/test` is pinned to `1.48.0` — 1.63+ refuses to run at all
  under Node 18 (a hard `process.exit`, not just an engines warning).

When this project's Node runtime is upgraded to 20+, both pins can be
lifted; there is no code-level reason to keep them.

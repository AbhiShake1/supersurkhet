# E2E Tests (apps/site)

Structure:
- `tests/routes/<page>` mirrors the route tree so specs stay close to page intent.

Run locally:
```bash
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:headed
```

Notes:
- E2E setup runs in two steps:
  1) Login with `E2E_USER_EMAIL` + `E2E_USER_PASSWORD`.
  2) Create a business and persist its slug in `tests/.data/business.json`.
- Auth state is saved to `tests/.auth/user.json`.
- The seed business is created with a unique name each run.
- Projects are split into `public`, `client`, `admin`, and `logout` suites.
- AutoForm fields expose data-testids in the format `af-input-<path>` where path
  segments are joined with `__` (example: `items__0__quantity`).

Known gaps:
- OTP signup flow requires email delivery (not mocked yet).
- Invitation flow requires a valid token (no creation path in tests yet).

Env vars:
```bash
export E2E_USER_EMAIL="your-test-user@example.com"
export E2E_USER_PASSWORD="your-password"
```

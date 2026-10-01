# web-x-api (Madeirense backend + web dashboard) — context for Claude

## Stack
Yarn workspaces monorepo (`madeirense-cross-platform`). Packages:
- `packages/api` — Express + TypeScript (ESM, `"type": "module"`), Prisma, JWT auth, built with `tsup`
- `packages/web` — React 19 + Vite, order/dashboard web app (chart.js, react-leaflet, tanstack-query)
- `packages/db` — likely the `@Madeirense/database` Prisma package referenced in build scripts
- `packages/shared`, `packages/library` — shared code

**Note:** the root README describes an older React Native mobile package under `packages/mobile` that no longer exists here — the real mobile app is Flutter, living in the sibling `../mobile` folder (separate git repo, see its own CLAUDE.md). The README is stale; not urgent to fix but don't trust it for mobile info.

## Common commands
- `yarn build-shared-code` — builds `@Madeirense/database` (prisma generate) + shared package, required before building api/web
- `yarn build:api` — pulls Prisma schema, rebuilds shared code, builds api
- `yarn workspace api dev` — nodemon (`nodemon.development.json`)
- `yarn workspace web dev` — vite dev server
- No test script exists yet (`packages/api` `"test"` is a stub that exits 1) — don't assume any automated coverage.

## Deploy
GitHub Actions (`.github/workflows/deploy.yml`), triggers on push to `staging`:
1. Builds shared code + web on the runner
2. SSHes into the Hostinger VPS (`/var/www/madeirense`), pulls, reinstalls, `yarn build:api`
3. Restarts via PM2 (`ecosystem.config.js` — single app `madeirense-api`, port 3001, `node --env-file=.env dist/server.js`)
4. scp's `packages/web/dist/*` to the VPS separately (nginx serves it — location not yet documented here)

Past bundling issues (resolved, see history if similar errors resurface): ESM/ CJS interop required migrating to `tsup`, externalizing the Prisma client, and switching to `--env-file` for dotenv instead of the `dotenv` package at runtime.

## API surface the mobile app depends on right now
Keep these stable/back-compatible while mobile is mid-rework:
- `GET /api/v1/global-settings/version` → `{ change_version: uuid }`
- `GET /api/v1/global-settings` → full settings object
- `GET /api/v1/products?group=menu` — paginated (mobile doesn't yet handle >1 page)
- `GET /api/v1/restaurants`, `GET /api/v1/restaurant-events`
- Cart: `POST /v1/cart/add`, `GET /v1/cart/mine`, `GET /v1/cart/mine/:type/summary`, `DELETE /v1/cart/clear/:type`, `PATCH /v1/cart/product/remove-items`, `DELETE /v1/cart/product/:id` — cart is server-authoritative, shared between web and mobile

## MVP note (Sept 2026)
This surface is already deployed and comparatively stable. Current priority is the mobile app — treat this repo mostly as "keep stable, fix what mobile needs" rather than a source of new scope this month, unless Robbie says otherwise.


## Styling — single source of truth
`src/styles/global.css`'s `:root {}` block is the canonical design-token file (colors, spacing) — it already exists and already traces back to a shared Penpot tokens file (see the comment at the top of that block). `tailwind.config.cjs`'s `theme.extend.colors` duplicates the same hex values (Tailwind needs them statically, can't read CSS custom properties at build time) — **keep these two in sync by hand** when a color changes; there's no automated link between them. Mobile's `lib/constants/colors.dart` mirrors the same values again, so all three should always match.

## Auth bugs fixed 2026-09-08 — flagging clearly, this is security-adjacent code
Needed for mobile's silent session-refresh (see mobile/CLAUDE.md). This auth flow had apparently never been exercised by a real client before — all three bugs would have made `/v1/auth/refresh` unusable for mobile as written:

1. **`routes/authentication.ts`** — the `/refresh` route's validator required a body field named `token`, but `controllers/authentication.ts`'s `refresh()` read `req.body.refreshToken`. A client satisfying the validator (sending `token`) would have `refreshToken` come through as `undefined` in the controller. Fixed: validator now checks `refreshToken`.
2. **`middlewares/authorization.ts`** (`validateJWT`) — when the session token was expired, the fallback-to-refresh-token logic only existed for `platform === 'web'`; every other platform (including mobile) just rethrew and 403'd immediately. Since `/refresh` sits behind this same global middleware, mobile could never actually reach the refresh controller once its session token expired — the one case the endpoint exists for. Added an equivalent `case 'mobile':` branch that checks `req.body.refreshToken` (mobile never sends a refresh token as a header, only in this endpoint's body).
3. **`controllers/authentication.ts`** (`refresh()`) — even once reachable, the old (expired) session token was being spread through into `renewTokens()`, which only actually mints fresh tokens when `sessionToken` is exactly `''`; otherwise it echoes the same tokens back unchanged. So a "successful" refresh would have silently handed back the same dead session token. Fixed by passing `sessionToken: ''` explicitly.

Checked with `tsc --noEmit` on the api package — no new errors from these three files beyond this repo's pre-existing `@Madeirense/database`/`@Madeirense/shared` module-resolution noise (those packages need `yarn build-shared-code` run first; unrelated to this change). **Not exercised against a running server** — no way to do that from this sandbox. Worth a real login → wait for expiry (or fake it) → confirm refresh works pass before this ships, given it touches every authenticated request.

## Response contract with mobile — API owns data correctness (rule set 2026-09-07)
See `AGREEMENT.md`'s "How we work together". Mobile does not defensively
clean up or coerce API response shapes — if a controller's JSON response
doesn't match its own declared type (e.g. a Prisma `Decimal` field coming
back as a string because a controller skipped `convertDecimals`, as
`orders.ts`/`coupon.ts` did — see mobile's `CLAUDE.md`, "Checkout" section,
2026-09-07), that gets fixed here, in the controller, not tolerated
client-side. **Update 2026-09-07:** checked all four — `createOrder`, `getOrderById`
and `validateCoupon` already wrapped their response in `convertDecimals`.
Only `getMyOrders` was actually missing it; fixed, and `getAllOrders`
(admin/staff listing, same bug, same file) fixed alongside it even though
nothing flagged it — same contract violation, same fix. Mobile's
`flutter analyze`/build/pub get all clean after the client-side rollback.

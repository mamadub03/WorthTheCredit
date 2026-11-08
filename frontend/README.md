# WorthTheCredit frontend

React, Vite, and TypeScript app for WorthTheCredit.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

The dev server prints a local URL (Vite’s default is http://localhost:5173).

Other scripts:

- `npm run build` — typecheck and production build
- `npm run lint` — oxlint
- `npm run preview` — serve the production build

## Tests

- Unit and component tests: `npm test` (Vitest with jsdom).
- End-to-end tests: `npm run e2e` (Playwright). They start the app on port 5174 with dev sign-in and a fake backend, so nothing else has to be running. They use your installed Google Chrome; without Chrome, run `npx playwright install chromium` once and set `PW_BUNDLED_CHROMIUM=1`.
- `npm run e2e:typecheck` type-checks the end-to-end suite, which Playwright itself doesn't.

AI assistance on this project is logged in `../docs/ai-contributions.md`.

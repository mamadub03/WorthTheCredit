# AI contributions

WorthTheCredit allows AI assistance when it is cited. This file is the running log of AI-produced work in this repository. Add an entry each time an AI tool writes or substantially edits project code or docs.

## 2026-11-07 — Initialize the React frontend

- **Requested by:** the project owner, on branch `frontend_v1`.
- **Stack specified by the owner:** React, Vite, and TypeScript.
- **Tool:** Cursor cloud agent, model Grok 4.7.
- **Starting point:** official `create-vite@9.3.4` template `react-ts` (React 19.3.1, Vite 8.3.6, TypeScript 7.0.2). The template’s demo page, demo styles, and demo assets were replaced.
- **Also installed by the agent:** `react-router` 8.5.1, with a home route and a not-found route.
- **Not chosen by the agent:** a CSS or component library. None had been agreed yet.

### Files the agent added or substantially edited

- `frontend/` scaffold from the Vite React TypeScript template, including `package.json`, `package-lock.json`, `vite.config.ts`, TypeScript config, oxlint config, and `index.html`
- `frontend/src/main.tsx` (template entry, kept)
- `frontend/src/App.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/NotFoundPage.tsx`
- `frontend/src/index.css`
- `frontend/README.md`
- `README.md`
- `docs/ai-contributions.md` (this file)

### Suggested citation

Frontend initialization (Vite, React, TypeScript, and React Router) was generated with Cursor Agent (Grok 4.7) on 7 November 2026 from the official Vite React TypeScript template, then adapted into the WorthTheCredit app shell. See `docs/ai-contributions.md`.

## 2026-11-07: Frontend coordination proposal (FE2, #25)

- **Requested by:** Rameen Syed (Frontend Developer 2), on branch `fe2/25-frontend-coordination`.
- **Tool:** Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`).
- **Inputs:** the team's product and technical decisions, `.cursor/rules/project.mdc`, GitHub issues #1 to #32, the frontend scaffold from PR #33, BE1's `docs/DATABASE_SCHEMA.md` and course search API (PR #38), and BE2's `worththecredit-api/docs/api-contract.md` (branch `BackPart2`).
- **What the AI wrote:** a coordination proposal between Frontend Developer 1 and Frontend Developer 2 (ownership, routes, the shared-file edits FE2 needs, styling options, shared components, the API client and mock mode, the review data both frontends handle, and what the frontend needs from the backend), and a Cursor rule that points agents working in `frontend/` at it.
- **Not decided by the AI:** everything in the doc is a proposal. Rameen reviews it before it is shared, and it takes effect only when Frontend Developer 1 approves the PR.
- **No application code:** this change adds no code and no dependencies.

### Files the AI added or substantially edited

- `docs/frontend-coordination.md`
- `.cursor/rules/frontend-coordination.mdc`
- `docs/ai-contributions.md` (this entry)

### Suggested citation

The FE1 and FE2 frontend coordination proposal was drafted with Claude Code (Claude Opus 5.5) on 7 November 2026 from the team's product decisions, project rules, GitHub issues, and both backend branches, for review by the FE2 developer. See `docs/ai-contributions.md`.

## 2026-11-07: API client, contracts, and mock mode (FE2, #25)

- **Requested by:** Rameen Syed (Frontend Developer 2), on branch `fe2/25-frontend-coordination`.
- **Tool:** Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`).
- **Inputs:** `docs/frontend-coordination.md` and BE2's `worththecredit-api/docs/api-contract.md` (branch `BackPart2`).
- **What the AI wrote:** the shared API client with one error type, zod schemas and calls for courses (a starter for FE1), reviews, profile, recommendations, and account, an in-browser mock of BE2's API with clearly labeled sample data and a demo banner, typed env settings, the review vocabulary, URL helpers, a Vitest setup, and 52 tests.
- **Dependencies it added:** `zod`; dev only: `vitest`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `jsdom`.
- **Not decided by the AI:** the API contract itself, which is BE2's.

### Files the AI added or substantially edited

- `frontend/src/api/` (`client.ts`, `errors.ts`, `appClient.ts`, `courses.ts`, `reviews.ts`, `profile.ts`, `recommendations.ts`, `account.ts`, `mock/`), with tests
- `frontend/src/config/env.ts`, `frontend/src/domain/reviewVocabulary.ts`, `frontend/src/routes/paths.ts`, with tests
- `frontend/src/test/setup.ts`, `frontend/vitest.config.ts`, `frontend/.env.example`
- `frontend/package.json`, `frontend/package-lock.json` (dependencies and the `test` script)
- `docs/frontend-coordination.md`, `.cursor/rules/frontend-coordination.mdc` (ownership list), and this entry

### Suggested citation

The frontend API client, schemas, and mock API were generated with Claude Code (Claude Opus 5.5) on 7 November 2026 against BE2's API contract, for review by the FE2 developer. See `docs/ai-contributions.md`.

## 2026-11-07: API layer aligned with the contracts on main (FE2, #25)

- **Requested by:** Rameen Syed (Frontend Developer 2), on branch `fe2/25-api-contracts`.
- **Tool:** Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`).
- **Why:** the backend merged into main (#43) with BE1's course routes and BE2's #10 contracts, which use `docs/DATABASE_SCHEMA.md` names. The first version of this layer followed BE2's earlier `BackPart2` app.
- **What the AI changed:** UUID course ids and the `{results, total, limit, offset}` envelope; review fields `concept_difficulty`, `weekly_hours_range`, `skills_gained`, `instructor_name`; nested `POST /courses/{id}/reviews` and `GET /courses/{id}/worth-score`; recommendations with four match levels and an `explanation`; removed the profile and resend-verification calls, which main's contract doesn't have; rewrote the mock and the tests to match; updated `docs/frontend-coordination.md`, the Cursor rule, and `frontend/.env.example`.

### Suggested citation

The FE2 API layer was realigned to the merged backend contracts with Claude Code (Claude Opus 5.5) on 7 November 2026, for review by the FE2 developer. See `docs/ai-contributions.md`.

## 2026-11-07: Auth0 sign-in, dev sign-in, and the route guard (FE2, #26)

- **Requested by:** Rameen Syed (Frontend Developer 2), on branch `fe2/26-auth`.
- **Tool:** Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`).
- **What the AI wrote:** one `useAuth()` interface backed by Auth0 (redirect login and signup, return to the starting page, refresh tokens, re-reading `email_verified` after verification) or by a dev sign-in for local work; `RequireAuth`, with a verified-email gate that doesn't sign students straight back in after logout; the `/callback` page; `useApiClient()`; logout cleanup of per-student browser data; FE2's route list; the four documented edits to `App.tsx`; the header sign-in menu, the verify-email screen, and FE2's `Button`; and tests.
- **Dependency it added:** `@auth0/auth0-react` 2.30.
- **Not finished until:** BE1's JWT validation (#8) and the team's Auth0 tenant exist, per the comments on #26.

### Files the AI added or substantially edited

- `frontend/src/features/auth/`, `frontend/src/components/form/Button.tsx`, `frontend/src/routes/fe2Routes.tsx`, `frontend/src/App.tsx`
- `frontend/package.json`, `frontend/package-lock.json`, and this entry

### Suggested citation

The frontend sign-in layer (Auth0 and dev sign-in) was generated with Claude Code (Claude Opus 5.5) on 7 November 2026, for review by the FE2 developer. See `docs/ai-contributions.md`.

## 2026-11-07: Structured review form with a course picker (FE2, #27)

- **Requested by:** Rameen Syed (Frontend Developer 2), on branch `fe2/27-review-form`.
- **Tool:** Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`).
- **What the AI wrote:** the `/review` page and form (goals, Worth Score, skills, concept difficulty, weekly hours, and optional feedback, professor, and semester), a course picker that searches `GET /courses`, the form model with the product's validation rules and the exact `ReviewCreate` JSON, the form-state hook, FE2's form controls (`Field`, `ChoiceGroup`, `RatingScale`, `TagInput`), and tests.

### Suggested citation

The review form and course picker were generated with Claude Code (Claude Opus 5.5) on 7 November 2026, for review by the FE2 developer. See `docs/ai-contributions.md`.

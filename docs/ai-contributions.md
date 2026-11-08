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

## 2026-11-07: Review submission and feedback (FE2, #28)

- **Requested by:** Rameen Syed (Frontend Developer 2), on branch `fe2/28-review-submission`.
- **Tool:** Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`).
- **What the AI wrote:** the submission hook that maps every response of BE2's planned `POST /courses/{id}/reviews` to a screen or message (posted, already reviewed, signed out, unverified, missing course, field-level 422s, network failures), the "posted" and "already reviewed" screens, a sessionStorage draft that survives an Auth0 redirect, and tests.
- **Not finished until:** BE2's review endpoint (#12) and BE1's JWT validation (#8) exist, per the comments on #28. Until then the mock answers.

### Suggested citation

The review submission flow was generated with Claude Code (Claude Opus 5.5) on 7 November 2026, for review by the FE2 developer. See `docs/ai-contributions.md`.

## 2026-11-07: AI personalization form (FE2, #29)

- **Requested by:** Rameen Syed (Frontend Developer 2), on branch `fe2/29-personalization-form`.
- **Tool:** Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`).
- **What the AI wrote:** the `/recommendations` page and its form (major, interests, existing skills, career goals, academic goals), the form model with the exact `RecommendationRequest` JSON and the API's at-least-one-preference rule, per-student answers remembered in this browser, a request hook that cancels stale requests, a simple results list (full cards come in #30), and tests.

### Suggested citation

The AI personalization form was generated with Claude Code (Claude Opus 5.5) on 7 November 2026, for review by the FE2 developer. See `docs/ai-contributions.md`.

## 2026-11-07: Recommendation result cards (FE2, #30)

- **Requested by:** Rameen Syed (Frontend Developer 2), on branch `fe2/30-recommendation-results`.
- **Tool:** Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`).
- **What the AI wrote:** match cards in the team's chosen Example B design (match level, Worth Score or "No reviews yet", course code, Gemini's explanation, difficulty, typical weekly hours, review count, the skills reviewers reported, a prerequisites caveat, and a link to the course page), a `listReviews` call in the shared reviews module, the hook and pure summary behind the student insights, and tests.

### Suggested citation

The recommendation result cards were generated with Claude Code (Claude Opus 5.5) on 7 November 2026, following the team's Example B design, for review by the FE2 developer. See `docs/ai-contributions.md`.

## 2026-11-07: AI match page wired to the recommendations API (FE2, #31)

- **Requested by:** Rameen Syed (Frontend Developer 2), on branch `fe2/31-recommendations-api`.
- **Tool:** Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`).
- **What the AI wrote:** the AI match page in the team's Example B layout ("About you" beside a chat with the course advisor), the conversation hook (one request at a time, stop, retry, and finished turns kept in sessionStorage for Back navigation), plain-language failure messages, follow-up suggestions, and tests. It replaces #29's standalone form view and #30's list wrapper, keeping their models, hooks, and cards.
- **Contract gap it works around:** main's `RecommendationRequest` has no free-text field, so typed requests travel in `academic_goals`, labelled "Student's request:". BE2 is asked to add a `query` field.
- **Not finished until:** BE2's recommendation endpoint (#16) exists, per the comment on #31. Until then the mock answers.

### Suggested citation

The AI match page was generated with Claude Code (Claude Opus 5.5) on 7 November 2026, following the team's Example B design, for review by the FE2 developer. See `docs/ai-contributions.md`.

## 2026-11-07: Example B styling and the sign-in page (FE2, #26, #27)

- **Requested by:** Rameen Syed (Frontend Developer 2), on branch `fe2/example-b-styling`, after the team picked Example B from the design canvas.
- **Tool:** Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`).
- **What the AI wrote:** Example B's design tokens and Figtree font (`src/styles/exampleB.css`), FE2's buttons and form controls restyled to match, a `ButtonLink` and a shared `StatusPanel`, the header's dark "Sign in" pill and signed-in account chip, the `/signin` page adapted from the design's sign-in board (with a same-site check on `?next=`), the review form, course picker, verify-email, callback, and demo-banner screens in the new style, the coordination doc and Cursor rule updates, and tests.

### Suggested citation

FE2's Example B styling and the sign-in page were generated with Claude Code (Claude Opus 5.5) on 7 November 2026, following the team's Example B design, for review by the FE2 developer. See `docs/ai-contributions.md`.

## 2026-11-08: Review posted and already-reviewed screens in Example B (FE2, #28)

- **Requested by:** Rameen Syed (Frontend Developer 2), on branch `fe2/28-review-outcome-screens`.
- **Tool:** Claude Code, model Claude Opus 5.5 (`claude-opus-5-5`).
- **What the AI changed:** moved #28's "Review posted" and "You've already reviewed this course" screens from FE1's global `.panel` and `.eyebrow` classes to FE2's `StatusPanel`, turned their links into `ButtonLink`s beside the existing "Review a different course" button, and added test checks for the link targets and the live regions. The wording, link targets, and behavior are unchanged.

### Suggested citation

The review confirmation screens were moved to FE2's Example B `StatusPanel` with Claude Code (Claude Opus 5.5) on 8 November 2026, for review by the FE2 developer. See `docs/ai-contributions.md`.

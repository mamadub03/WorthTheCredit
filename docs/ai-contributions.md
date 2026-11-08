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

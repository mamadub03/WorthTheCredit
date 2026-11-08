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

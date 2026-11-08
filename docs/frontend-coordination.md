# Frontend coordination: FE1 and FE2

Status: proposal from FE2 (Rameen) to FE1 (Grace), part of #25. It becomes the agreement when FE1 approves the PR that adds it. Where it disagrees with `.cursor/rules/project.mdc`, project.mdc wins.

Drafted with Claude Code (Claude Opus 5.5) at Rameen's request; see `docs/ai-contributions.md`.

Goal: we both build in parallel without editing each other's files or changing the global frontend architecture, which is the done-when for #25.

## 1. Ownership

FE2 keeps all of its code in these paths, so it never lands in yours:

| Path | What | Issues |
|---|---|---|
| `src/features/auth/` | Auth0 provider, `useAuth()`, route guard, sign-in menu, email verification notice, `/callback` page | #26 |
| `src/features/reviewForm/` | Review form, its page, submission and duplicate handling | #27, #28 |
| `src/features/recommendations/` | Personalization form, results, their page | #29, #30, #31 |
| `src/components/form/` | Form controls (section 5) | #27 |
| `src/api/client.ts`, `src/api/mock/` | Shared API client and mock mode (section 6) | #25 |
| `src/api/recommendations.ts`, `src/api/profile.ts` | Recommendation and profile calls and schemas | #29, #31 |
| `src/domain/reviewVocabulary.ts` | Goal, Worth Score, difficulty, weekly hours, and semester keys and labels (section 7) | #25 |
| `src/routes/paths.ts` | URL helpers (section 2) | #25 |

FE1 owns everything else in `frontend/`: build config, `index.html`, `main.tsx`, `App.tsx`, `index.css`, `src/pages/`, layout and display components, and the course API module. `src/api/reviews.ts` is shared: FE1 writes the list and stats calls (#21, #22, #23), FE2 writes the create and "already reviewed" calls (#28), and the review types in it follow BE2's contract (section 7).

Editing the other person's paths needs their OK first (project.mdc: "Do not modify another developer's feature without approval"). The shared files are in section 3.

## 2. Routes

| Path | Page | Owner | Access |
|---|---|---|---|
| `/` | Home: search bar and a way into AI recommendations | FE1 | Public |
| `/courses/:courseCode` | Course details, insights, reviews | FE1 | Public |
| `/courses/:courseCode/review` | Write a review | FE2 | Signed in, email verified |
| `/recommendations` | Personalization form and results | FE2 | Signed in |
| `/callback` | Auth0 return URL ("Signing you in") | FE2 | Public |
| `*` | Not found | FE1 | Public |

A separate search results route (say `/courses?q=`) is yours to add; nothing in FE2 depends on it. `:courseCode` is the course code, such as `GCIS-123`. Every BE2 endpoint takes `course_code`, codes are unique in BE1's schema, and the URL stays readable (section 9 has the backend side).

URL helpers, so nobody hardcodes a path string:

```ts
// src/routes/paths.ts
export const paths = {
  home: '/',
  course: (courseCode: string) => `/courses/${encodeURIComponent(courseCode)}`,
  writeReview: (courseCode: string) =>
    `/courses/${encodeURIComponent(courseCode)}/review`,
  recommendations: '/recommendations',
  authCallback: '/callback',
} as const
```

Where our pages meet:

- Course page to review form: a plain link to `paths.writeReview(courseCode)`, shown to everyone. You don't need any auth logic. FE2's guard sends signed-out students to Auth0 and back to the form, shows unverified students a "verify your email" notice, and tells students who already reviewed the course instead of showing the form.
- Home to recommendations: user story 1 asks for "a way into the AI recommendations" next to the search bar. That's a link to `paths.recommendations` on your home page; wording and placement are yours.
- Recommendation card to course page: FE2 links to `paths.course(courseCode)`. FE2 keeps the last results in sessionStorage, so Back restores them without a second Gemini call.
- After a review is posted: FE2 shows its own confirmation with a link back to the course. Please load reviews and stats fresh each time the course page mounts (no long-lived client cache in the MVP), so the new review and the updated Worth Score appear.

## 3. Shared files: what FE2 will change in yours

Only these edits, each small, each announced to you before I push it.

`src/App.tsx`:

1. Wrap the app in `<AuthProvider>` inside `<BrowserRouter>`. It has to sit inside the router because the Auth0 redirect callback navigates with `useNavigate`.
2. Add three routes: `/callback`, `/courses/:courseCode/review`, `/recommendations`.
3. Render `<DemoDataBanner />` below the header. It shows only in mock mode.
4. Put `<AuthMenu />` at the right end of the header ("Log in" and "Sign up", or the student's email and "Log out"). If you'd rather place it yourself in #19, say so and I won't touch the header.

The resulting shape, with your markup unchanged:

```tsx
<BrowserRouter>
  <AuthProvider>
    <div className="app">
      <header className="site-header">
        {/* your brand and nav */}
        <AuthMenu />
      </header>
      <DemoDataBanner />
      <main className="site-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* FE2 routes */}
          <Route path="/callback" element={<AuthCallbackPage />} />
          <Route path="/courses/:courseCode/review" element={<WriteReviewPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  </AuthProvider>
</BrowserRouter>
```

If #19 moves to a layout route with `<Outlet />`, put the FE2 routes inside it so they get the header, and keep `<AuthProvider>` above it.

`src/main.tsx`: no change.

`src/index.css`: FE2 adds nothing global. The tokens FE2 needs are listed in section 4 for you to add.

`package.json`, added by FE2:

- `@auth0/auth0-react` 2.30, the agreed auth provider. Its peer range covers React 19.3.
- `zod` 4. One schema per payload gives the TypeScript type, the form validation, and a runtime check on API and Gemini responses (project.mdc: "Do not trust AI-generated responses without validation").
- Dev only: `vitest` 5, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `jsdom`, and a `"test": "vitest run"` script. The scaffold has no test runner yet, so it's there for you too. Its config goes in a separate `vitest.config.ts`, so `vite.config.ts` stays yours.

`package-lock.json`: never hand-merge it. On a conflict, take the base branch's copy and run `npm install`.

`vite.config.ts`, one addition, only with your OK:

- `server: { port: 5173, strictPort: true }`. Auth0's allowed callback URLs and both backends' CORS lists name port 5173. If Vite quietly moves to 5174 because 5173 is busy, sign-in and every API call fail.

No dev proxy is needed: the backend already lets `http://localhost:5173` through CORS, so the app calls `http://localhost:8000` directly.

## 4. Styling

This one is your call, and it would help to make it within the hour, since every component depends on it. #18 says "install the agreed CSS/component library", and nothing has been agreed yet.

My vote: keep what the scaffold has (CSS variables in `index.css`, plain CSS) and write component styles as CSS Modules (`Thing.module.css`). Vite supports them with no extra dependency, and they scope class names, so your classes and mine can't collide while we work in parallel. Tailwind v4 (`@tailwindcss/vite`) is also fine with me; I've used it with this same Vite 8 and React 19 stack. I'd push back on a component library (MUI, Mantine, Chakra): it adds a provider and a theme to `main.tsx` and is hard to back out mid-hackathon.

Tokens FE2 needs in `:root` (names are suggestions):

- `--danger` and `--danger-soft`: field errors, failed submits
- `--success` and `--success-soft`: review posted
- `--warning` and `--warning-soft`: unverified email, limited match
- `--focus`: focus ring on form controls
- `--radius` (your 12px) and `--radius-sm` for inputs and chips
- spacing, for example `--space-1` to `--space-6` (4, 8, 12, 16, 24, 32 px)

Layout: mobile first, since students will use this during registration on their phones (user story 1). FE2's forms work at 360 px wide. Let's share one breakpoint (I suggest 640 px) so our pages change layout at the same width. `.site-main` caps at 720 px, which suits the forms; I may ask for a wider variant for the results list later.

## 5. Shared components

FE2 needs these from your #19 work, most important first. Anything not ready when I need it, I'll stand in locally and swap to yours later, so none of this blocks you.

| Component | FE2 uses it for | Notes |
|---|---|---|
| `Button` | Submit review, get recommendations, log in | Primary and secondary; disabled and busy states; can render as a router link |
| `WorthScore` | Recommendation cards | Same display rules as your pages (below) |
| `Chip` | Skills, goals | Read-only; FE2's tag input reuses the look |
| `Badge` | Match level: Strong, Moderate, Limited | Neutral, success, and warning tones |
| Loading, error with retry, empty | Recommendation results | Gemini can take several seconds, so the loading state should accept a message |
| `.panel` | Page sections | Already in your CSS |

Worth Score display rules, so a score looks the same in search results, on the course page, and on recommendation cards:

- `worth_score: null` means no reviews yet. Show "No reviews yet", never 0 or a blank (project.mdc: "Unreviewed courses have no Worth Score").
- BE2 already rounds to one decimal. Show it out of 5: "4.2 / 5".
- Always show the count beside it: "18 reviews", "1 review".
- When `low_data` is true (fewer than 3 reviews), mark the score as early, so two reviews don't read like a consensus.
- Difficulty is its own number with its own label. Never merge it into the Worth Score.

FE2 builds these form controls in `src/components/form/`, and you're welcome to use them (your search box could use `TextInput`): `Field` (label, hint, and error wired up with `aria-describedby`), `TextInput`, `TextArea`, `Select`, `CheckboxGroup`, `RatingScale` (1 to 5 as a radio group), `TagInput`.

## 6. API client and mock mode

I'd like to build this first, as part of #25, because the Auth0 token has to pass through it. You'd use it for course search, course details, stats, and review lists (#23). If you'd rather own the client, tell me and I'll hand you a token hook instead.

- `src/api/client.ts` exposes `apiFetch`. It prefixes the base URL, sends and parses JSON, applies a timeout (15 s by default, 60 s for recommendations), attaches the access token only when a call asks for it, and turns every failure into one `ApiError`. Public GETs (search, course details, stats, review lists) send no token.
- `ApiError` carries `status` (0 for network errors and timeouts), `code`, `message` (safe to show), and `fieldErrors` (from FastAPI 422 responses). `code` is BE2's `detail` string as sent (`already_reviewed`, `email_not_verified`, `course_not_found`, `rate_limited`, `recommendation_failed`, and so on), plus the client's own `network_error`, `timeout`, and `invalid_response`. Your loading, error, and empty states can switch on `code` instead of reading response bodies.
- Each API function checks its response against a zod schema. A response that doesn't match becomes `invalid_response` instead of a crash deep inside a component.
- Mock mode swaps the client's `fetch` for an in-memory one that serves contract-shaped JSON from fixtures in `src/api/mock/`. The client code and error handling are identical either way. `VITE_API_MOCKS` takes `all`, `none`, or a list such as `reviews,recommendations`, so we can move endpoints to the real backend one at a time. FE2 writes the harness and the review, stats, profile, and recommendation handlers, plus starter course fixtures and search and detail handlers that you can take over or replace.
- Demo labeling (project.mdc: "Keep generated demo data clearly distinguishable from real student reviews"): in mock mode a banner reads "Demo mode: sample data, not real student reviews." For the real API, see the seed item in section 9.

Env vars, in `frontend/.env.example` (FE2 adds it; real values go in `frontend/.env.local`, which the existing `*.local` rule already ignores):

```bash
VITE_API_BASE_URL=http://localhost:8000   # the FastAPI server; its CORS list already allows localhost:5173
VITE_API_MOCKS=all                        # all, none, or a list such as reviews,recommendations
VITE_DEV_AUTH=true                        # npm run dev only: a fake signed-in student until Auth0 is set up; ignored by production builds
VITE_AUTH0_DOMAIN=
VITE_AUTH0_CLIENT_ID=
VITE_AUTH0_AUDIENCE=
```

All of these are public build-time values. No secret ever goes in the frontend (project.mdc).

## 7. Review data: what FE2's form writes and your pages show

The review, stats, profile, and recommendation contract is BE2's `worththecredit-api/docs/api-contract.md` (branch `BackPart2`), which is complete and tested. Its names differ from BE1's `docs/DATABASE_SCHEMA.md` (section 9), and the backend pair has to settle on one set. Until then FE2 builds against BE2's contract, and both of us import keys and labels from `src/domain/reviewVocabulary.ts` instead of typing the strings in components, so the final names change in one file.

Goals (`goals`), multi-select ("What did you hope to gain?"):

| Key | Label |
|---|---|
| `career_preparation` | Career preparation |
| `skill_development` | Specific skill development |
| `academic_development` | Academic or intellectual development |
| `degree_requirement` | Degree requirement fulfillment |
| `personal_exploration` | Personal exploration |

Worth Score (`worth_score`, 1 to 5, "How well did the course help you achieve those goals?"): 1 Not at all, 2 A little, 3 Somewhat, 4 Mostly, 5 Completely.

Difficulty (`difficulty`, 1 to 5, "How hard were the concepts to understand?"). Per the product decisions it measures the material, not the professor, grading, or workload. Labels: 1 Very easy, 2 Easy, 3 Moderate, 4 Hard, 5 Very hard.

Weekly time commitment (`weekly_hours`), hours per week outside class: `0-3`, `4-6`, `7-9`, `10-12`, `13+`, labeled "0 to 3 hours" through "13+ hours".

Skills gained (`skills`, 1 to 10 tags), professor (`professor`, optional), and semester (`semester`, optional, like `Fall 2025`, built from a term picker and a year).

One review, in the shape BE2 uses everywhere (the `POST /reviews` response, the review list, and `GET /reviews/me`):

```json
{
  "id": "2d64a531-fa81-4674-9c36-424f3adb8439",
  "course_code": "GCIS-123",
  "goals": ["career_preparation", "skill_development"],
  "worth_score": 4,
  "skills": ["Python", "Unit testing"],
  "difficulty": 3,
  "weekly_hours": "7-9",
  "feedback": "Start the projects early; the last one is big.",
  "professor": "Prof. Example",
  "semester": "Fall 2025",
  "created_at": "2026-11-08T00:37:32Z"
}
```

Reviews are anonymous (no user id, sub, email, or name), and they can't be edited in the MVP. The list is `GET /courses/{course_code}/reviews?professor=&limit=20&offset=0`, returning `items`, `total`, `limit`, and `offset`; its `professor` filter covers the "filter reviews by professor" user story.

Stats for your course page (#21): `GET /courses/{course_code}/stats` returns `worth_score` (null with no reviews), `review_count`, `difficulty_avg`, `workload_distribution`, `workload_summary` (a ready-made sentence), `top_skills`, per-goal Worth Scores (`goals`), per-professor numbers (`professors`), and `low_data`. Recommendation cards show the same `worth_score`, `review_count`, `difficulty_avg`, and `workload_summary`, so the numbers match across pages.

FE2 also uses `GET /reviews/me?course_code=` (has this student already reviewed it?), `GET` and `PUT /profile`, and `POST /recommendations`; you won't need those.

## 8. Auth, from your side

- Every FE1 page is public. You never call Auth0.
- If you want auth state (for example "Log in to write a review" wording), use FE2's hook rather than `@auth0/auth0-react`, so it also works with the dev sign-in:

  ```ts
  const { isLoading, isAuthenticated, user, login, signup, logout } = useAuth()
  // user is { email: string; emailVerified: boolean } or null
  ```

- Dev sign-in: until the team's Auth0 tenant exists, `npm run dev` with `VITE_DEV_AUTH=true` gives you a fake signed-in student. It sends BE2's dev tokens (`dev:<name>`, or `dev-unverified` to test the verify-email path), which BE2's API accepts when it runs locally with `DEV_AUTH_BYPASS=true`. It never exists in a production build.
- Auth0 returns to `/callback`, so your home page never sees `?code=...&state=...` in its URL.
- Logging out returns to `/`.

## 9. Waiting on backend (both of us depend on these)

There are two backend apps right now: BE1's `backend/` (on `backend`, with the course search API in PR #38) and BE2's `worththecredit-api/` (on `BackPart2`). They define the same tables differently and each carries its own Alembic migrations for them, so they can't share one database as is. The backend pair has to pick one app and one schema. What the frontend needs from that:

- One API base URL.
- One course key in URLs and API paths. BE2's endpoints take `course_code` (`GCIS-123`), codes are unique in BE1's schema, and BE1's search already returns it (as `code`).
- Search results that include `worth_score` and `review_count`, since each result shows the course's value score (user story). BE2's course stub has them; PR #38 doesn't yet.
- One set of review names. BE1's schema has `concept_difficulty`, `weekly_hours_range` (`0-3`, `3-6`, `6-10`, `10+`), `skills_gained`, `instructor_name`, and the goal `degree_requirements`; BE2's API has `difficulty`, `weekly_hours` (`0-3`, `4-6`, `7-9`, `10-12`, `13+`), `skills`, `professor`, and `degree_requirement`.
- Clearly labeled demo data in the real API. BE1's seed is courses only, marked "DEMO DATA" in each description; BE2's seed also adds sample reviews, which carry no demo flag and use realistic professor names.
- The Auth0 tenant and API identifier (BE1, #8). BE2's API already validates tokens and reads `email` and `email_verified` from custom claims under `https://worththecredit.app/`, so the Post-Login Action has to use that namespace.

## 10. Git workflow between us

- #33 is merged into `frontend_v1`, our integration branch (the backend uses `backend` the same way). My branch (`fe2/25-frontend-coordination`) sits on `frontend_v1`, and my PRs will target it.
- One branch per issue (project.mdc). My PRs, in order: #25 (this doc, API client, mock mode, paths, vocabulary); #26 (auth); #27 with #28 (the form and its submission share one hook); #29 through #31 (form, results, and API call are one screen).
- Shared-file edits: tell the other person first, keep them minimal, merge them early.
- We review each other's frontend PRs; project.mdc requires human approval before a merge.

Proposed checkpoints, to adjust to the team plan. The event ends Sunday 4:30 PM per its MLH page; the submission deadline is probably earlier, so check with the organizers.

- Tonight: styling and header decided.
- Before midnight: FE2's #25 code up for review, so your pages can run on mock data or the real API.
- Sunday morning: endpoints move from mock to the real backend as the backend pair settles it.
- A couple of hours before the submission deadline: feature freeze, then fixes and a demo run-through only.

## 11. What I need from you

- [ ] Styling: CSS Modules on your tokens (my vote), Tailwind v4, or something else
- [ ] Header: I add `<AuthMenu />` and a Recommendations link, or you place them in #19
- [ ] The route table in section 2, including `/callback` and the course code in course URLs
- [ ] The `strictPort` line in `vite.config.ts`
- [ ] FE2 owns `src/api/client.ts` and mock mode, and you use them for #23
- [ ] Section 5: which shared components you'll build, and roughly when
- [ ] The Worth Score display rules

# Frontend coordination: FE1 and FE2

Status: proposal from FE2 (Rameen) to FE1 (Grace), part of #25. It becomes the agreement when FE1 approves the PR that adds it. Where it disagrees with `.cursor/rules/project.mdc`, project.mdc wins.

Drafted with Claude Code (Claude Opus 5.5) at Rameen's request; see `docs/ai-contributions.md`.

Goal: we both build in parallel without editing each other's files or changing the global frontend architecture, which is the done-when for #25.

## 1. Ownership

FE2 keeps all of its code in these paths, so it never lands in yours:

| Path | What | Issues |
|---|---|---|
| `src/features/auth/` | Auth0 provider, `useAuth()`, route guard, sign-in menu, `/signin` page, email verification notice, `/callback` page | #26 |
| `src/features/reviewForm/` | Review form with its course picker, its page, submission and duplicate handling | #27, #28 |
| `src/features/recommendations/` | Personalization form, results, their page | #29, #30, #31 |
| `src/components/form/` | Form controls, `Button`, `ButtonLink`, `StatusPanel` (section 5) | #26, #27 |
| `src/api/client.ts`, `src/api/errors.ts`, `src/api/appClient.ts`, `src/api/mock/`, `src/config/env.ts` | Shared API client, error type, mock mode, and env settings (section 6) | #25 |
| `src/api/recommendations.ts` | Recommendation request, response schema, call | #31 |
| `src/domain/reviewVocabulary.ts` | Goal, Worth Score, difficulty, weekly hours, semester, and match-level keys and labels (section 7) | #25 |
| `src/routes/paths.ts`, `src/routes/fe2Routes.tsx` | URL helpers and FE2's routes (section 2) | #25 |

FE1 owns everything else in `frontend/`: build config, `index.html`, `main.tsx`, `App.tsx`, `index.css`, `src/pages/`, layout and display components, and the course API module (`src/api/courses.ts`, which FE2 started with search and details for the review form's course picker). `src/api/reviews.ts` is shared: FE1 writes the review list call (#22, #23), FE2 writes the create and worth-score calls (#28, #30), and the types in it follow BE2's contract on main (section 7). `src/styles/exampleB.css` is shared too: FE2 added Example B's tokens there, either of us can add to it, and you decide when `index.css` adopts them (section 4).

Editing the other person's paths needs their OK first (project.mdc: "Do not modify another developer's feature without approval"). The shared files are in section 3.

## 2. Routes

| Path | Page | Owner | Access |
|---|---|---|---|
| `/` | Home: search bar and a way into AI recommendations | FE1 | Public |
| `/courses/:courseId` | Course details, insights, reviews | FE1 | Public |
| `/review` | Write a review, with a course picker (`?course=<id>` preselects one) | FE2 | Signed in, email verified |
| `/recommendations` | Personalization form and results | FE2 | Signed in |
| `/signin` | Sign-in page from the Example B design, opened by the header's "Sign in" (`?next=<path>` returns there) | FE2 | Public |
| `/callback` | Auth0 return URL ("Signing you in") | FE2 | Public |
| `*` | Not found | FE1 | Public |

A separate search results route (say `/courses?q=`) is yours to add; nothing in FE2 depends on it. `:courseId` is the course's UUID, the same id the API uses in `GET /courses/{id}` (BE1's contract in #25).

URL helpers, so nobody hardcodes a path string:

```ts
// src/routes/paths.ts
export const paths = {
  home: '/',
  course: (courseId: string) => `/courses/${encodeURIComponent(courseId)}`,
  writeReview: (courseId?: string) => (courseId ? `/review?course=${encodeURIComponent(courseId)}` : '/review'),
  recommendations: '/recommendations',
  signIn: (next?: string) => (next ? `/signin?next=${encodeURIComponent(next)}` : '/signin'),
  authCallback: '/callback',
} as const
```

`signInReturnPath(next)` in the same file accepts only paths on this site, so a crafted `?next=` can't send a student elsewhere.

Where our pages meet:

- Course page to review form: a plain link to `paths.writeReview(course.id)`, shown to everyone. You don't need any auth logic. FE2's guard sends signed-out students to Auth0 and back to the form, and shows unverified students a "verify your email" notice. The form opens with that course picked.
- Home to recommendations: user story 1 asks for "a way into the AI recommendations" next to the search bar. That's a link to `paths.recommendations` on your home page; wording and placement are yours.
- Recommendation card to course page: FE2 links to `paths.course(course.id)`. FE2 keeps the last results in sessionStorage, so Back restores them without a second Gemini call.
- After a review is posted: FE2 shows its own confirmation with a link to the course. Please load the course and its reviews fresh each time the course page mounts (no long-lived client cache in the MVP), so the new review and the updated Worth Score appear.

## 3. Shared files: what FE2 will change in yours

Only these edits, each small, each announced to you before I push it.

`src/App.tsx`:

1. Wrap the app in `<AuthProvider>` inside `<BrowserRouter>`. It has to sit inside the router because the Auth0 redirect callback navigates with `useNavigate`.
2. Render FE2's routes (`/review`, `/recommendations`, `/signin`, `/callback`) with one line, `{fe2Routes()}`, inside your `<Routes>`.
3. Render `<DemoDataBanner />` below the header. It shows only with the mock API or dev sign-in on.
4. Put `<AuthMenu />` at the right end of the header (Example B's dark "Sign in" pill, which opens `/signin`, or the student's account and "Log out"). If you'd rather place it yourself in #19, say so and I won't touch the header.
5. Import `./styles/exampleB.css`, Example B's tokens and the Figtree font. It only defines `--wtc-*` variables, so nothing of yours changes.

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
          {fe2Routes()}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  </AuthProvider>
</BrowserRouter>
```

If #19 moves to a layout route with `<Outlet />`, put `{fe2Routes()}` inside it so FE2's pages get the header, and keep `<AuthProvider>` above it.

`src/main.tsx`: no change.

`src/index.css`: FE2 adds nothing global. FE2's components use Example B's `--wtc-*` variables from `src/styles/exampleB.css` (section 4), each with a fixed fallback.

`package.json`, added by FE2:

- `@auth0/auth0-react` 2.30, the agreed auth provider. Its peer range covers React 19.3.
- `zod` 4. One schema per payload gives the TypeScript type and a runtime check on API and Gemini responses (project.mdc: "Do not trust AI-generated responses without validation").
- Dev only: `vitest` 5, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `jsdom`, and a `"test": "vitest run"` script. The scaffold has no test runner yet, so it's there for you too. Its config is a separate `vitest.config.ts`, so `vite.config.ts` stays yours.

`package-lock.json`: never hand-merge it. On a conflict, take the base branch's copy and run `npm install`.

`vite.config.ts`, one addition, only with your OK:

- `server: { port: 5173, strictPort: true }`. Auth0's allowed callback URLs and the backend's CORS list (`CORS_ORIGINS` in `backend/.env.example`) name port 5173. If Vite quietly moves to 5174 because 5173 is busy, sign-in and every API call fail.

No dev proxy is needed: the backend already lets `http://localhost:5173` through CORS, so the app calls `http://localhost:8000` directly.

## 4. Styling

Decided on Nov 7: the team picked Example B ("white + warm", Figtree) from the design canvas. Its tokens are in `src/styles/exampleB.css`: `--wtc-font`, `--wtc-ink` #1E2124, `--wtc-body`, `--wtc-muted`, `--wtc-orange` #F76902 (fills, with ink text), `--wtc-link` #B84A00 (orange text that passes contrast), `--wtc-warm` and `--wtc-warm-strong` (the warm band and active nav), `--wtc-line` and `--wtc-line-warm` (borders), and `--wtc-danger`. FE2's screens use them now: pill buttons, 14 to 32 px radii, warm-outlined cards, and the tag pill above page titles. Your header, home, and course pages can move over when you're ready (#19); then `index.css` can point its own variables at these or replace them, and the page background turns white.

The question below (how we write styles) still stands; FE2 uses CSS Modules.

My vote: keep what the scaffold has (CSS variables in `index.css`, plain CSS) and write component styles as CSS Modules (`Thing.module.css`). Vite supports them with no extra dependency, and they scope class names, so your classes and mine can't collide while we work in parallel. FE2's components are written that way already, so if you choose something else they're easy to move. Tailwind v4 (`@tailwindcss/vite`) is also fine with me. I'd push back on a component library (MUI, Mantine, Chakra): it adds a provider and a theme to `main.tsx` and is hard to back out mid-hackathon.

State colors that Example B doesn't define yet go in `exampleB.css` as they're needed: `--wtc-danger` and `--wtc-danger-soft` exist (field errors, failed submits); success (review posted) and warning (unverified email) can follow the same pattern. Focus rings use ink, or orange on text fields.

Layout: mobile first, since students will use this during registration on their phones (user story 1). FE2's forms work at 360 px wide and use 640 px as their one breakpoint; using the same one keeps our pages in step.

## 5. Shared components

FE2 builds its own form controls in `src/components/form/` (`Field`, `TextInput`, `TextArea`, `Select`, `ChoiceGroup`, `RatingScale`, `TagInput`), and you're welcome to use them; your search box could use `TextInput`. The same folder has FE2's Example B `Button` (primary, dark, secondary, quiet), `ButtonLink` (a router link that looks like a button), and `StatusPanel` (a full-page message such as "Verify your email").

Where FE2 needs display pieces that are yours in #19 (a `Button`, a `WorthScore` display, chips, a match badge, loading and error states), it uses small local versions for now and will swap to yours when they land, so none of this blocks you.

Worth Score display rules, so a score looks the same in search results, on the course page, and on recommendation cards:

- `community_worth_score: null` means no reviews yet. Show "No reviews yet", never 0 or a blank (project.mdc: "Unreviewed courses have no Worth Score").
- The API sends a raw average such as 4.333333. Show one decimal, out of 5: "4.3 / 5" (`formatAverage()` in `reviewVocabulary.ts`).
- Always show the count beside it: "18 reviews", "1 review".
- Difficulty is its own number with its own label. Never merge it into the Worth Score.

## 6. API client and mock mode

FE2 built these as part of #25, because the Auth0 token has to pass through the client. You'd use them for course search, course details, and review lists (#23).

- `src/api/client.ts` exposes `createApiClient`; pages get one from `useApiClient()`. It prefixes the base URL, sends and parses JSON, applies a timeout (15 s by default, 60 s for recommendations), attaches the access token only when a call asks for it, and turns every failure into one `ApiError`. Public GETs (search, details, review lists) send no token.
- `ApiError` carries `status` (0 for network errors and timeouts), `code`, `message` (safe to show), and `fieldErrors` (from FastAPI 422 responses). When the API's `detail` is a code (`already_reviewed`), that's the `code`; when it's a sentence ("Course not found"), the code comes from the status (`not_found`) and the sentence becomes the `message`. The client adds `network_error`, `timeout`, and `invalid_response`.
- Each API function checks its response against a zod schema. A response that doesn't match becomes `invalid_response` instead of a crash deep inside a component.
- Mock mode swaps the client's `fetch` for an in-memory one that follows the contracts on main: BE1's live course routes, and BE2's planned review and recommendation endpoints. The client code and error handling are identical either way. `VITE_API_MOCKS` takes `all`, `none`, or a list of `courses`, `reviews`, `recommendations`, so each area moves to the real backend as it ships.
- Demo labeling (project.mdc: "Keep generated demo data clearly distinguishable from real student reviews"): in mock mode a banner reads "Demo mode: sample data, not real student reviews." BE1's seed is courses only, each description already says "DEMO DATA", and every real review will come through FE2's form.

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

These follow the agreed contracts on main: `docs/DATABASE_SCHEMA.md` and BE2's `backend/app/schemas/review.py` (#10). Import keys and labels from `src/domain/reviewVocabulary.ts` instead of typing the strings in components, so a rename is a one-file change.

Goals (`goals`), multi-select ("What did you hope to gain?"):

| Key | Label |
|---|---|
| `career_preparation` | Career preparation |
| `skill_development` | Specific skill development |
| `academic_development` | Academic or intellectual development |
| `degree_requirements` | Degree requirement fulfillment |
| `personal_exploration` | Personal exploration |

Worth Score (`worth_score`, 1 to 5, "How well did the course help you achieve those goals?"): 1 Not at all, 2 A little, 3 Somewhat, 4 Mostly, 5 Completely.

Concept difficulty (`concept_difficulty`, 1 to 5, "How hard were the concepts to understand?"). Per the product decisions and the schema, it measures the material, not the professor, grading, or workload. Labels: 1 Very easy, 2 Easy, 3 Moderate, 4 Hard, 5 Very hard.

Weekly time commitment (`weekly_hours_range`), hours per week outside class: `0-3`, `3-6`, `6-10`, `10+`.

Skills gained (`skills_gained`), professor (`instructor_name`, optional), and semester (`semester`, optional, like `Fall 2025`).

One review, as `GET /courses/{course_id}/reviews` returns it (ReviewPublic):

```json
{
  "id": "0e7d6a52-3c1b-4f8e-a9d2-6b4c1e8f7a35",
  "course_id": "5b1f3c2e-8a47-4d0b-9c1e-2f6a7d3e9b10",
  "goals": ["career_preparation", "skill_development"],
  "worth_score": 4,
  "concept_difficulty": 3,
  "weekly_hours_range": "6-10",
  "skills_gained": ["Python", "Unit testing"],
  "feedback": "Start the projects early; the last one is big.",
  "instructor_name": "Prof. Example",
  "semester": "Fall 2025",
  "created_at": "2026-11-07T23:10:00Z"
}
```

Reviews are anonymous (no user id, sub, email, or name), and they can't be edited in the MVP. The list returns `results`, `total`, `limit`, and `offset`, the same envelope as course search.

Aggregates for your course page (#21): `GET /courses/{id}` already returns `community_worth_score`, `review_count`, and `average_concept_difficulty`. `GET /courses/{course_id}/worth-score` adds `workload`, the number of reviews per hours range. FE2's recommendation cards read the same endpoint, so the numbers match across pages.

## 8. Auth, from your side

- Every FE1 page is public. You never call Auth0.
- If you want auth state (for example "Log in to write a review" wording), use FE2's hook rather than `@auth0/auth0-react`, so it also works with the dev sign-in:

  ```ts
  const { isLoading, isAuthenticated, user, login, signup, logout } = useAuth()
  // user is { sub, email, emailVerified, name } or null
  ```

- Dev sign-in: until the team's Auth0 tenant exists, `npm run dev` with `VITE_DEV_AUTH=true` gives you a fake signed-in student. It works with the mock API; the real backend will accept only Auth0 tokens once BE1 finishes #8.
- Sign-in entry points: the header's "Sign in" opens `/signin`, which returns to `?next=` afterwards. A link of your own (say "Sign in to write a review") can use `paths.signIn(currentPath)`. Protected pages still go straight to Auth0 and back.
- Auth0 returns to `/callback`, so your home page never sees `?code=...&state=...` in its URL.
- Logging out returns to `/`.

## 9. Backend status (what both of us depend on)

Main has one backend now (#43). Course search and details are live. The review and recommendation endpoints exist as contracts (#10) until BE2 builds them (#12 to #16), and JWT validation is #8. Until then the mock answers for those areas. Still open:

- The review and recommendation endpoints themselves, and the error `detail` style they use (a code string such as `already_reviewed`, or a sentence; the client handles both).
- The Auth0 tenant, the SPA client, and the API identifier (BE1, #8). Mamadu asked that the domain and audience be agreed before either side hardcodes them.
- For #30: `RecommendationItem` has `explanation` but no list of skills, so the "relevant skills" in #30 come from the explanation text unless BE2 adds a field. Workload comes from `GET /courses/{id}/worth-score`.

## 10. Git workflow between us

- #33 is merged into `frontend_v1`, our integration branch (the backend used `backend` the same way). FE2 opens one PR per issue, stacked so each diff shows only that issue: #25 targets `frontend_v1`, #26 builds on #25, and #27 on #26. #28 (review submission, blocked on the backend) branches off #27 on its own, and #29 to #31 continue from #27, so the blocked PR can't hold up recommendations. The Example B restyle of FE2's screens builds on #30, beside #31, so it doesn't wait on #31's backend blockers either.
- Shared-file edits: tell the other person first, keep them minimal, merge them early.
- We review each other's frontend PRs; project.mdc requires human approval before a merge.

The event ends Sunday 4:30 PM per its MLH page; the submission deadline is probably earlier, so check with the organizers. A couple of hours before it: feature freeze, then fixes and a demo run-through only.

## 11. What I need from you

- [ ] Styling: CSS Modules on your tokens (my vote), Tailwind v4, or something else
- [ ] Header: I add `<AuthMenu />` and a Recommendations link, or you place them in #19
- [ ] The route table in section 2, including `/review` and `/callback`
- [ ] The `strictPort` line in `vite.config.ts`
- [ ] You use `src/api/client.ts`, `useApiClient()`, and mock mode for #23
- [ ] The Worth Score display rules

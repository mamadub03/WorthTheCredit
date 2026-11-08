# WorthTheCredit API contract (BE2: reviews, stats, profile, recommendations)

- **Base URL:** `VITE_API_BASE_URL` on the frontend, e.g. `http://localhost:8000` locally or the Vultr URL in production.
- **Format:** all bodies are JSON with `snake_case` fields. Times are ISO 8601 UTC.
- **Interactive docs:** `GET /docs` (Swagger) on the running server.

## Authentication
Protected endpoints need `Authorization: Bearer <Auth0 access token>`. The token must be issued for audience `AUTH0_AUDIENCE`.
- **Public (no token):** `GET /courses…`, `GET /courses/{code}/reviews`, `GET /courses/{code}/stats`, `GET /health`
- **Token:** `GET /reviews/me`, `POST /reviews/{id}/report`, `GET/PUT /profile`, `POST /recommendations`, `POST /auth/resend-verification`
- **Token + verified email:** `POST /reviews`
- **Admin key** (`X-Admin-Api-Key` header): `POST /admin/reviews/{id}/hide|unhide`

## Errors
Errors use FastAPI's standard shape. A short **code string** is used for every error except 422:
```json
{ "detail": "already_reviewed" }
```
422 uses FastAPI's validation list. `loc[1]` is the field name:
```json
{ "detail": [ { "type": "less_than_equal", "loc": ["body", "worth_score"], "msg": "Input should be less than or equal to 5", "input": 9 } ] }
```

| Status | `detail` | When |
|---|---|---|
| 400 | `profile_required` | `/recommendations` without a profile and none saved |
| 401 | `not_authenticated` | No `Authorization` header |
| 401 | `invalid_token` | Bad signature, wrong `aud`/`iss`, expired, malformed |
| 403 | `email_not_verified` | `POST /reviews` and the token's `email_verified` claim isn't `true` |
| 403 | `forbidden` | Wrong/missing admin key |
| 404 | `course_not_found`, `review_not_found`, `profile_not_found` | — |
| 409 | `already_reviewed` | One review per student per course (any semester) |
| 409 | `already_reported` | One report per user per review |
| 422 | (list) | Validation failed |
| 429 | `rate_limited` | More than 10 `/recommendations` calls/min per user |
| 502 | `recommendation_failed` | Gemini failed or returned invalid JSON twice |
| 503 | `gemini_not_configured`, `auth_not_configured`, `auth_unavailable`, `admin_not_configured`, `not_configured` | Server setup missing / Auth0 unreachable |

---

## Reviews

### `POST /reviews` (token + verified email)
**Request**
```json
{
  "course_code": "SWEN-261",
  "goals": ["career_preparation", "skill_development"],
  "worth_score": 4,
  "skills": ["Agile", "Unit testing"],
  "difficulty": 3,
  "weekly_hours": "7-9",
  "feedback": "Start the team project early.",
  "professor": "Dr. Rivera",
  "semester": "Fall 2025"
}
```

| Field | Rules |
|---|---|
| `course_code` | required; `swen261` / `SWEN 261` are normalized to `SWEN-261`; must exist (else 404) |
| `goals` | required, 1–5 of `career_preparation`, `skill_development`, `academic_development`, `degree_requirement`, `personal_exploration` (duplicates removed) |
| `worth_score` | required integer 1–5: how well the course met **your goals** |
| `skills` | required, 1–10 tags of ≤40 chars; trimmed, inner spaces collapsed, de-duplicated case-insensitively (first spelling kept) |
| `difficulty` | required integer 1–5: how hard the **concepts** were |
| `weekly_hours` | required: `0-3` `4-6` `7-9` `10-12` `13+` |
| `feedback` | optional, ≤1000 chars; blank → `null` |
| `professor` | optional, ≤100 chars; blank → `null` |
| `semester` | optional, `Fall|Spring|Summer YYYY` (case-insensitive, normalized to `Fall 2025`) |

**201**: the review (anonymous; this same shape is used everywhere):
```json
{
  "id": "2d64a531-fa81-4674-9c36-424f3adb8439",
  "course_code": "SWEN-261",
  "goals": ["career_preparation", "skill_development"],
  "worth_score": 4,
  "skills": ["Agile", "Unit testing"],
  "difficulty": 3,
  "weekly_hours": "7-9",
  "feedback": "Start the team project early.",
  "professor": "Dr. Rivera",
  "semester": "Fall 2025",
  "created_at": "2026-11-08T00:37:32.987642Z"
}
```
**Errors:** 401 · 403 `email_not_verified` · 404 `course_not_found` · 409 `already_reviewed` · 422.
There is no edit/delete endpoint (MVP rule).

### `GET /reviews/me?course_code=SWEN-261` (token)
```json
{ "course_code": "SWEN-261", "has_reviewed": true, "review": { "id": "...", "course_code": "SWEN-261", "...": "same shape as above" } }
```
```json
{ "course_code": "SWEN-261", "has_reviewed": false, "review": null }
```
**404** `course_not_found` for an unknown course.

### `GET /courses/{course_code}/reviews?professor=&limit=20&offset=0` (public)
Newest first. Hidden reviews are excluded. `professor` is case/space-insensitive exact match. `limit` is 1–100.
```json
{ "items": [ { "id": "...", "course_code": "SWEN-261", "goals": ["career_preparation"], "worth_score": 5,
               "skills": ["Agile"], "difficulty": 3, "weekly_hours": "7-9", "feedback": "...",
               "professor": "Dr. Rivera", "semester": "Fall 2025", "created_at": "..." } ],
  "total": 4, "limit": 20, "offset": 0 }
```
Never contains `user_id`, `sub`, email or name.

### `POST /reviews/{review_id}/report` (token)
```json
{ "reason": "spam", "note": "Looks like an ad" }
```
- `reason` is one of `spam`, `fake`, `inappropriate`, `off_topic`, `other`. The FE2 aliases are also accepted: `offensive` and `personal_info` map to `inappropriate`, and `not_about_course` maps to `off_topic`.
- `note` is optional, ≤500 chars.

**201** `{"status": "received"}` · **404** `review_not_found` (unknown or hidden) · **409** `already_reported` · **422** bad reason or non-UUID id.

### Admin: `POST /admin/reviews/{review_id}/hide` and `/unhide`
Header `X-Admin-Api-Key: <ADMIN_API_KEY>`. **200** `{"id": "...", "is_hidden": true}` · **403** `forbidden` · **404** · **503** `admin_not_configured`.
Hidden reviews disappear from lists and stats. The author still can't post a second review for that course.

---

## Stats (Worth Score)

### `GET /courses/{course_code}/stats` (public)
```json
{
  "course_code": "SWEN-261",
  "review_count": 4,
  "worth_score": 4.5,
  "difficulty_avg": 2.8,
  "workload_distribution": { "0-3": 0, "4-6": 1, "7-9": 3, "10-12": 0, "13+": 0 },
  "workload_most_common": "7-9",
  "workload_summary": "Most students report 7–9 hrs/week",
  "top_skills": [ { "skill": "Agile", "count": 3 }, { "skill": "Java", "count": 1 } ],
  "goals": [ { "goal": "career_preparation", "count": 3, "worth_score": 4.7 } ],
  "professors": [ { "professor": "Dr. Rivera", "review_count": 2, "worth_score": 4.5, "difficulty_avg": 3.0 } ],
  "low_data": false
}
```
- `worth_score` is the average of visible reviews' Worth Scores, rounded to 1 decimal (halves round up: 4.25 → 4.3). It is **`null` when there are 0 reviews** (`difficulty_avg` too).
- `workload_summary` reads "Most students report …" when ≥50% picked one range, otherwise "Most common: … (n of N reviews)".
- `low_data` means fewer than 3 reviews.

**404** `course_not_found`.

---

## Profile

### `GET /profile` (token) → 200 or 404 `profile_not_found`
### `PUT /profile` (token): create or replace
```json
{
  "major": "Software Engineering",
  "interests": ["machine learning", "data"],
  "skills": ["Python"],
  "career_goals": "ML engineer in healthcare",
  "personal_interests": ["public speaking"],
  "degree_requirements": "One CS advanced elective"
}
```
- **Rules:**
  - `major` is required, ≤100 chars.
  - Each tag list has ≤10 tags of ≤40 chars, trimmed and de-duplicated.
  - `career_goals` ≤1000 chars; `degree_requirements` ≤500.
- **FE2 names:** the request also accepts `academic_interests` for `interests` and `existing_skills` for `skills`.

**Response** (both spellings included):
```json
{ "major": "Software Engineering", "interests": ["machine learning", "data"], "skills": ["Python"],
  "career_goals": "ML engineer in healthcare", "personal_interests": ["public speaking"],
  "degree_requirements": "One CS advanced elective", "updated_at": "2026-11-08T00:40:00Z",
  "academic_interests": ["machine learning", "data"], "existing_skills": ["Python"] }
```

---

## Recommendations

### `POST /recommendations` (token)
```json
{
  "profile": { "major": "Software Engineering", "interests": ["machine learning"], "career_goals": "ML engineer" },
  "query": "I want something hands-on with ML that isn't too heavy a workload."
}
```
- `profile` is optional. If you omit it, the saved profile is used; if there's none, you get 400 `profile_required`.
- `query` is optional, ≤500 chars.

**200**
```json
{
  "recommendations": [
    {
      "course_code": "CSCI-420",
      "title": "Principles of Data Mining",
      "match_level": "Strong Match",
      "why": "Hands-on ML on real data, which fits your goal of becoming an ML engineer.",
      "skills": ["Pandas", "Clustering"],
      "student_insights": ["Reviewers found the real, messy data sets practical."],
      "difficulty_avg": 3.5,
      "workload_summary": "Most students report 10–12 hrs/week",
      "worth_score": 4.5,
      "review_count": 2,
      "limitations": ["Only 2 reviews so far", "Prerequisites not verified — check the RIT catalog and your advisor"]
    }
  ]
}
```
**Guarantees:**
- Every `course_code` exists in our database. Up to 6 results come back, strongest first, and an empty list is valid.
- `match_level` is always one of `"Strong Match"`, `"Moderate Match"` or `"Limited Match"`. There are never percentages anywhere.
- `title`, `worth_score`, `review_count` and `difficulty_avg` always come from our database. `workload_summary` comes from our database whenever reviews exist, otherwise it's `"No workload reports yet"`.
- `student_insights` is `[]` for courses with no reviews.
- `limitations` always ends with the prerequisites-not-verified note. Nothing ever claims prerequisites or degree requirements are met.

**Errors:** 400 `profile_required` · 401 · 422 · 429 `rate_limited` · 502 `recommendation_failed` · 503 `gemini_not_configured`.
The frontend should allow about 60 s. Typical latency is a few seconds.

---

## Optional: `POST /auth/resend-verification` (token)
Asks Auth0 to resend the verification email; this needs the M2M env vars.
**204** · **429** `rate_limited` (1/min) · **502** `auth0_error` · **503** `not_configured`.

## Course search/detail (BE1; stubs on this branch)
- `GET /courses?q=` returns `[{course_code, title, department, credit_hours, worth_score, review_count}]`.
- `GET /courses/{code}` returns the detail plus a `stats` object (shape above).

BE1's real versions should keep these field names.

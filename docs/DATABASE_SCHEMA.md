

# WorthTheCredit — Database Schema

## Overview

WorthTheCredit uses Tiger Data (PostgreSQL) to store mock RIT

course information, authenticated users, and crowdsourced

course reviews.

The database contains three core tables:

1. courses

2. users

3. reviews

The backend uses Python, FastAPI, SQLAlchemy, and Alembic.

## 1. Courses Table

Table: `courses`

Stores course information used for discovery, reviews,

and AI-powered recommendations.

| Column | Data Type | Constraints |

|--------|-----------|-------------|

| id | UUID | Primary Key |

| code | VARCHAR(20) | Unique, NOT NULL |

| title | TEXT | NOT NULL |

| description | TEXT | NOT NULL |

| department | VARCHAR(20) | NOT NULL |

| college | TEXT | Nullable |

| campus | TEXT | Nullable |

| credits | INTEGER | Nullable |

| prerequisites | TEXT | Nullable |

### Notes

- Each course has a unique course code.

- Courses may exist without reviews.

- All hackathon course data is generated mock data.

- Course records are independent of professors and semesters.

- RIT API integration is outside the current MVP.

## 2. Users Table

Table: `users`

Stores student profiles and references to Auth0 accounts.

| Column | Data Type | Constraints |

|--------|-----------|-------------|

| id | UUID | Primary Key |

| auth0_sub | TEXT | Unique, NOT NULL |

| major | TEXT | Nullable |

| interests | JSONB | NOT NULL, default [] |

| skills | JSONB | NOT NULL, default [] |

| career_goals | TEXT | Nullable |

| created_at | TIMESTAMPTZ | NOT NULL, default NOW() |

### Notes

- Auth0 handles authentication and password management.

- Passwords must never be stored in this database.

- Each user is uniquely identified by `auth0_sub`.

- A user may submit reviews for multiple courses.

- The backend determines the user from the validated

  Auth0 access token.

## 3. Reviews Table

Table: `reviews`

Stores student experiences and the information used

to calculate Community Worth Scores.

| Column | Data Type | Constraints |

|--------|-----------|-------------|

| id | UUID | Primary Key |

| user_id | UUID | FK -> [users.id](http://users.id), NOT NULL |

| course_id | UUID | FK -> [courses.id](http://courses.id), NOT NULL |

| goals | JSONB | NOT NULL |

| worth_score | SMALLINT | NOT NULL, 1–5 |

| concept_difficulty | SMALLINT | NOT NULL, 1–5 |

| weekly_hours_range | VARCHAR(20) | NOT NULL |

| skills_gained | JSONB | NOT NULL, default [] |

| feedback | TEXT | Nullable |

| instructor_name | TEXT | Nullable |

| semester | VARCHAR(30) | Nullable |

| created_at | TIMESTAMPTZ | NOT NULL, default NOW() |

### Goal Categories

The `goals` field contains one or more of:

- career_preparation

- skill_development

- academic_development

- degree_requirements

- personal_exploration

Example:

```json

["career_preparation", "skill_development"]

```

### Weekly Hours Categories

Allowed values:

- 0-3

- 3-6

- 6-10

- 10+

### Review Rules

- One review per user per course.

- No review editing in the MVP.

- Reviews are publicly anonymous.

- Instructor and semester are optional context only.

- No separate professor ratings.

- Worth Score measures how effectively the course

  supported the student's intended goals.

- Concept difficulty measures the material itself,

  not the professor or grading.

## 4. Database Relationships

### Users to Reviews

One-to-many:

- One user can write many reviews.

- Each review belongs to exactly one user.

### Courses to Reviews

One-to-many:

- One course can have many reviews.

- Each review belongs to exactly one course.

### Relationship Diagram

```text

USERS (1) -------- (M) REVIEWS (M) -------- (1) COURSES

```

## 5. Database Constraints

Backend Developer 1 must implement:

- Primary keys on all tables.

- Unique constraint on `courses.code`.

- Unique constraint on `users.auth0_sub`.

- Unique constraint on `(reviews.user_id, reviews.course_id)`.

- Foreign keys from reviews to users and courses.

- CHECK constraint: worth_score BETWEEN 1 AND 5.

- CHECK constraint: concept_difficulty BETWEEN 1 AND 5.

- CHECK constraint on weekly_hours_range.

- Non-empty goals list enforced through validation.

- Appropriate indexes on review foreign keys.

Use Pydantic validation for JSONB field contents

and request validation.

## 6. Community Worth Score

The Community Worth Score is calculated from

student-submitted Worth Scores.

Definition:

"How well did this course help you accomplish your

academic, career, skill-development, or

personal-development goals?"

Formula:

Community Worth Score =

SUM(review.worth_score) / COUNT(reviews)

Example:

Student scores: 5, 4, 5, 3, 4

Community Worth Score: 4.2 / 5

### Rules

- Calculate the score in FastAPI using PostgreSQL queries.

- Do not include difficulty or workload in the score.

- Display review count alongside the score.

- Courses without reviews return NULL for the Worth Score.

- Concept difficulty can be averaged separately.

- Workload can be summarized by reported hour ranges.

- Gemini uses these insights but does not calculate

  the Community Worth Score.

## 7. AI Recommendation Data

The Gemini recommendation system may use:

From `courses`:

- Course code and title

- Description

- Department

- Credits

- Prerequisites

From `reviews`:

- Community Worth Score

- Review count

- Goal categories

- Skills gained

- Concept difficulty

- Weekly workload

- Written feedback

From student input or `users`:

- Major

- Interests

- Existing skills

- Career goals

- Academic goals

### Recommendation Rules

1. FastAPI retrieves candidate courses from PostgreSQL.

2. Gemini ranks and explains those candidates.

3. Gemini must only return existing database course IDs.

4. FastAPI validates recommended course IDs.

5. Recommendations link to existing course pages.

6. Courses without reviews may still be recommended.

7. Do not fabricate student feedback or course details.

8. Do not claim prerequisites are satisfied without

   verified academic records.

## 8. Mock Data

For the hackathon:

- Generate mock RIT-style courses.

- Use fictional student reviews.

- Seed the database through a repeatable Python script.

- Clearly distinguish demonstration data from

  authentic student contributions.

- Do not depend on a live RIT API.

The seed script should be safe to run multiple times

without creating duplicate course records.

## 9. Developer Ownership

### Backend Developer 1

Responsible for:

- SQLAlchemy database models.

- Alembic migrations.

- Tiger Data connection.

- Database constraints.

- Mock course data generation and seeding.

- Course search and details endpoints.

### Backend Developer 2

Responsible for:

- Review Pydantic schemas.

- Review validation and submission endpoints.

- Worth Score aggregation.

- Review retrieval.

- Gemini recommendation integration.

### Frontend Developers

Both frontend developers should use the agreed

FastAPI JSON contracts.

They must not assume undocumented database fields

or directly connect to PostgreSQL.

## 10. Schema Change Policy

- This document is the source of truth for the MVP schema.

- Backend Developer 1 owns database migrations.

- Changes to shared models require team coordination.

- Any API-impacting change must be communicated to

  both frontend developers.

- Do not introduce new tables or relationships

  without approval.

The goal is to keep the hackathon implementation

simple, consistent, and easy to integrate.
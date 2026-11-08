# AI-GENERATED (Cursor Agent) — Issue #5: Generate and seed mock RIT data
# Owned by Backend Developer 1 (mamadub03).
# File-level AI attribution for this module (not per-symbol).
# All records are fictional hackathon demo data — not real RIT students/reviews.

"""Static mock RIT-style courses, demo users, and fictional reviews."""

from __future__ import annotations

# Courses keyed by unique `code` so re-seeding upserts instead of duplicating.
MOCK_COURSES: list[dict] = [
    {
        "code": "GCIS-123",
        "title": "Software Development & Problem Solving I",
        "description": (
            "Introduces programming fundamentals, problem decomposition, and "
            "basic software design using Python. DEMO DATA — not a live SIS feed."
        ),
        "department": "GCIS",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 4,
        "prerequisites": None,
    },
    {
        "code": "GCIS-124",
        "title": "Software Development & Problem Solving II",
        "description": (
            "Continues GCIS-123 with data structures, modular design, and "
            "collaborative coding practices. DEMO DATA."
        ),
        "department": "GCIS",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 4,
        "prerequisites": "GCIS-123",
    },
    {
        "code": "SWEN-261",
        "title": "Introduction to Software Engineering",
        "description": (
            "Covers software process, requirements, design basics, and team "
            "workflows for small projects. DEMO DATA."
        ),
        "department": "SWEN",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "GCIS-124",
    },
    {
        "code": "CSCI-320",
        "title": "Principles of Data Management",
        "description": (
            "Relational modeling, SQL, transactions, and intro to NoSQL tradeoffs. "
            "DEMO DATA."
        ),
        "department": "CSCI",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "GCIS-124",
    },
    {
        "code": "CSCI-331",
        "title": "Introduction to Intelligent Systems",
        "description": (
            "Search, knowledge representation, and introductory ML concepts for "
            "intelligent applications. DEMO DATA."
        ),
        "department": "CSCI",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "GCIS-124",
    },
    {
        "code": "ISTE-230",
        "title": "Introduction to Database and Data Modeling",
        "description": (
            "Entity-relationship modeling, normalization, and practical SQL for "
            "information systems. DEMO DATA."
        ),
        "department": "ISTE",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "ISTE-240",
        "title": "Web & Mobile I",
        "description": (
            "HTML/CSS/JS fundamentals and responsive layouts for web and mobile "
            "front ends. DEMO DATA."
        ),
        "department": "ISTE",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "NSSA-241",
        "title": "Introduction to Routing and Switching",
        "description": (
            "Networking fundamentals: addressing, switching, routing, and basic "
            "lab topologies. DEMO DATA."
        ),
        "department": "NSSA",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "MATH-190",
        "title": "Discrete Mathematics for Computing",
        "description": (
            "Logic, sets, proofs, combinatorics, and graph basics for computing "
            "majors. DEMO DATA."
        ),
        "department": "MATH",
        "college": "College of Science",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "STAT-145",
        "title": "Introduction to Statistics I",
        "description": (
            "Descriptive statistics, probability intro, and inference foundations. "
            "DEMO DATA."
        ),
        "department": "STAT",
        "college": "College of Science",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "COMM-201",
        "title": "Public Speaking",
        "description": (
            "Speech organization, delivery, and audience analysis for technical "
            "and general contexts. DEMO DATA."
        ),
        "department": "COMM",
        "college": "College of Liberal Arts",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "PSYC-101",
        "title": "Introduction to Psychology",
        "description": (
            "Survey of major psychology topics with emphasis on cognition and "
            "behavior. DEMO DATA."
        ),
        "department": "PSYC",
        "college": "College of Liberal Arts",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "MGMT-215",
        "title": "Organizational Behavior",
        "description": (
            "Individuals and teams in organizations: motivation, culture, and "
            "leadership basics. DEMO DATA."
        ),
        "department": "MGMT",
        "college": "Saunders College of Business",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "FINC-220",
        "title": "Financial Management",
        "description": (
            "Time value of money, capital budgeting intro, and financial "
            "statement basics. DEMO DATA."
        ),
        "department": "FINC",
        "college": "Saunders College of Business",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "IGME-110",
        "title": "Introduction to Interactive Media",
        "description": (
            "Creative coding and interactive media concepts for beginners. "
            "DEMO DATA."
        ),
        "department": "IGME",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "HCIN-610",
        "title": "Foundations of Human-Computer Interaction",
        "description": (
            "Usability principles, user research basics, and interface evaluation. "
            "DEMO DATA — graduate-style elective for demo breadth."
        ),
        "department": "HCIN",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
]

# Demo Auth0-style subjects — clearly not real students.
MOCK_USERS: list[dict] = [
    {
        "auth0_sub": "demo|worththecredit-seed-001",
        "major": "Software Engineering",
        "interests": ["web", "apis", "career_prep"],
        "skills": ["python", "git"],
        "career_goals": "Full-stack engineer (DEMO USER)",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-002",
        "major": "Computer Science",
        "interests": ["ai", "data"],
        "skills": ["python", "sql"],
        "career_goals": "ML-adjacent software role (DEMO USER)",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-003",
        "major": "Computing and Information Technologies",
        "interests": ["networking", "systems"],
        "skills": ["linux", "scripting"],
        "career_goals": "IT / infrastructure (DEMO USER)",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-004",
        "major": "New Media Interactive Development",
        "interests": ["ui", "creative_tech"],
        "skills": ["javascript", "design_basics"],
        "career_goals": "Interactive media developer (DEMO USER)",
    },
]

# Reviews reference course codes + auth0_sub; resolved to IDs at seed time.
# feedback always states these are fictional.
MOCK_REVIEWS: list[dict] = [
    {
        "auth0_sub": "demo|worththecredit-seed-001",
        "course_code": "SWEN-261",
        "goals": ["career_preparation", "skill_development"],
        "worth_score": 5,
        "concept_difficulty": 3,
        "weekly_hours_range": "6-10",
        "skills_gained": ["team process", "requirements writing"],
        "feedback": "[FICTIONAL DEMO REVIEW] Helped me practice real team workflows.",
        "instructor_name": "Demo Instructor A",
        "semester": "2025-Fall",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-002",
        "course_code": "SWEN-261",
        "goals": ["academic_development"],
        "worth_score": 4,
        "concept_difficulty": 3,
        "weekly_hours_range": "3-6",
        "skills_gained": ["design diagrams"],
        "feedback": "[FICTIONAL DEMO REVIEW] Solid intro; workload was manageable.",
        "instructor_name": None,
        "semester": "2025-Spring",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-002",
        "course_code": "CSCI-331",
        "goals": ["skill_development", "personal_exploration"],
        "worth_score": 5,
        "concept_difficulty": 4,
        "weekly_hours_range": "6-10",
        "skills_gained": ["search algorithms", "basic ML framing"],
        "feedback": "[FICTIONAL DEMO REVIEW] Challenging but aligned with my AI interest.",
        "instructor_name": "Demo Instructor B",
        "semester": "2025-Fall",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-001",
        "course_code": "CSCI-320",
        "goals": ["career_preparation", "degree_requirements"],
        "worth_score": 4,
        "concept_difficulty": 3,
        "weekly_hours_range": "3-6",
        "skills_gained": ["SQL", "schema design"],
        "feedback": "[FICTIONAL DEMO REVIEW] Directly useful for backend work.",
        "instructor_name": None,
        "semester": "2024-Fall",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-003",
        "course_code": "NSSA-241",
        "goals": ["skill_development", "career_preparation"],
        "worth_score": 4,
        "concept_difficulty": 4,
        "weekly_hours_range": "6-10",
        "skills_gained": ["subnetting", "switch config basics"],
        "feedback": "[FICTIONAL DEMO REVIEW] Lab-heavy; worth it for networking path.",
        "instructor_name": "Demo Instructor C",
        "semester": "2025-Spring",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-004",
        "course_code": "ISTE-240",
        "goals": ["skill_development", "personal_exploration"],
        "worth_score": 5,
        "concept_difficulty": 2,
        "weekly_hours_range": "3-6",
        "skills_gained": ["responsive CSS", "DOM basics"],
        "feedback": "[FICTIONAL DEMO REVIEW] Great starter for front-end electives.",
        "instructor_name": None,
        "semester": "2025-Fall",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-004",
        "course_code": "IGME-110",
        "goals": ["personal_exploration"],
        "worth_score": 3,
        "concept_difficulty": 2,
        "weekly_hours_range": "0-3",
        "skills_gained": ["creative coding intro"],
        "feedback": "[FICTIONAL DEMO REVIEW] Fun survey; lighter on depth.",
        "instructor_name": "Demo Instructor D",
        "semester": "2024-Spring",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-001",
        "course_code": "COMM-201",
        "goals": ["career_preparation", "personal_exploration"],
        "worth_score": 4,
        "concept_difficulty": 2,
        "weekly_hours_range": "3-6",
        "skills_gained": ["presentation structure"],
        "feedback": "[FICTIONAL DEMO REVIEW] Improved how I explain technical work.",
        "instructor_name": None,
        "semester": "2025-Fall",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-002",
        "course_code": "STAT-145",
        "goals": ["academic_development", "degree_requirements"],
        "worth_score": 3,
        "concept_difficulty": 3,
        "weekly_hours_range": "3-6",
        "skills_gained": ["hypothesis testing intro"],
        "feedback": "[FICTIONAL DEMO REVIEW] Necessary foundation; average worth for me.",
        "instructor_name": None,
        "semester": "2024-Fall",
    },
    {
        "auth0_sub": "demo|worththecredit-seed-003",
        "course_code": "ISTE-230",
        "goals": ["skill_development"],
        "worth_score": 5,
        "concept_difficulty": 3,
        "weekly_hours_range": "3-6",
        "skills_gained": ["ER modeling", "SQL joins"],
        "feedback": "[FICTIONAL DEMO REVIEW] Clear modeling practice for IT courses.",
        "instructor_name": "Demo Instructor E",
        "semester": "2025-Spring",
    },
]

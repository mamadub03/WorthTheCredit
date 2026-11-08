# AI-GENERATED (Cursor Agent) — Issue #5: Generate and seed mock RIT data
# Owned by Backend Developer 1 (mamadub03).
# ---------------------------------------------------------------------------
# FILE PURPOSE
#   Static COURSE fixtures only for Tiger Data / local demos.
#   Used by search, course details, and later Gemini candidate retrieval.
#
# MVP SCOPE (intentional)
#   - Seed mock RIT-style courses (this file).
#   - Do NOT seed users or reviews here.
#   - Reviews / Worth Scores come later from the review submission flow
#     (Backend Developer 2). Demo day can submit many review forms against
#     these courses; Gemini then uses those live aggregates.
#   - Students cannot add missing courses in the locked MVP.
#
# HOW TO USE
#   Imported by `scripts/seed_db.py`. No DB connection in this module.
#
# AI ATTRIBUTION
#   Whole-file Cursor Agent authorship for Issue #5 (file-level tag only).
# ---------------------------------------------------------------------------

"""Static mock RIT-style course catalog (courses only — no users/reviews)."""

from __future__ import annotations

# =============================================================================
# COMPONENT: MOCK_COURSES
# -----------------------------------------------------------------------------
# What: Cross-college RIT-flavored electives/core-adjacent courses for demos.
# Key:  `code` is unique so seeding upserts without duplicates.
# Shape: matches Course model / docs/DATABASE_SCHEMA.md.
# Note:  Descriptions include "DEMO DATA" and enough detail for Gemini ranking.
# =============================================================================
MOCK_COURSES: list[dict] = [
    # --- Golisano (GCCIS) ---
    {
        "code": "GCIS-123",
        "title": "Software Development & Problem Solving I",
        "description": (
            "Programming fundamentals, problem decomposition, and basic software "
            "design using Python. Strong foundation for computing majors. DEMO DATA."
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
            "Data structures, modular design, testing habits, and collaborative "
            "coding practices continuing from GCIS-123. DEMO DATA."
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
            "Software process, requirements, design basics, and team workflows for "
            "small projects. Useful for career prep in engineering teams. DEMO DATA."
        ),
        "department": "SWEN",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "GCIS-124",
    },
    {
        "code": "SWEN-262",
        "title": "Engineering of Software Subsystems",
        "description": (
            "Object-oriented design, design patterns, and subsystem interfaces with "
            "emphasis on maintainable structure. DEMO DATA."
        ),
        "department": "SWEN",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "SWEN-261",
    },
    {
        "code": "CSCI-320",
        "title": "Principles of Data Management",
        "description": (
            "Relational modeling, SQL, transactions, indexing intuition, and intro "
            "NoSQL tradeoffs for application developers. DEMO DATA."
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
            "Search, knowledge representation, and introductory machine learning "
            "concepts for building intelligent applications. DEMO DATA."
        ),
        "department": "CSCI",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "GCIS-124",
    },
    {
        "code": "CSCI-344",
        "title": "Programming Language Concepts",
        "description": (
            "Paradigms, syntax/semantics ideas, and comparative language features "
            "to deepen how students reason about code. DEMO DATA."
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
            "ER modeling, normalization, and practical SQL for information systems "
            "and IT-focused roles. DEMO DATA."
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
            "front ends. Good elective for UI-oriented goals. DEMO DATA."
        ),
        "department": "ISTE",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "ISTE-340",
        "title": "Client Programming",
        "description": (
            "Richer browser-side application patterns, APIs, and interactive UI "
            "behavior beyond introductory web markup. DEMO DATA."
        ),
        "department": "ISTE",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "ISTE-240",
    },
    {
        "code": "NSSA-241",
        "title": "Introduction to Routing and Switching",
        "description": (
            "Networking fundamentals: addressing, switching, routing, and basic "
            "lab topologies for infrastructure paths. DEMO DATA."
        ),
        "department": "NSSA",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "NSSA-221",
        "title": "Systems Administration I",
        "description": (
            "Linux/Windows admin basics, users/permissions, services, and "
            "operational troubleshooting habits. DEMO DATA."
        ),
        "department": "NSSA",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "IGME-110",
        "title": "Introduction to Interactive Media",
        "description": (
            "Creative coding and interactive media concepts for beginners exploring "
            "games or new media. DEMO DATA."
        ),
        "department": "IGME",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "IGME-220",
        "title": "Game Design & Development I",
        "description": (
            "Core game design loops, prototyping, and introductory development "
            "practices for interactive experiences. DEMO DATA."
        ),
        "department": "IGME",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "IGME-110",
    },
    {
        "code": "HCIN-610",
        "title": "Foundations of Human-Computer Interaction",
        "description": (
            "Usability principles, user research basics, and interface evaluation "
            "for product-minded electives. DEMO DATA."
        ),
        "department": "HCIN",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "CSEC-102",
        "title": "Information Security & Privacy",
        "description": (
            "Security mindset, privacy tradeoffs, common threats, and defensive "
            "basics for any computing student. DEMO DATA."
        ),
        "department": "CSEC",
        "college": "Golisano College of Computing and Information Sciences",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    # --- College of Science ---
    {
        "code": "MATH-190",
        "title": "Discrete Mathematics for Computing",
        "description": (
            "Logic, sets, proofs, combinatorics, and graph basics that underpin "
            "algorithms and CS theory electives. DEMO DATA."
        ),
        "department": "MATH",
        "college": "College of Science",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "MATH-241",
        "title": "Linear Algebra",
        "description": (
            "Vectors, matrices, linear transforms, and eigenvalues with computing "
            "and data applications in mind. DEMO DATA."
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
            "Descriptive statistics, probability intro, and inference foundations "
            "useful for analytics and research literacy. DEMO DATA."
        ),
        "department": "STAT",
        "college": "College of Science",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "STAT-205",
        "title": "Applied Statistics",
        "description": (
            "Applied inference, regression intro, and interpreting statistical "
            "results in real datasets. DEMO DATA."
        ),
        "department": "STAT",
        "college": "College of Science",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "STAT-145",
    },
    {
        "code": "PHYS-111",
        "title": "College Physics I",
        "description": (
            "Mechanics-focused college physics with problem-solving emphasis for "
            "STEM students. DEMO DATA."
        ),
        "department": "PHYS",
        "college": "College of Science",
        "campus": "Henrietta",
        "credits": 4,
        "prerequisites": None,
    },
    {
        "code": "BIOL-101",
        "title": "General Biology I",
        "description": (
            "Cell biology, genetics intro, and scientific reasoning for life "
            "science exploration electives. DEMO DATA."
        ),
        "department": "BIOL",
        "college": "College of Science",
        "campus": "Henrietta",
        "credits": 4,
        "prerequisites": None,
    },
    {
        "code": "CHEM-151",
        "title": "General Chemistry I",
        "description": (
            "Atomic structure, bonding, stoichiometry, and lab-linked chemical "
            "reasoning. DEMO DATA."
        ),
        "department": "CHEM",
        "college": "College of Science",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    # --- College of Liberal Arts ---
    {
        "code": "COMM-201",
        "title": "Public Speaking",
        "description": (
            "Speech organization, delivery, and audience analysis—especially useful "
            "for explaining technical work. DEMO DATA."
        ),
        "department": "COMM",
        "college": "College of Liberal Arts",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "COMM-253",
        "title": "Communication in Technical Organizations",
        "description": (
            "Writing and presenting in engineering/IT workplaces: docs, updates, "
            "and stakeholder clarity. DEMO DATA."
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
            "Survey of cognition, behavior, and social psychology foundations for "
            "HCI and personal exploration. DEMO DATA."
        ),
        "department": "PSYC",
        "college": "College of Liberal Arts",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "PSYC-223",
        "title": "Cognitive Psychology",
        "description": (
            "Attention, memory, and decision-making models relevant to UX and "
            "learning-system thinking. DEMO DATA."
        ),
        "department": "PSYC",
        "college": "College of Liberal Arts",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "PSYC-101",
    },
    {
        "code": "ENGL-210",
        "title": "Literature & Cultural Inquiry",
        "description": (
            "Close reading and cultural analysis electives that build writing depth "
            "and perspective-taking. DEMO DATA."
        ),
        "department": "ENGL",
        "college": "College of Liberal Arts",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "POLS-110",
        "title": "American Politics",
        "description": (
            "Institutions, participation, and policy basics for civic literacy "
            "electives. DEMO DATA."
        ),
        "department": "POLS",
        "college": "College of Liberal Arts",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "SOCI-102",
        "title": "Foundations of Sociology",
        "description": (
            "Social structures, inequality, and research framing useful for "
            "product ethics and community context. DEMO DATA."
        ),
        "department": "SOCI",
        "college": "College of Liberal Arts",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    # --- Saunders College of Business ---
    {
        "code": "MGMT-215",
        "title": "Organizational Behavior",
        "description": (
            "Motivation, teams, culture, and leadership basics for career and "
            "people-management goals. DEMO DATA."
        ),
        "department": "MGMT",
        "college": "Saunders College of Business",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "MGMT-340",
        "title": "Business Ethics & Corporate Social Responsibility",
        "description": (
            "Ethical frameworks and stakeholder impacts in business and tech "
            "decision-making. DEMO DATA."
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
            "Time value of money, capital budgeting intro, and reading financial "
            "statements for product/business roles. DEMO DATA."
        ),
        "department": "FINC",
        "college": "Saunders College of Business",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "MKTG-230",
        "title": "Principles of Marketing",
        "description": (
            "Customer segments, value propositions, and go-to-market basics useful "
            "for startup and product electives. DEMO DATA."
        ),
        "department": "MKTG",
        "college": "Saunders College of Business",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "ACCT-110",
        "title": "Financial Accounting",
        "description": (
            "Accounting cycle and financial statement literacy for founders and "
            "analysts. DEMO DATA."
        ),
        "department": "ACCT",
        "college": "Saunders College of Business",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    # --- Kate Gleason College of Engineering ---
    {
        "code": "EEEE-120",
        "title": "Digital Devices",
        "description": (
            "Digital logic, binary systems, and introductory hardware reasoning "
            "for EE/CE exploration. DEMO DATA."
        ),
        "department": "EEEE",
        "college": "Kate Gleason College of Engineering",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "EEEE-281",
        "title": "Circuits I",
        "description": (
            "Circuit laws, analysis techniques, and lab habits foundational to "
            "electrical engineering paths. DEMO DATA."
        ),
        "department": "EEEE",
        "college": "Kate Gleason College of Engineering",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "CMPE-260",
        "title": "Digital System Design",
        "description": (
            "Combinational/sequential design and HDL intro bridging software and "
            "hardware thinking. DEMO DATA."
        ),
        "department": "CMPE",
        "college": "Kate Gleason College of Engineering",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "EEEE-120",
    },
    {
        "code": "ISEE-120",
        "title": "Fundamentals of Industrial Engineering",
        "description": (
            "Process improvement, efficiency metrics, and systems thinking for "
            "operations-minded students. DEMO DATA."
        ),
        "department": "ISEE",
        "college": "Kate Gleason College of Engineering",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "MECE-104",
        "title": "Engineering Design Tools",
        "description": (
            "CAD/design-tool literacy and structured engineering design process "
            "exposure. DEMO DATA."
        ),
        "department": "MECE",
        "college": "Kate Gleason College of Engineering",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "CQAS-251",
        "title": "Data Analysis for Engineers",
        "description": (
            "Applied data analysis techniques for engineering experiments and "
            "quality contexts. DEMO DATA."
        ),
        "department": "CQAS",
        "college": "Kate Gleason College of Engineering",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": "STAT-145",
    },
    # --- College of Art and Design ---
    {
        "code": "IDDE-201",
        "title": "Design Drawing & Visualization",
        "description": (
            "Visual communication and sketching methods for product/experience "
            "design exploration. DEMO DATA."
        ),
        "department": "IDDE",
        "college": "College of Art and Design",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "GRDE-201",
        "title": "Graphic Design Survey",
        "description": (
            "Typography, layout, and visual hierarchy fundamentals valuable for "
            "UI-adjacent electives. DEMO DATA."
        ),
        "department": "GRDE",
        "college": "College of Art and Design",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "ILLM-206",
        "title": "Digital Illustration Techniques",
        "description": (
            "Digital image-making workflows for creative portfolios and media "
            "projects. DEMO DATA."
        ),
        "department": "ILLM",
        "college": "College of Art and Design",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "SOFA-101",
        "title": "Introduction to Film & Animation Concepts",
        "description": (
            "Story structure and moving-image basics for students exploring media "
            "production electives. DEMO DATA."
        ),
        "department": "SOFA",
        "college": "College of Art and Design",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    # --- College of Health Sciences and Technology ---
    {
        "code": "HLTH-101",
        "title": "Concepts in Health & Wellness",
        "description": (
            "Personal and community wellness frameworks useful for broader "
            "personal-development electives. DEMO DATA."
        ),
        "department": "HLTH",
        "college": "College of Health Sciences and Technology",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "NUTR-215",
        "title": "Contemporary Nutrition",
        "description": (
            "Nutrition science literacy and evidence evaluation for everyday and "
            "clinical-adjacent interests. DEMO DATA."
        ),
        "department": "NUTR",
        "college": "College of Health Sciences and Technology",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    {
        "code": "MEDG-101",
        "title": "Medical Terminology & Health Systems Intro",
        "description": (
            "Terminology and system overview for students exploring health-tech "
            "and clinical adjacent paths. DEMO DATA."
        ),
        "department": "MEDG",
        "college": "College of Health Sciences and Technology",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
    # --- NTID / accessibility-minded electives (demo breadth) ---
    {
        "code": "NCAR-100",
        "title": "Career Exploration Seminar (Demo)",
        "description": (
            "Structured reflection on skills, interests, and career pathways—"
            "useful personal-development elective for demos. DEMO DATA."
        ),
        "department": "NCAR",
        "college": "National Technical Institute for the Deaf",
        "campus": "Henrietta",
        "credits": 1,
        "prerequisites": None,
    },
    {
        "code": "NHSS-275",
        "title": "Deaf Culture & Communication Perspectives (Demo)",
        "description": (
            "Cultural and communication perspectives that broaden inclusive design "
            "and teamwork awareness. DEMO DATA."
        ),
        "department": "NHSS",
        "college": "National Technical Institute for the Deaf",
        "campus": "Henrietta",
        "credits": 3,
        "prerequisites": None,
    },
]

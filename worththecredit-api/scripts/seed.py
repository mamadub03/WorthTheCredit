"""Fill the database with mock RIT courses and sample reviews for local dev/demo.

    alembic upgrade head             # create tables first
    python -m scripts.seed           # add data (safe to run twice)
    python -m scripts.seed --reset   # delete reviews/reports/profiles first

BE1 owns the real mock course data; this is just enough to exercise BE2's
endpoints. Titles are illustrative, not official catalog data.
"""

import random
import sys

from sqlalchemy import delete, select

from app.be1_stubs.models import Course, User
from app.be1_stubs.queries import get_course_by_code
from app.db import SessionLocal
from app.profile.models import StudentProfile
from app.reviews.models import Review, ReviewReport

COURSES = [
    (
        "SWEN-261",
        "Introduction to Software Engineering",
        "Software Engineering",
        "Team-based software development using agile practices, design, testing and Java web applications.",
        "CSCI-142 or equivalent",
    ),
    (
        "CSCI-331",
        "Introduction to Artificial Intelligence",
        "Computer Science",
        "Search, knowledge representation, reasoning, and an introduction to machine learning in Python.",
        "CSCI-262 and MATH-251",
    ),
    (
        "IGME-106",
        "Game Development and Algorithmic Problem Solving II",
        "Interactive Games and Media",
        "Object-oriented programming and data structures applied to game development in C#.",
        "IGME-105",
    ),
    (
        "CSCI-420",
        "Principles of Data Mining",
        "Computer Science",
        "Hands-on classification, clustering, and association rules on real data sets with Python.",
        "CSCI-243",
    ),
    (
        "CSCI-335",
        "Machine Learning",
        "Computer Science",
        "Supervised and unsupervised learning, neural networks, and model evaluation.",
        "CSCI-331 and MATH-241",
    ),
    (
        "ISTE-140",
        "Web and Mobile I",
        "Information Sciences and Technologies",
        "HTML, CSS, and JavaScript fundamentals for building websites.",
        "",
    ),
    (
        "SWEN-344",
        "Web Engineering",
        "Software Engineering",
        "Design and development of web applications, REST APIs, databases and front-end frameworks like React.",
        "SWEN-261",
    ),
    (
        "CSCI-250",
        "Concepts of Computer Systems",
        "Computer Science",
        "Computer organization, assembly language, and digital logic.",
        "CSCI-142",
    ),
    (
        "PSYC-101",
        "Introduction to Psychology",
        "Psychology",
        "Survey of human behavior, cognition, development, and mental health.",
        "",
    ),
    (
        "ISTE-260",
        "Designing the User Experience",
        "Information Sciences and Technologies",
        "User-centered design, prototyping, and usability testing.",
        "ISTE-140",
    ),
    (
        "MATH-251",
        "Probability and Statistics I",
        "Mathematics",
        "Probability, random variables, distributions, and an introduction to statistical inference.",
        "MATH-182",
    ),
    (
        "CSEC-101",
        "Fundamentals of Computing Security",
        "Computing Security",
        "Core security concepts: threats, cryptography basics, and secure practices.",
        "",
    ),
]

# (course, worth, difficulty, hours, goals, skills, feedback, professor, semester)
REVIEWS = [
    (
        "SWEN-261",
        5,
        3,
        "7-9",
        ["career_preparation"],
        ["Agile", "Java", "Teamwork"],
        "The semester-long team project feels like a real internship.",
        "Dr. Rivera",
        "Fall 2025",
    ),
    (
        "SWEN-261",
        4,
        3,
        "7-9",
        ["skill_development"],
        ["Unit testing", "Git"],
        "Team dynamics matter as much as the code. Start sprints early.",
        "Dr. Rivera",
        "Spring 2025",
    ),
    ("SWEN-261", 4, 2, "4-6", ["degree_requirement"], ["Agile", "Code review"], None, "Prof. Chen", "Fall 2024"),
    (
        "CSCI-331",
        5,
        4,
        "10-12",
        ["academic_development", "career_preparation"],
        ["Python", "Search algorithms"],
        "Concepts are challenging but very rewarding; projects were the best part.",
        "Dr. Patel",
        "Fall 2025",
    ),
    (
        "CSCI-331",
        4,
        4,
        "10-12",
        ["skill_development"],
        ["Machine learning", "Python"],
        None,
        "Dr. Patel",
        "Spring 2025",
    ),
    (
        "CSCI-420",
        5,
        4,
        "10-12",
        ["career_preparation"],
        ["Pandas", "Clustering", "Data cleaning"],
        "Homework uses real messy data. I talked about my project in interviews.",
        None,
        "Spring 2025",
    ),
    ("CSCI-420", 4, 3, "7-9", ["skill_development"], ["Decision trees", "Python"], None, None, None),
    (
        "CSCI-335",
        3,
        5,
        "13+",
        ["academic_development"],
        ["Neural networks", "Linear algebra"],
        "The math is heavy; strong linear algebra helps a lot.",
        None,
        "Fall 2024",
    ),
    (
        "ISTE-140",
        4,
        2,
        "4-6",
        ["skill_development", "personal_exploration"],
        ["HTML", "CSS"],
        "Great start if you have no experience.",
        None,
        "Fall 2025",
    ),
    (
        "SWEN-344",
        5,
        3,
        "7-9",
        ["career_preparation"],
        ["React", "REST APIs"],
        "Built a portfolio-ready web app.",
        None,
        "Spring 2025",
    ),
    (
        "CSCI-250",
        3,
        4,
        "10-12",
        ["degree_requirement"],
        ["Assembly", "Digital logic"],
        "Explains what really happens under the hood.",
        None,
        None,
    ),
    ("CSCI-250", 2, 4, "10-12", ["degree_requirement"], ["Assembly"], None, None, None),
    (
        "PSYC-101",
        4,
        2,
        "4-6",
        ["personal_exploration"],
        ["Critical thinking"],
        "Eye-opening outside my major.",
        None,
        None,
    ),
    (
        "ISTE-260",
        5,
        2,
        "4-6",
        ["career_preparation", "skill_development"],
        ["Prototyping", "Figma", "User research"],
        "Loved the real usability testing.",
        None,
        "Fall 2025",
    ),
    (
        "MATH-251",
        4,
        4,
        "7-9",
        ["degree_requirement", "academic_development"],
        ["Probability", "Statistics"],
        "Paid off later in ML classes.",
        None,
        None,
    ),
]


def main() -> None:
    """Run `alembic upgrade head` first so the tables exist."""
    with SessionLocal() as db:
        if "--reset" in sys.argv:
            db.execute(delete(ReviewReport))
            db.execute(delete(Review))
            db.execute(delete(StudentProfile))
            db.execute(delete(User).where(User.auth0_sub.like("seed|%")))
            db.commit()
        for code, title, dept, desc, prereq in COURSES:
            if get_course_by_code(db, code) is None:
                db.add(
                    Course(
                        code=code, title=title, department=dept, description=desc, credit_hours=3, prerequisites=prereq
                    )
                )
        db.commit()
        rng = random.Random(42)
        added = 0
        for i, (code, worth, diff, hours, goals, skills, fb, prof, sem) in enumerate(REVIEWS):
            sub = f"seed|student-{i:02d}-{rng.randint(1000, 9999)}"
            user = db.scalar(select(User).where(User.auth0_sub == sub))
            if user is None:
                user = User(auth0_sub=sub)
                db.add(user)
                db.flush()
            course = get_course_by_code(db, code)
            assert course is not None
            if db.scalar(select(Review.id).where(Review.user_id == user.id, Review.course_id == course.id)):
                continue  # already seeded
            db.add(
                Review(
                    user_id=user.id,
                    course_id=course.id,
                    goals=goals,
                    worth_score=worth,
                    difficulty=diff,
                    weekly_hours=hours,
                    skills=skills,
                    feedback=fb,
                    professor=prof,
                    semester=sem,
                )
            )
            added += 1
        db.commit()
    print(f"Seeded {len(COURSES)} courses and {added} reviews.")


if __name__ == "__main__":
    main()

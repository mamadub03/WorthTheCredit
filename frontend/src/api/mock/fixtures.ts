/**
 * Sample data for the in-browser mock API. Every course description ends with
 * "DEMO DATA" (as in BE1's seed), every review is marked "(sample review)", and
 * professor names are obviously made up, so none of it reads as a real
 * student's opinion of a real person. Owner: FE2 (#25).
 */
import type { GoalKey, WeeklyHoursKey } from '../../domain/reviewVocabulary.ts'

export interface MockCourse {
  id: string
  code: string
  title: string
  description: string
  department: string
  college: string
  campus: string
  credits: number
  prerequisites: string | null
  /** Topics and skills, used by the mock recommender. */
  tags: string[]
}

export interface MockReview {
  id: string
  /** Who wrote it (never returned by the API). */
  sub: string
  course_id: string
  goals: GoalKey[]
  worth_score: number
  concept_difficulty: number
  weekly_hours_range: WeeklyHoursKey
  skills_gained: string[]
  feedback: string | null
  instructor_name: string | null
  semester: string | null
  created_at: string
}

const GCCIS = 'Golisano College of Computing and Information Sciences'
const courseId = (n: number) => `c0a5e000-0000-4000-8000-${String(n).padStart(12, '0')}`

type CourseRow = [code: string, title: string, description: string, department: string, college: string, credits: number, prerequisites: string | null, tags: string[]]

const COURSE_ROWS: CourseRow[] = [
  ['GCIS-123', 'Software Development & Problem Solving I', 'Programming fundamentals, problem decomposition, and testing habits in Python.', 'GCIS', GCCIS, 4, null, ['Python', 'Problem decomposition', 'Unit testing', 'Programming']],
  ['GCIS-124', 'Software Development & Problem Solving II', 'Data structures, modular design, and collaborative coding in Java.', 'GCIS', GCCIS, 4, 'GCIS-123', ['Java', 'Data structures', 'Collaboration', 'Programming']],
  ['SWEN-261', 'Introduction to Software Engineering', 'Team-based software development with agile practices, code review, and design.', 'SWEN', GCCIS, 3, 'GCIS-124', ['Agile', 'Scrum', 'Code review', 'Java', 'Teamwork', 'Software engineering']],
  ['CSCI-331', 'Introduction to Artificial Intelligence', 'Search, knowledge representation, and an introduction to machine learning.', 'CSCI', GCCIS, 3, 'GCIS-124', ['Artificial intelligence', 'Machine learning', 'Search algorithms', 'Python']],
  ['CSCI-420', 'Principles of Data Mining', 'Finding patterns in real data: cleaning, clustering, and classification.', 'CSCI', GCCIS, 3, 'MATH-251', ['Data mining', 'Machine learning', 'Pandas', 'Clustering', 'Data']],
  ['ISTE-240', 'Web and Mobile II', 'Interactive web front ends with JavaScript and modern browser APIs.', 'ISTE', GCCIS, 3, null, ['JavaScript', 'Web development', 'Front end', 'UI']],
  ['IGME-220', 'Game Design and Development I', 'Designing and prototyping games, with regular playtests.', 'IGME', GCCIS, 3, null, ['Game design', 'Prototyping', 'C#', 'Games']],
  ['HCIN-210', 'User-Centered Design Methods', 'User research, prototyping, and usability testing for product teams.', 'HCIN', GCCIS, 3, null, ['UX', 'User research', 'Prototyping', 'Usability testing', 'Design']],
  ['CSEC-101', 'Fundamentals of Computing Security', 'Security principles, threats, and defenses for any computing student.', 'CSEC', GCCIS, 3, null, ['Security', 'Linux', 'Networking', 'Cybersecurity']],
  ['MATH-251', 'Probability and Statistics I', 'Probability, distributions, and statistical inference.', 'MATH', 'College of Science', 3, null, ['Statistics', 'Probability', 'Data', 'Math']],
  ['COMM-142', 'Introduction to Technical Communication', 'Writing reports, documentation, and presentations for technical audiences.', 'COMM', 'College of Liberal Arts', 3, null, ['Technical writing', 'Communication', 'Presentations', 'Writing']],
  ['ENGL-210', 'Introduction to Creative Writing', 'Fiction and poetry workshops for students who want to write for themselves.', 'ENGL', 'College of Liberal Arts', 3, null, ['Creative writing', 'Writing', 'Storytelling']],
]

export const MOCK_COURSES: MockCourse[] = COURSE_ROWS.map(([code, title, description, department, college, credits, prerequisites, tags], index) => ({
  id: courseId(index + 1),
  code,
  title,
  description: `${description} DEMO DATA.`,
  department,
  college,
  campus: 'Henrietta',
  credits,
  prerequisites,
  tags,
}))

type SeedRow = [
  course: string,
  goals: GoalKey[],
  worth: number,
  skills: string[],
  difficulty: number,
  hours: WeeklyHoursKey,
  feedback: string | null,
  instructor: string | null,
  semester: string,
  createdAt: string,
]

const SEED: SeedRow[] = [
  ['SWEN-261', ['career_preparation', 'skill_development'], 5, ['Agile', 'Scrum', 'Code review'], 3, '6-10', 'The team project felt like a real job. Start early. (sample review)', 'Prof. Example', 'Fall 2025', '2026-01-12T15:04:00Z'],
  ['SWEN-261', ['degree_requirements'], 4, ['Java', 'Unit testing'], 2, '3-6', null, 'Dr. Sample', 'Spring 2025', '2025-05-20T18:30:00Z'],
  ['SWEN-261', ['career_preparation'], 4, ['Agile', 'Git'], 3, '6-10', 'Lots of teamwork, so pick your team carefully. (sample review)', 'Prof. Example', 'Spring 2025', '2025-05-22T13:10:00Z'],
  ['SWEN-261', ['skill_development'], 3, ['Design patterns'], 3, '10+', 'Useful, but the sprints pile up near finals. (sample review)', 'Dr. Sample', 'Fall 2024', '2025-01-08T20:45:00Z'],
  ['CSCI-331', ['career_preparation', 'academic_development'], 5, ['Search algorithms', 'Python', 'Machine learning basics'], 4, '6-10', 'Hard, but worth it if you want to work in AI. (sample review)', 'Prof. Placeholder', 'Fall 2025', '2026-01-03T17:00:00Z'],
  ['CSCI-331', ['personal_exploration'], 3, ['Python'], 4, '10+', 'Interesting, though the math caught me off guard. (sample review)', 'Prof. Placeholder', 'Spring 2025', '2025-05-15T12:00:00Z'],
  ['CSCI-331', ['skill_development'], 4, ['Machine learning basics', 'Pandas'], 3, '6-10', null, null, 'Fall 2024', '2025-01-10T09:30:00Z'],
  ['CSCI-420', ['career_preparation', 'skill_development'], 5, ['Pandas', 'Clustering', 'Data cleaning'], 3, '10+', 'Real, messy data sets made it practical. (sample review)', 'Dr. Sample', 'Spring 2025', '2025-05-25T16:20:00Z'],
  ['CSCI-420', ['skill_development'], 4, ['Clustering', 'Python'], 4, '10+', null, 'Dr. Sample', 'Fall 2025', '2026-01-05T11:15:00Z'],
  ['GCIS-123', ['degree_requirements', 'skill_development'], 4, ['Python', 'Problem decomposition'], 2, '3-6', 'Great first course, and the labs build steadily. (sample review)', 'Prof. Example', 'Fall 2025', '2026-01-02T14:00:00Z'],
  ['GCIS-123', ['academic_development'], 4, ['Python', 'Unit testing'], 3, '6-10', null, null, 'Fall 2024', '2024-12-20T10:00:00Z'],
  ['HCIN-210', ['career_preparation'], 5, ['User research', 'Prototyping'], 2, '3-6', 'Made me want to work in UX. (sample review)', 'Prof. Placeholder', 'Spring 2025', '2025-05-18T19:40:00Z'],
  ['HCIN-210', ['personal_exploration', 'skill_development'], 4, ['Figma', 'Usability testing'], 2, '3-6', null, 'Prof. Placeholder', 'Fall 2025', '2026-01-04T08:50:00Z'],
  ['IGME-220', ['personal_exploration'], 4, ['Game design', 'Prototyping'], 3, '6-10', 'Fun, and the playtests teach a lot. (sample review)', 'Dr. Sample', 'Spring 2025', '2025-05-19T21:05:00Z'],
  ['COMM-142', ['degree_requirements'], 3, ['Technical writing'], 1, '0-3', 'Easy credit that still helped with lab reports. (sample review)', null, 'Fall 2025', '2026-01-06T13:25:00Z'],
  ['CSEC-101', ['career_preparation'], 4, ['Linux', 'Networking basics'], 3, '3-6', null, 'Prof. Example', 'Spring 2025', '2025-05-21T15:35:00Z'],
]

const idFor = (code: string) => MOCK_COURSES.find((course) => course.code === code)?.id ?? ''

export const MOCK_REVIEWS: MockReview[] = SEED.map(
  ([course, goals, worth, skills, difficulty, hours, feedback, instructor, semester, createdAt], index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    sub: `demo|seed-${index + 1}`,
    course_id: idFor(course),
    goals,
    worth_score: worth,
    concept_difficulty: difficulty,
    weekly_hours_range: hours,
    skills_gained: skills,
    feedback,
    instructor_name: instructor,
    semester,
    created_at: createdAt,
  }),
)

/**
 * Sample data for the in-browser mock API. Every course description ends with
 * "DEMO DATA" (as in BE1's seed), every review is marked "(sample review)", and
 * professor names are obviously made up, so none of it reads as a real
 * student's opinion of a real person. Owner: FE2 (#25); FE1 may extend the courses.
 */
import type { GoalKey, WeeklyHoursKey } from '../../domain/reviewVocabulary.ts'

export interface MockCourse {
  course_code: string
  title: string
  description: string
  department: string
  college: string
  credit_hours: number
  prerequisites: string | null
  /** Topics and skills, used for search and the mock recommender. */
  tags: string[]
}

export interface MockReview {
  id: string
  /** Who wrote it (never returned by the API). */
  sub: string
  course_code: string
  goals: GoalKey[]
  worth_score: number
  skills: string[]
  difficulty: number
  weekly_hours: WeeklyHoursKey
  feedback: string | null
  professor: string | null
  semester: string | null
  created_at: string
}

const GCCIS = 'Golisano College of Computing and Information Sciences'

export const MOCK_COURSES: MockCourse[] = [
  {
    course_code: 'GCIS-123',
    title: 'Software Development & Problem Solving I',
    description: 'Programming fundamentals, problem decomposition, and testing habits in Python. DEMO DATA.',
    department: 'GCIS',
    college: GCCIS,
    credit_hours: 4,
    prerequisites: null,
    tags: ['Python', 'Problem decomposition', 'Unit testing', 'Programming'],
  },
  {
    course_code: 'GCIS-124',
    title: 'Software Development & Problem Solving II',
    description: 'Data structures, modular design, and collaborative coding in Java. DEMO DATA.',
    department: 'GCIS',
    college: GCCIS,
    credit_hours: 4,
    prerequisites: 'GCIS-123',
    tags: ['Java', 'Data structures', 'Collaboration', 'Programming'],
  },
  {
    course_code: 'SWEN-261',
    title: 'Introduction to Software Engineering',
    description: 'Team-based software development with agile practices, code review, and design. DEMO DATA.',
    department: 'SWEN',
    college: GCCIS,
    credit_hours: 3,
    prerequisites: 'GCIS-124',
    tags: ['Agile', 'Scrum', 'Code review', 'Java', 'Teamwork', 'Software engineering'],
  },
  {
    course_code: 'CSCI-331',
    title: 'Introduction to Artificial Intelligence',
    description: 'Search, knowledge representation, and an introduction to machine learning. DEMO DATA.',
    department: 'CSCI',
    college: GCCIS,
    credit_hours: 3,
    prerequisites: 'GCIS-124',
    tags: ['Artificial intelligence', 'Machine learning', 'Search algorithms', 'Python'],
  },
  {
    course_code: 'CSCI-420',
    title: 'Principles of Data Mining',
    description: 'Finding patterns in real data: cleaning, clustering, and classification. DEMO DATA.',
    department: 'CSCI',
    college: GCCIS,
    credit_hours: 3,
    prerequisites: 'MATH-251',
    tags: ['Data mining', 'Machine learning', 'Pandas', 'Clustering', 'Data'],
  },
  {
    course_code: 'ISTE-340',
    title: 'Client Programming',
    description: 'Interactive web front ends with JavaScript and modern browser APIs. DEMO DATA.',
    department: 'ISTE',
    college: GCCIS,
    credit_hours: 3,
    prerequisites: null,
    tags: ['JavaScript', 'Web development', 'Front end', 'UI'],
  },
  {
    course_code: 'IGME-220',
    title: 'Game Design and Development I',
    description: 'Designing and prototyping games, with regular playtests. DEMO DATA.',
    department: 'IGME',
    college: GCCIS,
    credit_hours: 3,
    prerequisites: null,
    tags: ['Game design', 'Prototyping', 'C#', 'Games'],
  },
  {
    course_code: 'HCIN-210',
    title: 'User-Centered Design Methods',
    description: 'User research, prototyping, and usability testing for product teams. DEMO DATA.',
    department: 'HCIN',
    college: GCCIS,
    credit_hours: 3,
    prerequisites: null,
    tags: ['UX', 'User research', 'Prototyping', 'Usability testing', 'Design'],
  },
  {
    course_code: 'CSEC-101',
    title: 'Fundamentals of Computing Security',
    description: 'Security principles, threats, and defenses for any computing student. DEMO DATA.',
    department: 'CSEC',
    college: GCCIS,
    credit_hours: 3,
    prerequisites: null,
    tags: ['Security', 'Linux', 'Networking', 'Cybersecurity'],
  },
  {
    course_code: 'MATH-251',
    title: 'Probability and Statistics I',
    description: 'Probability, distributions, and statistical inference. DEMO DATA.',
    department: 'MATH',
    college: 'College of Science',
    credit_hours: 3,
    prerequisites: null,
    tags: ['Statistics', 'Probability', 'Data', 'Math'],
  },
  {
    course_code: 'COMM-142',
    title: 'Introduction to Technical Communication',
    description: 'Writing reports, documentation, and presentations for technical audiences. DEMO DATA.',
    department: 'COMM',
    college: 'College of Liberal Arts',
    credit_hours: 3,
    prerequisites: null,
    tags: ['Technical writing', 'Communication', 'Presentations', 'Writing'],
  },
  {
    course_code: 'ENGL-210',
    title: 'Introduction to Creative Writing',
    description: 'Fiction and poetry workshops for students who want to write for themselves. DEMO DATA.',
    department: 'ENGL',
    college: 'College of Liberal Arts',
    credit_hours: 3,
    prerequisites: null,
    tags: ['Creative writing', 'Writing', 'Storytelling'],
  },
]

type SeedRow = [
  course: string,
  goals: GoalKey[],
  worth: number,
  skills: string[],
  difficulty: number,
  hours: WeeklyHoursKey,
  feedback: string | null,
  professor: string | null,
  semester: string,
  createdAt: string,
]

const SEED: SeedRow[] = [
  ['SWEN-261', ['career_preparation', 'skill_development'], 5, ['Agile', 'Scrum', 'Code review'], 3, '7-9', 'The team project felt like a real job. Start early. (sample review)', 'Prof. Example', 'Fall 2025', '2026-01-12T15:04:00Z'],
  ['SWEN-261', ['degree_requirement'], 4, ['Java', 'Unit testing'], 2, '4-6', null, 'Dr. Sample', 'Spring 2025', '2025-05-20T18:30:00Z'],
  ['SWEN-261', ['career_preparation'], 4, ['Agile', 'Git'], 3, '7-9', 'Lots of teamwork, so pick your team carefully. (sample review)', 'Prof. Example', 'Spring 2025', '2025-05-22T13:10:00Z'],
  ['SWEN-261', ['skill_development'], 3, ['Design patterns'], 3, '10-12', 'Useful, but the sprints pile up near finals. (sample review)', 'Dr. Sample', 'Fall 2024', '2025-01-08T20:45:00Z'],
  ['CSCI-331', ['career_preparation', 'academic_development'], 5, ['Search algorithms', 'Python', 'Machine learning basics'], 4, '7-9', 'Hard, but worth it if you want to work in AI. (sample review)', 'Prof. Placeholder', 'Fall 2025', '2026-01-03T17:00:00Z'],
  ['CSCI-331', ['personal_exploration'], 3, ['Python'], 4, '10-12', 'Interesting, though the math caught me off guard. (sample review)', 'Prof. Placeholder', 'Spring 2025', '2025-05-15T12:00:00Z'],
  ['CSCI-331', ['skill_development'], 4, ['Machine learning basics', 'Pandas'], 3, '7-9', null, null, 'Fall 2024', '2025-01-10T09:30:00Z'],
  ['CSCI-420', ['career_preparation', 'skill_development'], 5, ['Pandas', 'Clustering', 'Data cleaning'], 3, '10-12', 'Real, messy data sets made it practical. (sample review)', 'Dr. Sample', 'Spring 2025', '2025-05-25T16:20:00Z'],
  ['CSCI-420', ['skill_development'], 4, ['Clustering', 'Python'], 4, '10-12', null, 'Dr. Sample', 'Fall 2025', '2026-01-05T11:15:00Z'],
  ['GCIS-123', ['degree_requirement', 'skill_development'], 4, ['Python', 'Problem decomposition'], 2, '4-6', 'Great first course, and the labs build steadily. (sample review)', 'Prof. Example', 'Fall 2025', '2026-01-02T14:00:00Z'],
  ['GCIS-123', ['academic_development'], 4, ['Python', 'Unit testing'], 3, '7-9', null, null, 'Fall 2024', '2024-12-20T10:00:00Z'],
  ['HCIN-210', ['career_preparation'], 5, ['User research', 'Prototyping'], 2, '4-6', 'Made me want to work in UX. (sample review)', 'Prof. Placeholder', 'Spring 2025', '2025-05-18T19:40:00Z'],
  ['HCIN-210', ['personal_exploration', 'skill_development'], 4, ['Figma', 'Usability testing'], 2, '4-6', null, 'Prof. Placeholder', 'Fall 2025', '2026-01-04T08:50:00Z'],
  ['IGME-220', ['personal_exploration'], 4, ['Game design', 'Prototyping'], 3, '7-9', 'Fun, and the playtests teach a lot. (sample review)', 'Dr. Sample', 'Spring 2025', '2025-05-19T21:05:00Z'],
  ['COMM-142', ['degree_requirement'], 3, ['Technical writing'], 1, '0-3', 'Easy credit that still helped with lab reports. (sample review)', null, 'Fall 2025', '2026-01-06T13:25:00Z'],
  ['CSEC-101', ['career_preparation'], 4, ['Linux', 'Networking basics'], 3, '4-6', null, 'Prof. Example', 'Spring 2025', '2025-05-21T15:35:00Z'],
]

export const MOCK_REVIEWS: MockReview[] = SEED.map(
  ([course, goals, worth, skills, difficulty, hours, feedback, professor, semester, createdAt], index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    sub: `demo|seed-${index + 1}`,
    course_code: course,
    goals,
    worth_score: worth,
    skills,
    difficulty,
    weekly_hours: hours,
    feedback,
    professor,
    semester,
    created_at: createdAt,
  }),
)

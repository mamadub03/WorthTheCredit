import { describe, expect, it } from 'vitest'
import type { Review } from '../../api/reviews.ts'
import { collegeForName } from '../../domain/colleges.ts'
import { goalShares, mostCommonHours, topSkills, worthDistribution } from './insights.ts'

const review = (overrides: Partial<Review>): Review => ({
  id: Math.random().toString(36),
  courseId: 'c1',
  goals: [],
  worthScore: 4,
  conceptDifficulty: 3,
  weeklyHoursRange: '3-6',
  skillsGained: [],
  feedback: null,
  instructorName: null,
  semester: null,
  createdAt: '2025-12-01T00:00:00Z',
  ...overrides,
})

describe('course insights', () => {
  it('spreads Worth Scores into percentages, 5 first', () => {
    const rows = worthDistribution([review({ worthScore: 5 }), review({ worthScore: 5 }), review({ worthScore: 3 }), review({ worthScore: 1 })])
    expect(rows.map((row) => [row.score, row.pct])).toEqual([
      [5, 50],
      [4, 0],
      [3, 25],
      [2, 0],
      [1, 25],
    ])
  })

  it('counts each goal once per review and sorts by share', () => {
    const shares = goalShares([
      review({ goals: ['career_preparation', 'skill_development'] }),
      review({ goals: ['career_preparation'] }),
    ])
    expect(shares.map((share) => [share.key, share.pct])).toEqual([
      ['career_preparation', 100],
      ['skill_development', 50],
    ])
  })

  it('merges skills case-insensitively', () => {
    const skills = topSkills([review({ skillsGained: ['Python', 'SQL'] }), review({ skillsGained: ['python '] })])
    expect(skills).toEqual([
      { name: 'Python', count: 2 },
      { name: 'SQL', count: 1 },
    ])
  })

  it('picks the most reported weekly hours, or none without reviews', () => {
    expect(mostCommonHours({ '0-3': 1, '3-6': 4, '6-10': 2, '10+': 0 })).toBe('3-6')
    expect(mostCommonHours({ '0-3': 0, '3-6': 0, '6-10': 0, '10+': 0 })).toBeNull()
  })
})

describe('collegeForName', () => {
  it('maps API college names to the 11 colleges', () => {
    expect(collegeForName('Golisano College of Computing and Information Sciences')?.key).toBe('computing')
    expect(collegeForName('College of Liberal Arts')?.key).toBe('liberalarts')
    expect(collegeForName('College of Science')?.key).toBe('science')
  })

  it('tells Engineering Technology apart from Engineering', () => {
    expect(collegeForName('College of Engineering Technology')?.key).toBe('engtech')
    expect(collegeForName('Kate Gleason College of Engineering')?.key).toBe('engineering')
  })

  it('returns null for unknown or missing names', () => {
    expect(collegeForName('Hogwarts')).toBeNull()
    expect(collegeForName(null)).toBeNull()
  })
})

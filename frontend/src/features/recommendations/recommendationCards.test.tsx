import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { createApiClient } from '../../api/client.ts'
import { MOCK_COURSES } from '../../api/mock/fixtures.ts'
import { createMockApi } from '../../api/mock/mockApi.ts'
import type { Recommendation } from '../../api/recommendations.ts'
import type { Review } from '../../api/reviews.ts'
import DevAuthProvider from '../auth/DevAuthProvider.tsx'
import { ApiClientOverride } from '../auth/useApiClient.ts'
import RecommendationCard from './RecommendationCard.tsx'
import RecommendationsPage from './RecommendationsPage.tsx'
import { summarizeInsights } from './useCourseInsights.ts'

const BASE = 'http://localhost:8000'

function withProviders(children: React.ReactNode, path = '/recommendations') {
  const mock = createMockApi({ baseUrl: BASE, latencyMs: 0, recommendationLatencyMs: 0, storage: null })
  const client = createApiClient({ baseUrl: BASE, fetch: mock.fetch, getAccessToken: async () => 'dev:erin' })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DevAuthProvider>
        <ApiClientOverride.Provider value={client}>{children}</ApiClientOverride.Provider>
      </DevAuthProvider>
    </MemoryRouter>,
  )
}

const review = (skills: string[]): Review => ({
  id: 'r',
  courseId: 'c',
  goals: [],
  worthScore: 4,
  conceptDifficulty: 3,
  weeklyHoursRange: '6-10',
  skillsGained: skills,
  feedback: null,
  instructorName: null,
  semester: null,
  createdAt: '2026-01-01T00:00:00Z',
})

describe('summarizeInsights', () => {
  it('finds the most common hours and the most mentioned skills', () => {
    const insights = summarizeInsights(
      { courseId: 'c', worthScore: 4, reviewCount: 3, averageDifficulty: 2.67, workload: { '0-3': 0, '3-6': 1, '6-10': 2, '10+': 0 } },
      [review(['Python', 'Git']), review(['python', 'Agile']), review(['Agile', 'Python'])],
    )
    expect(insights).toEqual({ averageDifficulty: 2.67, mostCommonHours: '6-10', topSkills: ['Python', 'Agile', 'Git'] })
  })
})

describe('recommendation cards', () => {
  it('show the explanation, the database numbers, and what students reported', async () => {
    const user = userEvent.setup()
    withProviders(
      <Routes>
        <Route path="/recommendations" element={<RecommendationsPage />} />
      </Routes>,
    )
    await user.type(await screen.findByRole('textbox', { name: 'Interests' }), 'machine learning{Enter}')
    await user.click(screen.getByRole('button', { name: 'Match me with courses' }))

    const cards = await screen.findAllByRole('article')
    const card = cards.find((article) => article.textContent?.includes('CSCI-331'))!
    expect(card).toBeTruthy()
    expect(within(card).getByText(/Matches your interest in machine learning/)).toBeTruthy()
    expect(within(card).getByText('4.0')).toBeTruthy()
    expect(within(card).getByText('Worth Score', { exact: false })).toBeTruthy()
    expect(within(card).getByText(/out of 5, from 3 reviews/)).toBeTruthy()
    expect(within(card).getByText('CSCI-331', { selector: '[class*="code"]' })).toBeTruthy()
    expect(await within(card).findByText('Machine learning basics')).toBeTruthy()
    // The board's stats row: difficulty as caps (with its screen reader text) and the most common weekly hours.
    expect(within(card).getByText('Concept difficulty 3.7 of 5')).toBeTruthy()
    expect(within(card).getByTitle('Hours per week students reported').textContent).toContain('6–10h/wk')
    expect(within(card).getByText('Most students reported 6 to 10 hours a week')).toBeTruthy()
    expect(within(card).getByText(/Not checked against your record/)).toBeTruthy()
    expect(within(card).getByRole('link', { name: 'View course' }).getAttribute('href')).toMatch(/^\/courses\//)
  })

  it('say "No reviews yet" instead of a score for an unreviewed course', () => {
    const course = MOCK_COURSES.find((item) => item.code === 'ENGL-210')!
    const item: Recommendation = {
      course: { ...course, college: course.college, campus: course.campus },
      matchLevel: 'exploratory',
      explanation: 'A writing elective that could round out your schedule.',
      worthScore: null,
      reviewCount: 0,
    }
    withProviders(<RecommendationCard item={item} />)
    expect(screen.getByText('No reviews yet')).toBeTruthy()
    expect(screen.getByText('Worth exploring')).toBeTruthy()
    expect(screen.getByText(/rests on the course description/)).toBeTruthy()
  })
})

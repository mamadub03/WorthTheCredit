import { BrowserRouter, Route, Routes } from 'react-router'
import AppLayout from './layout/AppLayout.tsx'
import CoursePage from './pages/CoursePage.tsx'
import CoursesPage from './pages/CoursesPage.tsx'
import HomePage from './pages/HomePage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import { COURSES_PATH } from './routes/discoveryPaths.ts'
// FE2 (docs/frontend-coordination.md section 3): shared design tokens, sign-in, and FE2's routes.
// The demo banner and the sign-in menu now render inside AppLayout's header.
import './styles/exampleB.css'
import AuthProvider from './features/auth/AuthProvider.tsx'
import { fe2Routes } from './routes/fe2Routes.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path={COURSES_PATH} element={<CoursesPage />} />
            <Route path="/courses/:courseId" element={<CoursePage />} />
            {fe2Routes()}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

import { BrowserRouter, Link, Route, Routes } from 'react-router'
import HomePage from './pages/HomePage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
// FE2 (docs/frontend-coordination.md section 3): sign-in, the demo banner, and FE2's routes.
import DemoDataBanner from './api/mock/DemoDataBanner.tsx'
import AuthMenu from './features/auth/AuthMenu.tsx'
import AuthProvider from './features/auth/AuthProvider.tsx'
import { fe2Routes } from './routes/fe2Routes.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <header className="site-header">
            <Link to="/" className="brand">
              WorthTheCredit
            </Link>
            <AuthMenu />
          </header>
          <DemoDataBanner />
          <main className="site-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              {fe2Routes()}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

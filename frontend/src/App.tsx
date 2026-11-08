import { BrowserRouter, Link, Route, Routes } from 'react-router'
import HomePage from './pages/HomePage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="site-header">
          <Link to="/" className="brand">
            WorthTheCredit
          </Link>
        </header>
        <main className="site-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

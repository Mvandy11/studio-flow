import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './styles/cinematic.css'
import Home from './pages/Home.jsx'
import Feed from './pages/Feed.jsx'
import CreatorProfile from './pages/CreatorProfile.jsx'
import SessionPage from './pages/SessionPage.jsx'
import CreateSession from './pages/CreateSession.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <header>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/feed">Feed</Link>
          <Link to="/create-session">Create Session</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/creator/:id" element={<CreatorProfile />} />
          <Route path="/session/:id" element={<SessionPage />} />
          <Route path="/create-session" element={<CreateSession />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

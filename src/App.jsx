import './styles/cinematic.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Feed from './pages/Feed';
import ProfilePage from './pages/Profile';
import SessionPage from './pages/SessionPage';
import Studio from './pages/Studio';
import StudioSessions from './pages/StudioSessions';
import SessionEditor from './pages/SessionEditor';
import PremierSettings from './pages/PremierSettings';
import EventPage from './pages/events/EventPage';
import PurchasePage from './pages/events/PurchasePage';
import CreateEventPage from './pages/events/CreateEventPage';
import StagePage from './pages/stage/StagePage';
// Dev-mode pages (TypeScript, mock data, no real Supabase)
import Dashboard from './pages/Dashboard.tsx';
import DevSessionEditor from './pages/SessionEditor.tsx';
import DevFeed from './pages/Feed.tsx';
import DevChat from './pages/Chat.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/session/:id" element={<SessionPage />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/studio/sessions" element={<StudioSessions />} />
          <Route path="/studio/session/:id/edit" element={<SessionEditor />} />
          <Route path="/premier/settings" element={<PremierSettings />} />
          <Route path="/events/create" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<EventPage />} />
          <Route path="/events/:eventId/purchase" element={<PurchasePage />} />
          <Route path="/stage/:stageRoomId" element={<StagePage />} />
          {/* ── Dev Mode routes (mock data, no real Supabase) ── */}
          <Route path="/dev" element={<Dashboard />} />
          <Route path="/dev/feed" element={<DevFeed />} />
          <Route path="/dev/session/:id/edit" element={<DevSessionEditor />} />
          <Route path="/dev/chat/:sessionId" element={<DevChat />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

import './styles/cinematic.css';
import './styles/components.css';
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
import EventsPage from './pages/events/EventsPage';
import EventPage from './pages/events/EventPage';
import EventDetailsPage from './pages/events/EventDetailsPage';
import PurchasePage from './pages/events/PurchasePage';
import CreateEventPage from './pages/events/CreateEventPage';
import StagePage from './pages/stage/StagePage';
import Success from './pages/Success.jsx';
import Cancel from './pages/Cancel.jsx';
import PaymentSuccess from './pages/PaymentSuccess.jsx';
import CreatorAcademy from './pages/CreatorAcademy';
import Tools from './pages/Tools';
import { DenoiseToolPage } from './features/ai-denoise';
import UpscalePage from './pages/UpscalePage';
import EnhancePage from './pages/EnhancePage';
import ContestsPage from './pages/contests/ContestsPage';
import ContestDetailPage from './pages/contests/ContestDetailPage';
import CreateContestPage from './pages/contests/CreateContestPage';
import AdminDashboard from './pages/AdminDashboard';
import EarningsDashboard from './pages/EarningsDashboard';
import CreatorProfile from './pages/CreatorProfile';
import AnnouncementsPage from './pages/AnnouncementsPage';
import LoginPage from './pages/LoginPage';
import EducationPage from './pages/Education';
import EventSlotUpload from './pages/EventSlotUpload';
import CustomEventRequestPage from './pages/CustomEventRequestPage';
import SubmissionsPage from './pages/SubmissionsPage';
import EventSlotView from './pages/EventSlotView';
import SubscriptionPage from './pages/Subscription';
import AdminEventRequests from './pages/AdminEventRequests';
import Dashboard from './pages/Dashboard.tsx';
import DevSessionEditor from './pages/SessionEditor.tsx';
import DevFeed from './pages/Feed.tsx';
import DevChat from './pages/Chat.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* ── Core ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/profile" element={<CreatorProfile />} />
          <Route path="/profile/:id" element={<CreatorProfile />} />
          <Route path="/session/:id" element={<SessionPage />} />

          {/* ── Studio ── */}
          <Route path="/studio" element={<Studio />} />
          <Route path="/studio/sessions" element={<StudioSessions />} />
          <Route path="/studio/session/:id/edit" element={<SessionEditor />} />
          <Route path="/premier/settings" element={<PremierSettings />} />

          {/* ── Events ── */}
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/create" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/events/:eventId/purchase" element={<PurchasePage />} />
          <Route path="/stage/:stageRoomId" element={<StagePage />} />

          {/* ── AI Tools ── */}
          <Route path="/tools" element={<Tools />} />
          <Route path="/tools/denoise" element={<DenoiseToolPage />} />
          <Route path="/tools/upscale" element={<UpscalePage />} />
          <Route path="/tools/enhance" element={<EnhancePage />} />

          {/* ── Contests ── */}
          <Route path="/contests" element={<ContestsPage />} />
          <Route path="/contests/create" element={<CreateContestPage />} />
          <Route path="/contests/:id" element={<ContestDetailPage />} />

          {/* ── Academy ── */}
          <Route path="/creator-academy" element={<CreatorAcademy />} />
          <Route path="/academy" element={<CreatorAcademy />} />

          {/* ── Community ── */}
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/education"              element={<EducationPage />} />
          <Route path="/event-slot/:slotId"     element={<EventSlotUpload />} />
          <Route path="/event-view/:slotId"     element={<EventSlotView />} />
          <Route path="/custom-event-request"   element={<CustomEventRequestPage />} />
          <Route path="/submissions"            element={<SubmissionsPage />} />
          <Route path="/subscription"           element={<SubscriptionPage />} />
          <Route path="/admin/event-requests"   element={<AdminEventRequests />} />

          {/* ── Account ── */}
          <Route path="/earnings" element={<EarningsDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* ── Stripe callbacks ── */}
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<Cancel />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />

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

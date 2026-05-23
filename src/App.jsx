import './styles/cinematic.css';
import './styles/components.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Feed from './pages/Feed';
import SessionPage from './pages/SessionPage';
import Studio from './pages/Studio';
import StudioSessions from './pages/StudioSessions';
import SessionEditor from './pages/SessionEditor';
import PremierSettings from './pages/PremierSettings';
import PayoutSettings from './pages/PayoutSettings';
import EventsPage from './pages/events/EventsPage';
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
import AdminErrorsDashboard from './pages/admin/AdminErrorsDashboard';
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
import AdminWinnersDashboard from './pages/AdminWinnersDashboard';
import AdminAnalyticsDashboard from './pages/AdminAnalyticsDashboard';
import Dashboard from './pages/Dashboard.tsx';
import DevSessionEditor from './pages/SessionEditor.tsx';
import DevFeed from './pages/Feed.tsx';
import DevChat from './pages/Chat.tsx';
import FreeChatPage from './pages/FreeChatPage';
import MembershipPage from './pages/MembershipPage';
import MembershipSuccess from './pages/MembershipSuccess';
import ChatPage from './pages/ChatPage';
import NewEventPage from './pages/creator/NewEventPage';
import CreatorEventPage from './pages/creator/CreatorEventPage';
import CreatorDashboardPage from './pages/creator/CreatorDashboardPage';
import CreatorEventsPage from './pages/creator/CreatorEventsPage';
import CreatorRevenuePage from './pages/creator/CreatorRevenuePage';
import CreatorDonationsPage from './pages/creator/CreatorDonationsPage';
import MyContestEntriesPage from './pages/contests/MyContestEntriesPage';
import DonateSuccess from './pages/DonateSuccess';


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
          <Route path="/events/category/:category" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/events/:eventId/purchase" element={<PurchasePage />} />
          <Route path="/stage/:stageRoomId" element={<StagePage />} />

          {/* ── Creator Hub ── */}
          <Route path="/creator/new-event"   element={<NewEventPage />} />
          <Route path="/creator/dashboard"   element={<CreatorDashboardPage />} />
          <Route path="/creator/events"      element={<CreatorEventsPage />} />
          <Route path="/creator/revenue"     element={<CreatorRevenuePage />} />
          <Route path="/creator/donations"   element={<CreatorDonationsPage />} />
          <Route path="/event/:slotId"       element={<CreatorEventPage />} />
          <Route path="/donate/success"      element={<DonateSuccess />} />

          {/* ── Contests ── */}
          <Route path="/contests/my-entries" element={<MyContestEntriesPage />} />

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
          <Route path="/free-chat" element={<FreeChatPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/contest/:contestId" element={<ChatPage />} />
          <Route path="/education"              element={<EducationPage />} />
          <Route path="/event-slot/:slotId"     element={<EventSlotUpload />} />
          <Route path="/event-view/:slotId"     element={<EventSlotView />} />
          <Route path="/custom-event-request"   element={<Navigate to="/events" replace />} />
          <Route path="/submissions"            element={<SubmissionsPage />} />
          <Route path="/subscription"           element={<SubscriptionPage />} />
          <Route path="/membership"             element={<MembershipPage />} />
          <Route path="/membership/success"     element={<MembershipSuccess />} />
          <Route path="/admin/event-requests"   element={<AdminEventRequests />} />
          <Route path="/admin/winners"            element={<AdminWinnersDashboard />} />
          <Route path="/admin/analytics"         element={<AdminAnalyticsDashboard />} />
          <Route path="/admin/errors"            element={<AdminErrorsDashboard />} />

          {/* ── Account ── */}
          <Route path="/earnings" element={<EarningsDashboard />} />
          <Route path="/settings/payouts" element={<PayoutSettings />} />
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

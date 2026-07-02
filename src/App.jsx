import './styles/cinematic.css';
import './styles/components.css';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// ── Core pages ──
const Home                  = lazy(() => import('./pages/Home'));
const Feed                  = lazy(() => import('./pages/Feed'));
const LoginPage             = lazy(() => import('./pages/LoginPage'));
const CreatorProfile        = lazy(() => import('./pages/CreatorProfile'));

// ── Studio ──
const Studio                = lazy(() => import('./pages/Studio'));
const StudioSessions        = lazy(() => import('./pages/StudioSessions'));
const SessionEditor         = lazy(() => import('./pages/SessionEditor'));
const SessionPage           = lazy(() => import('./pages/SessionPage'));
const StagePage             = lazy(() => import('./pages/stage/StagePage'));

// ── AI Tools ──
const Tools                 = lazy(() => import('./pages/Tools'));
const DenoiseToolPage       = lazy(() => import('./features/ai-denoise/components/DenoiseToolPage'));


// ── Contests ──
const ContestsPage          = lazy(() => import('./pages/contests/ContestsPage'));
const ContestDetailPage     = lazy(() => import('./pages/contests/ContestDetailPage'));
const CreateContestPage     = lazy(() => import('./pages/contests/CreateContestPage'));
const MyContestEntriesPage  = lazy(() => import('./pages/contests/MyContestEntriesPage'));

// ── Community ──
const FreeChatPage          = lazy(() => import('./pages/FreeChatPage'));
const AnnouncementsPage     = lazy(() => import('./pages/AnnouncementsPage'));
const SubmissionsPage       = lazy(() => import('./pages/SubmissionsPage'));
const MyVideos              = lazy(() => import('./pages/MyVideos'));

// ── Creator ──
const CreatorDashboardPage  = lazy(() => import('./pages/creator/CreatorDashboardPage'));
const NewEventPage          = lazy(() => import('./pages/creator/NewEventPage'));
const CreatorEventsPage     = lazy(() => import('./pages/creator/CreatorEventsPage'));
const CreatorDonationsPage  = lazy(() => import('./pages/creator/CreatorDonationsPage'));
const CreatorRevenuePage    = lazy(() => import('./pages/creator/CreatorRevenuePage'));

// ── Membership / Earnings ──
const MembershipPage        = lazy(() => import('./pages/MembershipPage'));
const EarningsDashboard     = lazy(() => import('./pages/EarningsDashboard'));
const PremierSettings       = lazy(() => import('./pages/PremierSettings'));
const PayoutSettings        = lazy(() => import('./pages/PayoutSettings'));

// ── Admin ──
const AdminDashboard        = lazy(() => import('./pages/AdminDashboard'));
const AdminWinnersDashboard = lazy(() => import('./pages/AdminWinnersDashboard'));
const AdminAnalyticsDashboard = lazy(() => import('./pages/AdminAnalyticsDashboard'));
const AdminErrorsDashboard  = lazy(() => import('./pages/admin/AdminErrorsDashboard'));
const AdminEventRequests    = lazy(() => import('./pages/AdminEventRequests'));

// ── Payments ──
const PaymentSuccess        = lazy(() => import('./pages/PaymentSuccess'));
const Success               = lazy(() => import('./pages/Success'));
const MembershipSuccess     = lazy(() => import('./pages/MembershipSuccess'));
const DonateSuccess         = lazy(() => import('./pages/DonateSuccess'));

// ── Identity / Video Generator (AI Architect additions) ──
const CreateIdentity        = lazy(() => import('./pages/CreateIdentity'));
const VideoGenerator        = lazy(() => import('./pages/VideoGenerator'));

// ── Misc ──
const Education             = lazy(() => import('./pages/Education'));
const ChatPage              = lazy(() => import('./pages/ChatPage'));
const CustomEventRequestPage = lazy(() => import('./pages/CustomEventRequestPage'));
const EventSlotUpload       = lazy(() => import('./pages/EventSlotUpload'));
const EventSlotView         = lazy(() => import('./pages/EventSlotView'));

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#888' }}>Loading…</div>}>

          <Routes>

            {/* ── Core ── */}
            <Route path="/"        element={<Home />} />
            <Route path="/login"   element={<LoginPage />} />
            <Route path="/signup"  element={<Navigate to="/login" replace />} />
            <Route path="/upgrade" element={<Navigate to="/membership" replace />} />
            <Route path="/feed"    element={<Feed />} />
            <Route path="/profile"    element={<CreatorProfile />} />
            <Route path="/profile/:id" element={<CreatorProfile />} />

            {/* ── Studio ── */}
            <Route path="/studio"              element={<ProtectedRoute><Studio /></ProtectedRoute>} />
            <Route path="/studio/sessions"     element={<StudioSessions />} />
            <Route path="/session-editor"      element={<SessionEditor />} />
            <Route path="/session/:id"         element={<SessionPage />} />
            <Route path="/stage/:stageRoomId"  element={<StagePage />} />

            {/* ── AI Tools ── */}
            <Route path="/tools"          element={<Tools />} />
            <Route path="/tools/denoise"  element={<DenoiseToolPage />} />
            <Route path="/denoise"  element={<Navigate to="/tools/denoise" replace />} />

            {/* ── Contests ── (specific before :id) */}
            <Route path="/contests"             element={<ContestsPage />} />
            <Route path="/contests/create"      element={<CreateContestPage />} />
            <Route path="/contests/my-entries"  element={<MyContestEntriesPage />} />
            <Route path="/contests/:id"         element={<ContestDetailPage />} />

            {/* ── Community ── */}
            <Route path="/free-chat"       element={<FreeChatPage />} />
            <Route path="/announcements"   element={<AnnouncementsPage />} />
            <Route path="/generator"       element={<ProtectedRoute><VideoGenerator /></ProtectedRoute>} />
            <Route path="/my-videos"       element={<MyVideos />} />
            <Route path="/submissions"     element={<SubmissionsPage />} />
            <Route path="/chat"            element={<ChatPage />} />
            <Route path="/education"       element={<Education />} />

            {/* ── Creator ── */}
            <Route path="/creator/dashboard" element={<CreatorDashboardPage />} />
            <Route path="/creator/new-event" element={<NewEventPage />} />
            <Route path="/creator/events"    element={<CreatorEventsPage />} />
            <Route path="/creator/donations" element={<CreatorDonationsPage />} />
            <Route path="/creator/revenue"   element={<CreatorRevenuePage />} />
            <Route path="/custom-event-request" element={<CustomEventRequestPage />} />
            <Route path="/event-slot/upload"    element={<EventSlotUpload />} />
            <Route path="/event-slot/view"      element={<EventSlotView />} />

            {/* ── Membership / Earnings ── */}
            <Route path="/membership"       element={<ProtectedRoute><MembershipPage /></ProtectedRoute>} />
            <Route path="/earnings"         element={<ProtectedRoute><EarningsDashboard /></ProtectedRoute>} />
            <Route path="/premier-settings" element={<PremierSettings />} />
            <Route path="/payout-settings"  element={<PayoutSettings />} />

            {/* ── Admin ── */}
            <Route path="/admin"            element={<AdminDashboard />} />
            <Route path="/admin/winners"    element={<AdminWinnersDashboard />} />
            <Route path="/admin/analytics"  element={<AdminAnalyticsDashboard />} />
            <Route path="/admin/errors"     element={<AdminErrorsDashboard />} />
            <Route path="/admin/event-requests" element={<AdminEventRequests />} />

            {/* ── Payments ── */}
            <Route path="/payment/success"   element={<PaymentSuccess />} />
            <Route path="/membership/success" element={<MembershipSuccess />} />
            <Route path="/donate/success"    element={<DonateSuccess />} />
            <Route path="/success"           element={<Success />} />

            {/* ── AI Architect additions ── */}
            <Route path="/dashboard/identity"        element={<ProtectedRoute><CreateIdentity /></ProtectedRoute>} />
            <Route path="/dashboard/video-generator" element={<ProtectedRoute><VideoGenerator /></ProtectedRoute>} />

          </Routes>

        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

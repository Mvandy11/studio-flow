import './styles/cinematic.css';
import './styles/components.css';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

const Home                   = lazy(() => import('./pages/Home'));
const Feed                   = lazy(() => import('./pages/Feed'));
const SessionPage             = lazy(() => import('./pages/SessionPage'));
const Studio                 = lazy(() => import('./pages/Studio'));
const StudioSessions         = lazy(() => import('./pages/StudioSessions'));
const SessionEditor          = lazy(() => import('./pages/SessionEditor'));
const PremierSettings        = lazy(() => import('./pages/PremierSettings'));
const PayoutSettings         = lazy(() => import('./pages/PayoutSettings'));
const EventsPage             = lazy(() => import('./pages/events/EventsPage'));
const CategoryEventsPage     = lazy(() => import('./pages/events/CategoryEventsPage'));
const EventDetailsPage       = lazy(() => import('./pages/events/EventDetailsPage'));
const PurchasePage           = lazy(() => import('./pages/events/PurchasePage'));
const CreateEventPage        = lazy(() => import('./pages/events/CreateEventPage'));
const StagePage              = lazy(() => import('./pages/stage/StagePage'));
const Success                = lazy(() => import('./pages/Success.jsx'));
const Cancel                 = lazy(() => import('./pages/Cancel.jsx'));
const PaymentSuccess         = lazy(() => import('./pages/PaymentSuccess.jsx'));
const CreatorAcademy         = lazy(() => import('./pages/CreatorAcademy'));
const Tools                  = lazy(() => import('./pages/Tools'));
const DenoiseToolPage        = lazy(() => import('./features/ai-denoise').then(m => ({ default: m.DenoiseToolPage })));
const UpscalePage            = lazy(() => import('./pages/UpscalePage'));
const EnhancePage            = lazy(() => import('./pages/EnhancePage'));
const ContestsPage           = lazy(() => import('./pages/contests/ContestsPage'));
const ContestDetailPage      = lazy(() => import('./pages/contests/ContestDetailPage'));
const CreateContestPage      = lazy(() => import('./pages/contests/CreateContestPage'));
const AdminDashboard         = lazy(() => import('./pages/AdminDashboard'));
const AdminErrorsDashboard   = lazy(() => import('./pages/admin/AdminErrorsDashboard'));
const EarningsDashboard      = lazy(() => import('./pages/EarningsDashboard'));
const CreatorProfile         = lazy(() => import('./pages/CreatorProfile'));
const AnnouncementsPage      = lazy(() => import('./pages/AnnouncementsPage'));
const LoginPage              = lazy(() => import('./pages/LoginPage'));
const EventSlotUpload        = lazy(() => import('./pages/EventSlotUpload'));
const SubmissionsPage        = lazy(() => import('./pages/SubmissionsPage'));
const EventSlotView          = lazy(() => import('./pages/EventSlotView'));
const AdminWinnersDashboard  = lazy(() => import('./pages/AdminWinnersDashboard'));
const AdminAnalyticsDashboard = lazy(() => import('./pages/AdminAnalyticsDashboard'));
const Dashboard              = lazy(() => import('./pages/Dashboard.tsx'));
const DevSessionEditor       = lazy(() => import('./pages/SessionEditor.tsx'));
const DevFeed                = lazy(() => import('./pages/Feed.tsx'));
const DevChat                = lazy(() => import('./pages/Chat.tsx'));
const FreeChatPage           = lazy(() => import('./pages/FreeChatPage'));
const MembershipPage         = lazy(() => import('./pages/MembershipPage'));
const MembershipSuccess      = lazy(() => import('./pages/MembershipSuccess'));
const ChatPage               = lazy(() => import('./pages/ChatPage'));
const NewEventPage           = lazy(() => import('./pages/creator/NewEventPage'));
const CreatorEventPage       = lazy(() => import('./pages/creator/CreatorEventPage'));
const CreatorDashboardPage   = lazy(() => import('./pages/creator/CreatorDashboardPage'));
const CreatorEventsPage      = lazy(() => import('./pages/creator/CreatorEventsPage'));
const CreatorRevenuePage     = lazy(() => import('./pages/creator/CreatorRevenuePage'));
const CreatorDonationsPage   = lazy(() => import('./pages/creator/CreatorDonationsPage'));
const MyContestEntriesPage   = lazy(() => import('./pages/contests/MyContestEntriesPage'));
const DonateSuccess          = lazy(() => import('./pages/DonateSuccess'));
const TestFounding           = lazy(() => import('./pages/TestFounding'));

const PageLoader = (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8' }}>
    Loading...
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={PageLoader}>
          <Routes>
            {/* ── Core ── */}
            <Route path="/login"      element={<LoginPage />} />
            <Route path="/"           element={<Home />} />
            <Route path="/feed"       element={<Feed />} />
            <Route path="/profile"    element={<CreatorProfile />} />
            <Route path="/profile/:id" element={<CreatorProfile />} />
            <Route path="/session/:id" element={<SessionPage />} />

            {/* ── Studio ── */}
            <Route path="/studio"                    element={<Studio />} />
            <Route path="/studio/sessions"           element={<StudioSessions />} />
            <Route path="/studio/session/:id/edit"   element={<SessionEditor />} />
            <Route path="/premier/settings"          element={<PremierSettings />} />

            {/* ── Events ── */}
            <Route path="/events"                     element={<EventsPage />} />
            <Route path="/events/create"              element={<CreateEventPage />} />
            <Route path="/events/view/:id"            element={<EventDetailsPage />} />
            <Route path="/events/view/:id/purchase"   element={<PurchasePage />} />
            <Route path="/events/:category"           element={<CategoryEventsPage />} />
            <Route path="/stage/:stageRoomId"         element={<StagePage />} />

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
            <Route path="/contests"            element={<ContestsPage />} />
            <Route path="/contests/create"     element={<CreateContestPage />} />
            <Route path="/contests/:id"        element={<ContestDetailPage />} />

            {/* ── AI Tools ── */}
            <Route path="/ai-tools"      element={<Navigate to="/tools" replace />} />
            <Route path="/tools"         element={<Tools />} />
            <Route path="/tools/denoise" element={<DenoiseToolPage />} />
            <Route path="/tools/upscale" element={<UpscalePage />} />
            <Route path="/tools/enhance" element={<EnhancePage />} />

            {/* ── Academy ── */}
            <Route path="/creator-academy" element={<CreatorAcademy />} />
            <Route path="/academy"         element={<CreatorAcademy />} />

            {/* ── Community ── */}
            <Route path="/announcements"            element={<AnnouncementsPage />} />
            <Route path="/free-chat"                element={<FreeChatPage />} />
            <Route path="/chat"                     element={<ChatPage />} />
            <Route path="/chat/contest/:contestId"  element={<ChatPage />} />
            <Route path="/education"                element={<Navigate to="/events" replace />} />
            <Route path="/custom-event-request"     element={<Navigate to="/events" replace />} />
            <Route path="/event-slot/:slotId"       element={<EventSlotUpload />} />
            <Route path="/event-view/:slotId"       element={<EventSlotView />} />
            <Route path="/submissions"              element={<SubmissionsPage />} />
            <Route path="/subscription"             element={<Navigate to="/membership" replace />} />
            <Route path="/membership"               element={<MembershipPage />} />
            <Route path="/membership/success"       element={<MembershipSuccess />} />
            <Route path="/admin/event-requests"     element={<Navigate to="/admin" replace />} />
            <Route path="/admin/winners"            element={<AdminWinnersDashboard />} />
            <Route path="/admin/analytics"          element={<AdminAnalyticsDashboard />} />
            <Route path="/admin/errors"             element={<AdminErrorsDashboard />} />

            {/* ── Account ── */}
            <Route path="/earnings"         element={<EarningsDashboard />} />
            <Route path="/settings/payouts" element={<PayoutSettings />} />
            <Route path="/admin"            element={<AdminDashboard />} />

            {/* ── Stripe callbacks ── */}
            <Route path="/success"         element={<Success />} />
            <Route path="/cancel"          element={<Cancel />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />

            {/* ── Hidden test pages ── */}
            <Route path="/test-founding" element={<TestFounding />} />

            {/* ── Dev Mode routes ── */}
            <Route path="/dev"                  element={<Dashboard />} />
            <Route path="/dev/feed"             element={<DevFeed />} />
            <Route path="/dev/session/:id/edit" element={<DevSessionEditor />} />
            <Route path="/dev/chat/:sessionId"  element={<DevChat />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

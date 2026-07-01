import './styles/cinematic.css';
import './styles/components.css';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// ── Lazy-loaded pages ──
const Home             = lazy(() => import('./pages/Home'));
const Feed             = lazy(() => import('./pages/Feed'));
const Dashboard        = lazy(() => import('./pages/Dashboard'));
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const CreatorProfile   = lazy(() => import('./pages/CreatorProfile'));
const ChatPage         = lazy(() => import('./pages/ChatPage'));
const Education        = lazy(() => import('./pages/Education'));
const Success          = lazy(() => import('./pages/Success'));
const SessionEditor    = lazy(() => import('./pages/SessionEditor'));
const Studio           = lazy(() => import('./pages/Studio'));
const Tools            = lazy(() => import('./pages/Tools'));
const Upscale          = lazy(() => import('./pages/UpscalePage'));
const EnhancePage      = lazy(() => import('./pages/EnhancePage'));
const ContestsPage     = lazy(() => import('./pages/contests/ContestsPage'));
const PaymentSuccess   = lazy(() => import('./pages/PaymentSuccess'));

// ⭐ Identity Engine
const CreateIdentity   = lazy(() => import('./pages/CreateIdentity'));

// ⭐ Video Generator
const VideoGenerator   = lazy(() => import('./pages/VideoGenerator'));

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<div>Loading...</div>}>

          <Routes>

            {/* ── Core ── */}
            <Route path="/"           element={<Home />} />
            <Route path="/login"      element={<LoginPage />} />
            <Route path="/signup"     element={<Navigate to="/login" replace />} />
            <Route path="/feed"       element={<Feed />} />
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/profile"    element={<CreatorProfile />} />

            {/* ⭐ ── Identity Engine ── */}
            <Route path="/dashboard/identity" element={<CreateIdentity />} />

            {/* ⭐ ── Video Generator ── */}
            <Route path="/dashboard/video-generator" element={<VideoGenerator />} />

            {/* ── Studio Tools ── */}
            <Route path="/studio"     element={<Studio />} />
            <Route path="/tools"      element={<Tools />} />
            <Route path="/upscale"    element={<Upscale />} />
            <Route path="/enhance"    element={<EnhancePage />} />
            <Route path="/contests"   element={<ContestsPage />} />

            {/* ── Chat & Education ── */}
            <Route path="/chat"       element={<ChatPage />} />
            <Route path="/education"  element={<Education />} />

            {/* ── Payments ── */}
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/success"         element={<Success />} />

            {/* ── Sessions ── */}
            <Route path="/session-editor" element={<SessionEditor />} />

          </Routes>

        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}


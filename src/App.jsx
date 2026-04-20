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
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

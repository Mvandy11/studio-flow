import './styles/cinematic.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Feed from './pages/Feed';
import ProfilePage from './pages/Profile';
import SessionPage from './pages/SessionPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/session/:id" element={<SessionPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

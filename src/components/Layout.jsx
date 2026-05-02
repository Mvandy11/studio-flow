import { useState } from 'react';
import AppSidebar from './AppSidebar';
import Navbar from './Navbar';
import '../styles/app-layout.css';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-content">
        <Navbar onHamburger={() => setSidebarOpen(true)} />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

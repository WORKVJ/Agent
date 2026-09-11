'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import AddAgentModal from '@/components/AddAgentModal';
import AddClientModal from '@/components/AddClientModal';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('agentpulse_sidebar_collapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(saved === 'true');
      }
    } catch (e) {}

    // Listen to custom window events for opening modals from child pages
    const handleOpenAgent = () => setIsAddAgentOpen(true);
    const handleOpenClient = () => setIsAddClientOpen(true);

    window.addEventListener('agentpulse:open-add-agent', handleOpenAgent);
    window.addEventListener('agentpulse:open-add-client', handleOpenClient);

    // Register PWA Service Worker for offline support & mobile installation
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker active:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    return () => {
      window.removeEventListener('agentpulse:open-add-agent', handleOpenAgent);
      window.removeEventListener('agentpulse:open-add-client', handleOpenClient);
    };
  }, [pathname]);

  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="flex-1 flex flex-col">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Collapsible Modern Left Sidebar */}
      <Sidebar
        onOpenAddAgent={() => setIsAddAgentOpen(true)}
        onOpenAddClient={() => setIsAddClientOpen(true)}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 lg:pl-64`}>
        {/* Top Header */}
        <Navbar onToggleMobile={() => setIsMobileOpen(prev => !prev)} />

        {/* Page Content */}
        <main className="flex-1 flex flex-col">{children}</main>
      </div>

      {/* Global Quick Action Modals */}
      <AddAgentModal
        isOpen={isAddAgentOpen}
        onClose={() => setIsAddAgentOpen(false)}
        onSuccess={() => {
          // Dispatch custom event so pages can re-fetch data if needed
          window.dispatchEvent(new CustomEvent('agentpulse:data-updated'));
        }}
      />

      <AddClientModal
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent('agentpulse:data-updated'));
        }}
      />
    </div>
  );
}

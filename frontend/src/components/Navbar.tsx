'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Radio,
  WifiOff,
  ShieldCheck,
  Smartphone,
  LogOut,
  ChevronRight,
  Compass,
  History,
  BarChart3,
  MapPin
} from 'lucide-react';
import { WS_BASE_URL } from '@/lib/api';

interface NavbarProps {
  onToggleMobile?: () => void;
}

export default function Navbar({ onToggleMobile }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('agentpulse_session');
      if (saved) {
        setUserSession(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, [pathname]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('agentpulse_session');
      setUserSession(null);
      router.push('/login');
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    function connect() {
      setWsStatus('connecting');
      try {
        ws = new WebSocket(WS_BASE_URL);
        ws.onopen = () => {
          setWsStatus('connected');
        };
        ws.onclose = () => {
          setWsStatus('disconnected');
          reconnectTimeout = setTimeout(connect, 3000);
        };
        ws.onerror = () => {
          setWsStatus('disconnected');
        };
      } catch (err) {
        setWsStatus('disconnected');
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  // Title mapping for top breadcrumb bar
  const getPageInfo = () => {
    if (pathname === '/') {
      return { section: 'Operations', title: 'Live Fleet Radar', icon: MapPin };
    }
    if (pathname === '/replay') {
      return { section: 'Operations', title: 'Route Replay HUD', icon: History };
    }
    if (pathname === '/analytics') {
      return { section: 'Intelligence', title: 'Visit Audits & Proofs', icon: BarChart3 };
    }
    if (pathname === '/agent') {
      return { section: 'Field Portal', title: 'Agent On-Duty & Check-In', icon: Smartphone };
    }
    return { section: 'Platform', title: 'Overview', icon: Compass };
  };

  const pageInfo = getPageInfo();
  const PageIcon = pageInfo.icon;
  const isAgent = userSession?.role === 'agent';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-7 py-3 shadow-xs">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        
        {/* Left: Mobile Menu Toggle + Breadcrumbs */}
        <div className="flex items-center gap-3">
          {onToggleMobile && (
            <button
              type="button"
              onClick={onToggleMobile}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Dynamic Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-slate-400 hidden sm:inline">{pageInfo.section}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
            <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-sm">
              <PageIcon className="w-4 h-4 text-slate-700" />
              <span>{pageInfo.title}</span>
            </div>
          </div>
        </div>

        {/* Right: Telemetry & Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* WebSocket Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            {wsStatus === 'connected' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="font-mono text-[11px] font-medium text-slate-600 hidden sm:inline">Live</span>
              </>
            ) : wsStatus === 'connecting' ? (
              <>
                <Radio className="w-3 h-3 text-amber-500 animate-spin" />
                <span className="font-mono text-[11px] font-medium text-slate-500 hidden sm:inline">Connecting</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-500" />
                <span className="font-mono text-[11px] font-medium text-rose-600 hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          {/* Quick simulator shortcut if manager */}
          {!isAgent && pathname !== '/agent' && (
            <Link
              href="/agent"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-medium shadow-2xs transition-all"
            >
              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
              <span>Simulate Agent</span>
            </Link>
          )}

          {/* User Profile Pill */}
          {userSession && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-1 pr-2">
              <div className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {isAgent ? <Smartphone className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                  {userSession.user?.name || userSession.user?.username}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  {isAgent ? userSession.agent?.employee_id || 'Agent' : 'HQ Admin'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Log Out"
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-0.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

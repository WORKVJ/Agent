'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Navigation,
  MapPin,
  History,
  BarChart3,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  PlusCircle,
  LogOut,
  ShieldCheck,
  Building2,
  Activity,
  Layers,
  Users
} from 'lucide-react';

interface SidebarProps {
  onOpenAddAgent?: () => void;
  onOpenAddClient?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  highlight?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function Sidebar({
  onOpenAddAgent,
  onOpenAddClient,
  isOpenMobile = false,
  onCloseMobile
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('agentpulse_session');
      if (saved) {
        setUserSession(JSON.parse(saved));
      }
      const savedCollapsed = localStorage.getItem('agentpulse_sidebar_collapsed');
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === 'true');
      }
    } catch (e) {
      console.error(e);
    }
  }, [pathname]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('agentpulse_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('agentpulse_session');
      setUserSession(null);
      router.push('/login');
    } catch (e) {
      console.error(e);
    }
  };

  // If on /login, hide sidebar completely
  if (pathname === '/login') {
    return null;
  }

  const isAgent = userSession?.role === 'agent';

  const navSections: NavSection[] = isAgent
    ? [
        {
          title: 'Field Operations',
          items: [
            { label: 'Field Agent App', href: '/agent', icon: Smartphone, highlight: true }
          ]
        }
      ]
    : [
        {
          title: 'Fleet Operations',
          items: [
            { label: 'Live Operations Radar', href: '/', icon: MapPin },
            { label: 'Fleet Agents & Users', href: '/users', icon: Users },
            { label: 'Route Replay HUD', href: '/replay', icon: History },
            { label: 'Visit Audits & Proofs', href: '/analytics', icon: BarChart3 }
          ]
        },
        {
          title: 'Field Access',
          items: [
            { label: 'Field Agent Mobile View', href: '/agent', icon: Smartphone, highlight: true }
          ]
        }
      ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200/90 shadow-sm transition-all duration-300 flex flex-col ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isOpenMobile
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 shrink-0">
          <Link
            href={isAgent ? '/agent' : '/'}
            className={`flex items-center gap-2.5 overflow-hidden transition-all ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Navigation className="w-4 h-4 text-white" />
            </div>

            {!isCollapsed && (
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-slate-900">
                    AgentPulse
                  </span>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    HQ
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Operations</p>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              title="Collapse Sidebar"
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed Re-expand Button */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center pt-2 pb-1">
            <button
              type="button"
              onClick={toggleCollapse}
              title="Expand Sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Action Hub (Only for Admin/Managers) */}
        {!isAgent && (
          <div className="p-3 border-b border-slate-100 space-y-1.5 shrink-0">
            <div className={`space-y-1.5 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  if (onOpenAddAgent) onOpenAddAgent();
                  if (onCloseMobile) onCloseMobile();
                }}
                title="Register New Field Agent"
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer ${
                  isCollapsed ? 'p-2.5 w-10 h-10' : ''
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span>+ Add Field Agent</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenAddClient) onOpenAddClient();
                  if (onCloseMobile) onCloseMobile();
                }}
                title="Add Client Target & Geofence"
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer ${
                  isCollapsed ? 'p-2.5 w-10 h-10' : ''
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                {!isCollapsed && <span>+ Add Client Store</span>}
              </button>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isCollapsed ? 'justify-center px-2' : ''
                      } ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : item.highlight ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      />
                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between">
                          <span className="truncate">{item.label}</span>
                          {item.highlight && !isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom User Profile & Log Out */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0">
          <div
            className={`flex items-center justify-between rounded-xl p-2 bg-white border border-slate-200/80 shadow-xs ${
              isCollapsed ? 'flex-col gap-2 p-1.5' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className={`w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                  isAgent ? 'bg-emerald-600' : 'bg-blue-600'
                }`}
              >
                {isAgent ? (
                  <Smartphone className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
              </div>
              {!isCollapsed && (
                <div className="leading-tight truncate">
                  <div className="font-bold text-xs text-slate-800 truncate">
                    {userSession?.user?.name || userSession?.user?.username || 'Administrator'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">
                    {isAgent ? userSession?.agent?.employee_id || 'Field Agent' : 'HQ Manager'}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

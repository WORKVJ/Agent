'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, ShieldCheck } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    setIsChecking(true);
    let session = null;

    try {
      const stored = localStorage.getItem('agentpulse_session');
      if (stored) {
        session = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse session:', e);
    }

    // 1. If currently on /login
    if (pathname === '/login') {
      if (session && session.role) {
        // Already logged in: redirect to their respective home
        if (session.role === 'admin') {
          router.replace('/');
        } else {
          router.replace('/agent');
        }
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
      setIsChecking(false);
      return;
    }

    // 2. If on a protected route without a session
    if (!session || !session.role) {
      setIsAuthorized(false);
      setIsChecking(false);
      router.replace('/login');
      return;
    }

    // 3. Role-based restrictions: Field Agents cannot view Admin Command Center
    if (session.role === 'agent' && pathname !== '/agent') {
      setIsAuthorized(false);
      setIsChecking(false);
      router.replace('/agent');
      return;
    }

    // 4. Authorized
    setIsAuthorized(true);
    setIsChecking(false);
  }, [pathname, router]);

  // Loading state while verifying credentials
  if (isChecking || !isAuthorized) {
    if (pathname === '/login' && isAuthorized) {
      return <>{children}</>;
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] p-6 space-y-4">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 shadow-sm">
          <div className="w-8 h-8 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          <Lock className="w-4 h-4 text-blue-600 absolute" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-slate-800">Verifying Authorization</h3>
          <p className="text-xs text-slate-400">Strict login protection enabled. Checking session credentials...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

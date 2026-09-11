'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Navigation,
  ShieldCheck,
  Smartphone,
  KeyRound,
  User,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock
} from 'lucide-react';
import { loginUser } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'agent'>('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('AdminPassword123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // When tab changes, prefill demo credentials for convenience
  const handleRoleTabChange = (role: 'admin' | 'agent') => {
    setSelectedRole(role);
    setErrorMessage('');
    setSuccessMessage('');
    if (role === 'admin') {
      setUsername('admin');
      setPassword('AdminPassword123!');
    } else {
      setUsername('agent_sarah');
      setPassword('AgentPassword123!');
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await loginUser(username, password);
      setSuccessMessage(`Login successful as ${res.user.name} (${res.role.toUpperCase()})`);

      // Store auth session in localStorage
      localStorage.setItem('agentpulse_session', JSON.stringify({
        role: res.role,
        user: res.user,
        agent: res.agent || null,
        loginTime: new Date().toISOString()
      }));

      // Redirect according to role
      setTimeout(() => {
        if (res.role === 'admin') {
          router.push('/');
        } else {
          router.push('/agent');
        }
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-click test login helpers
  const handleQuickLogin = (role: 'admin' | 'agent', u: string, p: string) => {
    setSelectedRole(role);
    setUsername(u);
    setPassword(p);
    setErrorMessage('');

    setTimeout(() => {
      loginWithCredentials(u, p);
    }, 100);
  };

  const loginWithCredentials = async (u: string, p: string) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await loginUser(u, p);
      setSuccessMessage(`Authenticated as ${res.user.name}! Redirecting...`);
      localStorage.setItem('agentpulse_session', JSON.stringify({
        role: res.role,
        user: res.user,
        agent: res.agent || null,
        loginTime: new Date().toISOString()
      }));

      setTimeout(() => {
        if (res.role === 'admin') {
          router.push('/');
        } else {
          router.push('/agent');
        }
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-slate-50 to-blue-50/40">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 shadow-lg shadow-blue-500/25 p-0.5 mb-2">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Navigation className="w-7 h-7 text-blue-600 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              AgentPulse
            </h1>
            <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              HQ v2.0
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Field Operations &amp; Real-Time Tracking Authentication
          </p>
        </div>

        {/* Role Switcher Tabs */}
        <div className="bg-slate-200/80 p-1.5 rounded-2xl grid grid-cols-2 gap-1.5 border border-slate-300/80 shadow-inner">
          <button
            type="button"
            onClick={() => handleRoleTabChange('admin')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              selectedRole === 'admin'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/90'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Admin HQ</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleTabChange('agent')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              selectedRole === 'agent'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/90'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Field Agent</span>
          </button>
        </div>

        {/* Main Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {selectedRole === 'admin' ? 'Administrator Portal' : 'Field Agent Access'}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedRole === 'admin'
                  ? 'Access live radar, route replay, fleet analytics & user management'
                  : 'On-duty GPS tracker, 50m selfie check-in, stopwatch & notes'}
              </p>
            </div>
            <div className={`p-2 rounded-xl ${selectedRole === 'admin' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {selectedRole === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
            </div>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Login Error:</span> {errorMessage}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Success:</span> {successMessage}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {selectedRole === 'admin' ? 'Admin Username / Email' : 'Agent Username or Employee ID (e.g. AGT-101)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={selectedRole === 'admin' ? 'admin' : 'agent_sarah or AGT-101'}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                selectedRole === 'admin'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 active:scale-[0.99]'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25 active:scale-[0.99]'
              } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In as {selectedRole === 'admin' ? 'Admin' : 'Field Agent'}</span>
                </>
              )}
            </button>
          </form>

          {/* Admin Credentials Helper */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold flex items-center gap-1.5 text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Default Administrator Account:
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin', 'AdminPass123!')}
              className="w-full text-left p-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 transition-all text-xs cursor-pointer"
            >
              <div className="font-bold text-blue-900 flex items-center justify-between">
                <span>System Administrator (HQ)</span>
                <span className="text-[10px] text-blue-600 font-semibold px-2 py-0.5 rounded bg-blue-100/80">Superuser</span>
              </div>
              <div className="text-[11px] text-slate-600 font-mono mt-1">Username: <strong>admin</strong> | Password: <strong>AdminPass123!</strong></div>
            </button>
          </div>
        </div>

        {/* Django Admin Link & Backend Notice */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">Django Admin Backend</div>
              <div className="text-[11px] text-slate-500">Manage database models, add agents, client locations &amp; logs directly.</div>
            </div>
          </div>
          <a
            href="http://localhost:8000/admin/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all shrink-0 ml-2"
          >
            <span>Open</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
}

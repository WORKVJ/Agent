'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  User,
  UserPlus,
  ShieldCheck,
  Smartphone,
  Search,
  Phone,
  Mail,
  MapPin,
  Battery,
  BatteryWarning,
  Gauge,
  ExternalLink,
  Store,
  Clock,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Key,
  Trash2,
  Lock,
  Check,
  Sparkles,
  ChevronRight,
  Shield,
  Activity,
  Compass
} from 'lucide-react';
import { fetchAgents, deleteAgent, updateAgent, Agent } from '@/lib/api';

export default function UsersDirectoryPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON_DUTY' | 'CHECKED_IN' | 'OFF_DUTY'>('ALL');
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<Agent | null>(null);
  const [userSession, setUserSession] = useState<any>(null);

  // Password Reset State
  const [changePasswordModalAgent, setChangePasswordModalAgent] = useState<Agent | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Delete Confirm State
  const [deleteConfirmAgent, setDeleteConfirmAgent] = useState<Agent | null>(null);

  // Action status feedback
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAgents();
      setAgents(data);
    } catch (e) {
      console.error('Failed to load agents:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    try {
      const saved = localStorage.getItem('agentpulse_session');
      if (saved) {
        setUserSession(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to parse session:', e);
    }
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePasswordModalAgent) return;
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      setActionMessage({ type: 'error', text: 'Password must be at least 4 characters.' });
      return;
    }

    setIsUpdating(true);
    setActionMessage(null);
    try {
      await updateAgent(changePasswordModalAgent.id, { password: newPasswordInput.trim() });
      setActionMessage({
        type: 'success',
        text: `Password successfully updated for ${changePasswordModalAgent.full_name} (${changePasswordModalAgent.user.username})!`
      });
      setTimeout(() => {
        setChangePasswordModalAgent(null);
        setNewPasswordInput('');
        setActionMessage(null);
      }, 1400);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAgent = async (agentId: number) => {
    setIsUpdating(true);
    setActionMessage(null);
    try {
      await deleteAgent(agentId);
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      if (selectedAgentDetails?.id === agentId) {
        setSelectedAgentDetails(null);
      }
      setActionMessage({
        type: 'success',
        text: `Agent ${deleteConfirmAgent?.full_name} was removed from the fleet.`
      });
      setTimeout(() => {
        setDeleteConfirmAgent(null);
        setActionMessage(null);
      }, 1200);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete agent.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredAgents = agents.filter((agent) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      agent.full_name.toLowerCase().includes(term) ||
      agent.employee_id.toLowerCase().includes(term) ||
      agent.user.username.toLowerCase().includes(term) ||
      (agent.phone_number && agent.phone_number.includes(term)) ||
      (agent.user.email && agent.user.email.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'ON_DUTY') return agent.is_on_duty;
    if (statusFilter === 'CHECKED_IN') return agent.current_status === 'CHECKED_IN';
    if (statusFilter === 'OFF_DUTY') return !agent.is_on_duty;
    return true;
  });

  const onDutyCount = agents.filter((a) => a.is_on_duty).length;
  const inVisitCount = agents.filter((a) => a.current_status === 'CHECKED_IN').length;
  const offDutyCount = agents.length - onDutyCount;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Workforce IAM Directory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Fleet Agents & User Accounts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Centralized workforce management. View credentials, reset passwords, inspect live telemetry, and control field agent access.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={loadAgents}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-2xs hover:shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('agentpulse:open-add-agent'))}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-blue-500/25 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Field Agent</span>
          </button>
        </div>
      </div>

      {/* Modern Admin Identity Card */}
      <div className="gradient-card-dark rounded-3xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Subtle Decorative Ambient Background Glows */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 border-2 border-white/20 flex items-center justify-center text-white shadow-lg">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                  {userSession?.user?.name || userSession?.user?.username || 'System Administrator'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold uppercase tracking-wider">
                  HQ Admin Account
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Primary
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Logged in as <span className="font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-300/20">{userSession?.user?.username || 'admin'}</span> • Full system privilege to configure fleet tracking, credentials, and visit audits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs self-start lg:self-auto shrink-0">
            <div className="bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 space-y-0.5">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Role Access</span>
              <span className="font-bold text-emerald-400 text-xs">HQ Superuser</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 space-y-0.5">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Total Agents</span>
              <span className="font-bold text-white text-xs font-mono">{agents.length} Registered</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Accounts</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {agents.length + 1}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>1 HQ Admin + {agents.length} Field Agent{agents.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active On-Duty</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
            {onDutyCount}
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Streaming live GPS telemetry</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Client Visits</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-cyan-600 font-mono tracking-tight">
            {inVisitCount}
          </div>
          <div className="mt-2 text-[11px] text-cyan-700 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            <span>Inside verified customer geofence</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Off-Duty Agents</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-700 font-mono tracking-tight">
            {offDutyCount}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Tracking paused for agent privacy</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4">
        {/* Search and Filters Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, username, employee badge, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 shadow-2xs transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'ALL', label: 'All Fleet', count: agents.length },
              { id: 'ON_DUTY', label: 'On-Duty', count: onDutyCount },
              { id: 'CHECKED_IN', label: 'In Visit', count: inVisitCount },
              { id: 'OFF_DUTY', label: 'Off-Duty', count: offDutyCount }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  statusFilter === tab.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* User Account List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">User Profile</th>
                <th className="py-3.5 px-4">Login Username</th>
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Duty Status</th>
                <th className="py-3.5 px-4">Telemetry</th>
                <th className="py-3.5 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {/* HQ Admin Row */}
              <tr className="hover:bg-blue-50/20 transition-colors bg-gradient-to-r from-blue-50/30 to-indigo-50/10">
                <td className="py-4 px-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      SA
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>System Administrator</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[9px] font-extrabold uppercase tracking-wider">
                          HQ Admin
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Headquarters Manager Account</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="font-mono font-bold text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-xl border border-blue-200/80 shadow-2xs">
                    admin
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="font-mono text-slate-500 text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded-lg">HQ-001</span>
                </td>
                <td className="py-4 px-4 text-xs text-slate-600 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>admin@agentpulse.com</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ONLINE (HQ)
                  </span>
                </td>
                <td className="py-4 px-4 text-xs text-slate-400 font-mono">
                  <span>Server Primary</span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-slate-500 text-xs font-bold px-2.5 py-1 bg-slate-100 rounded-xl">HQ Superuser</span>
                </td>
              </tr>

              {/* Field Agent Rows */}
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="text-xs font-semibold">Loading workforce fleet directory...</span>
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center px-4">
                    <div className="max-w-md mx-auto p-6 rounded-3xl border-2 border-dashed border-slate-200 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                        <UserPlus className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-slate-800">No field agents registered yet</h4>
                        <p className="text-xs text-slate-400">
                          Add your real workforce members to enable live GPS tracking, selfie punch-ins, and visit audits.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('agentpulse:open-add-agent'))}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Register First Agent</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => {
                  let statusBadge = 'bg-slate-100 text-slate-600 border-slate-200';
                  let statusDot = 'bg-slate-400';

                  if (agent.is_on_duty) {
                    if (agent.current_status === 'CHECKED_IN') {
                      statusBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                      statusDot = 'bg-blue-500';
                    } else if (agent.current_status === 'MOVING') {
                      statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      statusDot = 'bg-emerald-500 animate-pulse';
                    } else {
                      statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                      statusDot = 'bg-amber-500';
                    }
                  }

                  const isLowBattery = agent.battery_level < 30;

                  return (
                    <tr
                      key={agent.id}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                      onClick={() => setSelectedAgentDetails(agent)}
                    >
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:border-blue-400 transition-colors">
                            {agent.full_name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {agent.full_name}
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">Field Workforce Agent</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
                          {agent.user.username}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-mono font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
                          {agent.employee_id}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{agent.phone_number || 'No phone'}</span>
                        </div>
                        {agent.user.email && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[150px]">{agent.user.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border flex items-center gap-1.5 w-fit ${statusBadge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                          <span>{agent.is_on_duty ? agent.current_status : 'OFF-DUTY'}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-500 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          {isLowBattery ? (
                            <BatteryWarning className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                          ) : (
                            <Battery className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span className={`font-mono font-bold text-xs ${isLowBattery ? 'text-rose-600' : 'text-slate-700'}`}>
                            {agent.battery_level}%
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono font-semibold text-slate-700">
                            {agent.last_speed > 0 ? `${agent.last_speed} km/h` : '0 km/h'}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedAgentDetails(agent)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="View Account Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setChangePasswordModalAgent(agent);
                              setNewPasswordInput('');
                              setActionMessage(null);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                            title="Change Password"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-600" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirmAgent(agent);
                              setActionMessage(null);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>

                          <Link
                            href="/"
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors cursor-pointer"
                            title="Track on Radar Map"
                          >
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Account Details Modal */}
      {selectedAgentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 font-extrabold text-base flex items-center justify-center shadow-xs">
                  {selectedAgentDetails.full_name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">{selectedAgentDetails.full_name}</h3>
                  <p className="text-xs text-blue-600 font-mono font-bold">Employee Badge: {selectedAgentDetails.employee_id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgentDetails(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Credentials & Profile Information */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Account Credentials & Contact</h4>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Login Username</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedAgentDetails.user.username}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Employee ID</span>
                  <span className="font-mono font-extrabold text-blue-600 text-sm">{selectedAgentDetails.employee_id}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Phone Number</span>
                  <span className="font-bold text-slate-900">{selectedAgentDetails.phone_number || 'Not provided'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Email Address</span>
                  <span className="font-medium text-slate-800 truncate block">{selectedAgentDetails.user.email || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Duty & Live Telemetry Information */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Duty & Telemetry Status</h4>
              <div className="grid grid-cols-3 gap-2.5 text-xs text-center">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Shift Duty</span>
                  <span className={`font-extrabold text-xs ${selectedAgentDetails.is_on_duty ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {selectedAgentDetails.is_on_duty ? 'ON-DUTY' : 'OFF-DUTY'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Battery Level</span>
                  <span className="font-extrabold font-mono text-slate-900 text-xs">{selectedAgentDetails.battery_level}%</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Speed</span>
                  <span className="font-extrabold font-mono text-slate-900 text-xs">{selectedAgentDetails.last_speed} km/h</span>
                </div>
              </div>

              {selectedAgentDetails.last_latitude && selectedAgentDetails.last_longitude && (
                <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 font-medium">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Last GPS: {selectedAgentDetails.last_latitude.toFixed(5)}, {selectedAgentDetails.last_longitude.toFixed(5)}</span>
                  </div>
                  <span className="text-[10px] text-blue-700 font-mono font-bold">Live Synced</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChangePasswordModalAgent(selectedAgentDetails);
                    setNewPasswordInput('');
                    setActionMessage(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-200/70"
                >
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>Change Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmAgent(selectedAgentDetails);
                    setActionMessage(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200/70"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAgentDetails(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <Link
                  href="/"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Track on Map</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changePasswordModalAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Change Agent Password</h3>
                  <p className="text-xs text-slate-400">{changePasswordModalAgent.full_name} ({changePasswordModalAgent.user.username})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChangePasswordModalAgent(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionMessage && (
              <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{actionMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter new password (e.g. AgentPass456!)"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs font-mono text-slate-900 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  The agent can use this new password immediately to log into the mobile app.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setChangePasswordModalAgent(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {isUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Delete Field Agent Account</h3>
                  <p className="text-xs text-slate-400">Confirm permanent account deletion</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmAgent(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionMessage && (
              <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{actionMessage.text}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-xs text-slate-700 space-y-2">
              <p>
                Are you sure you want to permanently delete <span className="font-bold text-slate-900">{deleteConfirmAgent.full_name}</span>?
              </p>
              <div className="text-[11px] text-slate-600 font-mono bg-white p-2.5 rounded-xl border border-rose-100 space-y-0.5">
                <div>Username: <span className="font-bold text-slate-900">{deleteConfirmAgent.user.username}</span></div>
                <div>Employee ID: <span className="font-bold text-blue-600">{deleteConfirmAgent.employee_id}</span></div>
              </div>
              <p className="text-rose-600 text-[11px] font-medium pt-0.5">
                This will revoke all mobile login access and purge their active duty status immediately.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmAgent(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAgent(deleteConfirmAgent.id)}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                {isUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Yes, Delete Agent</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

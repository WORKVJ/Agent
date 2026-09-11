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
  LayoutGrid,
  List,
  Copy,
  CheckCheck
} from 'lucide-react';
import { fetchAgents, deleteAgent, updateAgent, Agent } from '@/lib/api';

export default function UsersDirectoryPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON_DUTY' | 'CHECKED_IN' | 'OFF_DUTY'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

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
        text: `Password updated for ${changePasswordModalAgent.full_name} (${changePasswordModalAgent.user.username})!`
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
              Workforce Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Field Agents & Workforce Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Inspect live workforce profiles, reset agent credentials, manage telemetry, and control mobile app login access.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadAgents}
            disabled={isLoading}
            className="px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-2xs hover:shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Refresh</span>
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

      {/* Modern Executive Admin Identity Card */}
      <div className="gradient-card-dark rounded-3xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 border-2 border-white/20 flex items-center justify-center text-white shadow-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
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
                  Primary Admin
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Logged in as <span className="font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-300/20">{userSession?.user?.username || 'admin'}</span> • Full system authorization to manage field agents, credentials, and visit audits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs self-start lg:self-auto shrink-0">
            <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 space-y-0.5">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">System Role</span>
              <span className="font-bold text-emerald-400 text-xs">HQ Superuser</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 space-y-0.5">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Field Fleet</span>
              <span className="font-bold text-white text-xs font-mono">{agents.length} Agent{agents.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Agents</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {agents.length}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Registered field workforce</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active On-Duty</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
            {onDutyCount}
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live GPS streaming
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Client Visits</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-3xl font-extrabold text-cyan-600 font-mono tracking-tight">
            {inVisitCount}
          </div>
          <p className="mt-1 text-[11px] text-cyan-700 font-medium">Inside client geofence</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Off-Duty Standby</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-3xl font-extrabold text-slate-700 font-mono tracking-tight">
            {offDutyCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Tracking paused</p>
        </div>
      </div>

      {/* Toolbar: Search, Filter Tabs & View Mode Switcher */}
      <div className="p-3 sm:p-4 bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by agent name, username, ID, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all"
          />
        </div>

        {/* Filters & View Switcher */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200/80 text-xs">
            {[
              { id: 'ALL', label: 'All', count: agents.length },
              { id: 'ON_DUTY', label: 'On-Duty', count: onDutyCount },
              { id: 'CHECKED_IN', label: 'In Visit', count: inVisitCount },
              { id: 'OFF_DUTY', label: 'Off-Duty', count: offDutyCount }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  statusFilter === tab.id ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Compact List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="font-bold text-sm text-slate-700">Loading workforce directory...</p>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
            <UserPlus className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-extrabold text-base text-slate-900">No field agents found</h3>
            <p className="text-xs text-slate-500">
              {searchTerm
                ? 'No agent profiles matched your search keyword. Try a different query.'
                : 'Get started by registering your first field agent to track their GPS and manage their account.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('agentpulse:open-add-agent'))}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register Field Agent</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GORGEOUS GRID CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAgents.map((agent) => {
            const isLowBattery = agent.battery_level < 30;
            let statusBorder = 'border-slate-200';
            let statusAccent = 'bg-slate-300';
            let statusDot = 'bg-slate-400';
            let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200';

            if (agent.is_on_duty) {
              if (agent.current_status === 'CHECKED_IN') {
                statusBorder = 'border-blue-300';
                statusAccent = 'bg-blue-500';
                statusDot = 'bg-blue-500';
                statusBadge = 'bg-blue-50 text-blue-700 border-blue-200';
              } else if (agent.current_status === 'MOVING') {
                statusBorder = 'border-emerald-300';
                statusAccent = 'bg-emerald-500';
                statusDot = 'bg-emerald-500 animate-pulse';
                statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              } else {
                statusBorder = 'border-amber-300';
                statusAccent = 'bg-amber-500';
                statusDot = 'bg-amber-500';
                statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
              }
            }

            return (
              <div
                key={agent.id}
                className={`bg-white rounded-3xl border ${statusBorder} shadow-sm hover:shadow-md transition-all duration-200 p-5 space-y-4 relative overflow-hidden flex flex-col justify-between hover-lift`}
              >
                {/* Top Colored Accent Stripe */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${statusAccent}`} />

                <div className="space-y-4">
                  {/* Card Header: Avatar, Name & Duty Pill */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {agent.full_name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                          {agent.full_name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-medium">Field Agent</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-xs text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded-md">
                            {agent.employee_id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border flex items-center gap-1.5 shrink-0 ${statusBadge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                      <span>{agent.is_on_duty ? agent.current_status : 'OFF-DUTY'}</span>
                    </span>
                  </div>

                  {/* Information Matrix */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Username */}
                    <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Login Username</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono font-bold text-slate-900">{agent.user.username}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(agent.user.username, `user-${agent.id}`)}
                          className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                          title="Copy Username"
                        >
                          {copiedId === `user-${agent.id}` ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Employee Badge */}
                    <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Badge ID</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono font-bold text-blue-700">{agent.employee_id}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(agent.employee_id, `badge-${agent.id}`)}
                          className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                          title="Copy Badge ID"
                        >
                          {copiedId === `badge-${agent.id}` ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 col-span-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Phone Number</span>
                      <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-800">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{agent.phone_number || 'No phone registered'}</span>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 col-span-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Email Address</span>
                      <div className="flex items-center gap-1.5 mt-1 font-medium text-slate-700 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{agent.user.email || `${agent.user.username}@company.com`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Bar */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      {isLowBattery ? (
                        <BatteryWarning className="w-4 h-4 text-rose-500 animate-pulse" />
                      ) : (
                        <Battery className="w-4 h-4 text-emerald-600" />
                      )}
                      <span className={`font-mono font-bold ${isLowBattery ? 'text-rose-600' : 'text-slate-800'}`}>
                        {agent.battery_level}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                      <Gauge className="w-3.5 h-3.5 text-slate-400" />
                      <span>{agent.last_speed > 0 ? `${agent.last_speed} km/h` : '0 km/h'}</span>
                    </div>

                    {agent.last_latitude && agent.last_longitude ? (
                      <div className="flex items-center gap-1 text-[11px] text-blue-600 font-mono">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span>{agent.last_latitude.toFixed(2)}°, {agent.last_longitude.toFixed(2)}°</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">No GPS</span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    href="/"
                    className="flex-1 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Track on Radar</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setChangePasswordModalAgent(agent);
                      setNewPasswordInput('');
                      setActionMessage(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Change Password"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmAgent(agent);
                      setActionMessage(null);
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete Agent Account"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CLEAN FULL-WIDTH LIST VIEW */
        <div className="space-y-3">
          {filteredAgents.map((agent) => {
            const isLowBattery = agent.battery_level < 30;
            let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200';
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

            return (
              <div
                key={agent.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    {agent.full_name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">{agent.full_name}</h4>
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {agent.employee_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono font-bold text-slate-800">@{agent.user.username}</span>
                      <span>•</span>
                      <span>{agent.phone_number || 'No phone'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {/* Status */}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border flex items-center gap-1.5 ${statusBadge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                    <span>{agent.is_on_duty ? agent.current_status : 'OFF-DUTY'}</span>
                  </span>

                  {/* Battery & Speed */}
                  <div className="flex items-center gap-2 text-slate-500">
                    <Battery className={`w-4 h-4 ${isLowBattery ? 'text-rose-500' : 'text-emerald-600'}`} />
                    <span className="font-mono font-bold text-slate-800">{agent.battery_level}%</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href="/"
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Radar</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setChangePasswordModalAgent(agent);
                        setNewPasswordInput('');
                        setActionMessage(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-600" />
                      <span>Password</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmAgent(agent);
                        setActionMessage(null);
                      }}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Agent"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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

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
  Check
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

  // Action status message
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
        text: `Password updated successfully for ${changePasswordModalAgent.full_name} (${changePasswordModalAgent.user.username})!`
      });
      setTimeout(() => {
        setChangePasswordModalAgent(null);
        setNewPasswordInput('');
        setActionMessage(null);
      }, 1500);
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
        text: `Agent ${deleteConfirmAgent?.full_name} was removed from the system.`
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

  return (
    <div className="flex-1 p-4 lg:p-7 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Fleet Agents & User Accounts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View, manage, delete, or reset passwords for all registered user credentials and field agents.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadAgents}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('agentpulse:open-add-agent'))}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Field Agent</span>
          </button>
        </div>
      </div>

      {/* Admin Session Banner & Quick Info */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                {userSession?.user?.name || userSession?.user?.username || 'System Administrator'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30 text-[10px] font-semibold uppercase tracking-wider">
                Current Admin Account
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Logged in as <span className="font-mono text-amber-300">{userSession?.user?.username || 'admin'}</span> • Full system access to fleet tracking & user profiles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[10px]">Access Level</span>
            <span className="font-semibold text-emerald-400">HQ Superuser</span>
          </div>
          <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[10px]">Total Fleet</span>
            <span className="font-semibold text-white">{agents.length} Agent{agents.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Accounts</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {agents.length + 1}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">1 Admin + {agents.length} Field Agent{agents.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active On-Duty</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            {onDutyCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Streaming live GPS telemetry</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>In Client Visits</span>
            <Store className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600 font-mono">
            {inVisitCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Inside verified customer geofence</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Off-Duty Agents</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700 font-mono">
            {agents.length - onDutyCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tracking paused for agent privacy</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4">
        {/* Search and Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, username, employee ID, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'ALL', label: 'All Fleet' },
              { id: 'ON_DUTY', label: 'On-Duty' },
              { id: 'CHECKED_IN', label: 'In Visit' },
              { id: 'OFF_DUTY', label: 'Off-Duty' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Account List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">User / Agent</th>
                <th className="py-3 px-4">Login Username</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Duty Status</th>
                <th className="py-3 px-4">Telemetry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {/* HQ Admin Row */}
              <tr className="hover:bg-slate-50/70 transition-colors bg-blue-50/20">
                <td className="py-3.5 px-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      SA
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>System Administrator</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[9px] font-bold uppercase">
                          HQ Admin
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">Headquarters Account</span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                    admin
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="font-mono text-slate-400 text-xs">HQ-001</span>
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>admin@agentpulse.com</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ONLINE (HQ)
                  </span>
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-400">
                  <span>Server Primary</span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="text-slate-400 text-xs font-semibold px-2 py-1">Superuser</span>
                </td>
              </tr>

              {/* Field Agent Rows */}
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading fleet user accounts...</span>
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No field agents found</p>
                    <p className="text-xs text-slate-400">Click &quot;+ Add Field Agent&quot; to register your first real agent.</p>
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => {
                  let statusBadge = 'bg-slate-100 text-slate-600 border-slate-200';
                  if (agent.is_on_duty) {
                    if (agent.current_status === 'CHECKED_IN') {
                      statusBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                    } else if (agent.current_status === 'MOVING') {
                      statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    } else {
                      statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                    }
                  }

                  const isLowBattery = agent.battery_level < 30;

                  return (
                    <tr
                      key={agent.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => setSelectedAgentDetails(agent)}
                    >
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {agent.full_name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {agent.full_name}
                            </div>
                            <span className="text-[11px] text-slate-400">Field Workforce Agent</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/80">
                          {agent.user.username}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-600">
                          {agent.employee_id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{agent.phone_number || 'No phone'}</span>
                        </div>
                        {agent.user.email && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[150px]">{agent.user.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                          {agent.is_on_duty ? agent.current_status : 'OFF-DUTY'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 space-y-1">
                        <div className="flex items-center gap-1.5">
                          {isLowBattery ? (
                            <BatteryWarning className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                          ) : (
                            <Battery className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span className={`font-mono font-medium ${isLowBattery ? 'text-rose-600 font-bold' : ''}`}>
                            {agent.battery_level}%
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono">{agent.last_speed > 0 ? `${agent.last_speed} km/h` : '0 km/h'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedAgentDetails(agent)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
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
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                            title="Change Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirmAgent(agent);
                              setActionMessage(null);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-sm flex items-center justify-center">
                  {selectedAgentDetails.full_name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{selectedAgentDetails.full_name}</h3>
                  <p className="text-xs text-blue-600 font-mono">Employee Badge: {selectedAgentDetails.employee_id}</p>
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
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Credentials & Contact</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-semibold block">Login Username</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedAgentDetails.user.username}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-semibold block">Employee ID</span>
                  <span className="font-mono font-bold text-blue-600 text-sm">{selectedAgentDetails.employee_id}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-semibold block">Phone Number</span>
                  <span className="font-bold text-slate-900">{selectedAgentDetails.phone_number || 'Not provided'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-semibold block">Email Address</span>
                  <span className="font-medium text-slate-800 truncate block">{selectedAgentDetails.user.email || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Duty & Live Telemetry Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duty & Telemetry Status</h4>
              <div className="grid grid-cols-3 gap-3 text-xs text-center">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-semibold block">Shift Duty</span>
                  <span className={`font-bold text-xs ${selectedAgentDetails.is_on_duty ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {selectedAgentDetails.is_on_duty ? 'ON-DUTY' : 'OFF-DUTY'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-semibold block">Battery Level</span>
                  <span className="font-bold font-mono text-slate-800 text-xs">{selectedAgentDetails.battery_level}%</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-semibold block">Speed</span>
                  <span className="font-bold font-mono text-slate-800 text-xs">{selectedAgentDetails.last_speed} km/h</span>
                </div>
              </div>

              {selectedAgentDetails.last_latitude && selectedAgentDetails.last_longitude && (
                <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200/70 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 font-medium">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Last GPS: {selectedAgentDetails.last_latitude.toFixed(5)}, {selectedAgentDetails.last_longitude.toFixed(5)}</span>
                  </div>
                  <span className="text-[10px] text-blue-600 font-mono">Live Sync</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChangePasswordModalAgent(selectedAgentDetails);
                    setNewPasswordInput('');
                    setActionMessage(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete User</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAgentDetails(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Change Agent Password</h3>
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
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{actionMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter new password (e.g. AgentPass456!)"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-mono text-slate-900 outline-none transition-all"
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
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Delete Field Agent Account</h3>
                  <p className="text-xs text-slate-400">Confirm permanent deletion</p>
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
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{actionMessage.text}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs text-slate-700 space-y-1.5">
              <p>
                Are you sure you want to delete <span className="font-bold text-slate-900">{deleteConfirmAgent.full_name}</span>?
              </p>
              <div className="text-[11px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-rose-100">
                Username: {deleteConfirmAgent.user.username} | Badge: {deleteConfirmAgent.employee_id}
              </div>
              <p className="text-rose-600 text-[11px] font-medium pt-1">
                This will delete the agent profile and revoke all mobile login access immediately.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmAgent(null)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
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

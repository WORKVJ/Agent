'use client';

import React, { useState } from 'react';
import type { Agent } from '@/lib/api';
import {
  Search,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Gauge,
  Store,
  Navigation,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Users,
  UserPlus,
  MapPin,
  Mail,
  User,
  Key
} from 'lucide-react';
import Link from 'next/link';

interface AgentDrawerProps {
  agents: Agent[];
  selectedAgentId: number | null;
  onSelectAgent: (agentId: number) => void;
}

export default function AgentDrawer({
  agents,
  selectedAgentId,
  onSelectAgent
}: AgentDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON_DUTY' | 'CHECKED_IN' | 'LOW_BATTERY'>('ALL');

  const filteredAgents = agents.filter(agent => {
    const matchesSearch =
      agent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.employee_id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ON_DUTY') return agent.is_on_duty;
    if (statusFilter === 'CHECKED_IN') return agent.current_status === 'CHECKED_IN';
    if (statusFilter === 'LOW_BATTERY') return agent.battery_level < 30;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <span>Field Fleet</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono font-semibold">
              {agents.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500">Live agent status & battery telemetry</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or agent ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'ON_DUTY', label: 'On-Duty' },
            { id: 'CHECKED_IN', label: 'In Visit' },
            { id: 'LOW_BATTERY', label: 'Low Battery' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
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

      {/* Agent Card List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {agents.length === 0 ? (
          <div className="text-center py-8 px-3 space-y-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">Fleet Empty</span>
            <div>
              <p className="font-bold text-xs text-slate-800">No field agents registered yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click below to add your first real field agent.</p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('agentpulse:open-add-agent'))}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <span>+ Add Field Agent</span>
            </button>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No agents found matching criteria.
          </div>
        ) : (
          filteredAgents.map((agent) => {
            const isSelected = selectedAgentId === agent.id;
            const isLowBattery = agent.battery_level < 30;

            let statusBg = 'bg-slate-100 text-slate-600 border-slate-200';
            let statusDot = 'bg-slate-400';

            if (agent.is_on_duty) {
              if (agent.current_status === 'MOVING') {
                statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                statusDot = 'bg-emerald-500 animate-pulse';
              } else if (agent.current_status === 'CHECKED_IN') {
                statusBg = 'bg-blue-50 text-blue-700 border-blue-200';
                statusDot = 'bg-blue-500';
              } else {
                statusBg = 'bg-amber-50 text-amber-700 border-amber-200';
                statusDot = 'bg-amber-500';
              }
            }

            return (
              <div
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-400 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                        {agent.full_name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusDot}`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                        {agent.full_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-mono">{agent.employee_id}</span>
                        <span>•</span>
                        <span>{agent.phone_number}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBg}`}
                  >
                    {agent.is_on_duty ? agent.current_status : 'OFF-DUTY'}
                  </span>
                </div>

                {/* Active Meeting Banner if Checked In */}
                {agent.active_visit && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 text-[11px] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-blue-900">
                        <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold truncate max-w-[150px]">
                          {agent.active_visit.client_name}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-blue-700 font-semibold shrink-0">
                        {agent.active_visit.distance_at_checkin}m
                      </span>
                    </div>

                    {/* Prominent Punch-In Time */}
                    <div className="flex items-center justify-between text-[10px] bg-white/80 px-2 py-1 rounded-md border border-blue-100">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>Punched In:</span>
                        <strong className="font-mono text-slate-900 font-bold">
                          {agent.active_visit.check_in_time
                            ? new Date(agent.active_visit.check_in_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Active'}
                        </strong>
                      </div>
                      <span className="text-emerald-700 font-bold text-[9px] uppercase">
                        ● In Progress
                      </span>
                    </div>

                    {agent.active_visit.selfie_image && (
                      <div className="flex items-center gap-2 pt-1 border-t border-blue-200/60">
                        <img
                          src={agent.active_visit.selfie_image}
                          alt="Punch-In Proof"
                          className="w-9 h-9 rounded-lg object-cover border border-blue-300 shrink-0 shadow-xs bg-black"
                        />
                        <div className="overflow-hidden">
                          <span className="text-[10px] font-bold text-emerald-700 block truncate">
                            ✓ Punch-In Verified
                          </span>
                          <span className="text-[9px] text-blue-600/80 font-mono block truncate">
                            GPS Stamp • {new Date(agent.active_visit.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Latest Completed Meeting Banner if not currently checked in */}
                {!agent.active_visit && agent.latest_visit && (
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[150px] font-semibold">{agent.latest_visit.client_name}</span>
                      </div>
                      <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {agent.latest_visit.duration_minutes ? `${agent.latest_visit.duration_minutes}m visit` : 'Completed'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                      {agent.latest_visit.selfie_image ? (
                        <img
                          src={agent.latest_visit.selfie_image}
                          alt="Punch Proof"
                          className="w-8 h-8 rounded-md object-cover border border-slate-300 shrink-0 bg-black"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-slate-200 flex items-center justify-center text-slate-500 text-[10px] shrink-0 font-bold">
                          ✓
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <span className="text-[10px] font-bold text-slate-800 block truncate">
                          Punched In: {new Date(agent.latest_visit.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {agent.latest_visit.check_out_time && (
                          <span className="text-[9px] text-slate-500 font-mono block truncate">
                            Out: {new Date(agent.latest_visit.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Telemetry Metrics: Speed & Battery */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-medium text-slate-800">
                      {agent.last_speed > 0 ? `${agent.last_speed} km/h` : '0 km/h'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isLowBattery ? (
                      <BatteryWarning className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    ) : (
                      <Battery className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            agent.battery_level > 50
                              ? 'bg-emerald-500'
                              : agent.battery_level > 20
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${agent.battery_level}%` }}
                        />
                      </div>
                      <span
                        className={`font-mono text-[11px] ${
                          isLowBattery ? 'text-rose-600 font-bold' : 'text-slate-700'
                        }`}
                      >
                        {agent.battery_level}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Account Details when selected */}
                {isSelected && (
                  <div className="mt-2.5 pt-2.5 border-t border-blue-200/80 space-y-2 text-[11px] bg-white/80 p-2.5 rounded-xl animate-in fade-in duration-150">
                    <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        Account Details
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                        Field Agent
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-600 pt-0.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Username</span>
                        <span className="font-mono font-bold text-slate-900">{agent.user.username}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Employee ID</span>
                        <span className="font-mono font-bold text-slate-900">{agent.employee_id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Phone Number</span>
                        <span className="font-medium text-slate-800">{agent.phone_number || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Email</span>
                        <span className="truncate block font-medium text-slate-800">
                          {agent.user.email || `${agent.user.username}@company.com`}
                        </span>
                      </div>
                    </div>

                    {agent.last_latitude && agent.last_longitude && (
                      <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{agent.last_latitude.toFixed(4)}°, {agent.last_longitude.toFixed(4)}°</span>
                        </span>
                        <span>{agent.last_speed} km/h</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href="/users"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        title="Change password or delete user in directory"
                      >
                        <Key className="w-3 h-3 text-amber-500" />
                        <span>Manage Password & Account →</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Footer Action */}
                <div className="mt-2 pt-2 flex items-center justify-end gap-2 text-[11px]">
                  <Link
                    href={`/replay?agentId=${agent.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors font-medium"
                  >
                    <span>Route Replay</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

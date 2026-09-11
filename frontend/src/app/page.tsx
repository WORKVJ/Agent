'use client';

import React, { useEffect, useState, useCallback } from 'react';
import LiveMap from '@/components/LiveMap';
import AgentDrawer from '@/components/AgentDrawer';
import {
  Agent,
  ClientLocation,
  fetchAgents,
  fetchClients,
  WS_BASE_URL
} from '@/lib/api';
import {
  Users,
  Activity,
  Store,
  BatteryWarning,
  Smartphone,
  RefreshCw,
  Bell,
  UserPlus,
  Building2,
  Filter,
  X
} from 'lucide-react';
import Link from 'next/link';

interface ActivityEvent {
  id: string;
  time: string;
  type: string;
  text: string;
  agentName: string;
}

type KPIFilter = 'ALL' | 'ON_DUTY' | 'CHECKED_IN' | 'LOW_BATTERY';

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<ClientLocation[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [kpiFilter, setKpiFilter] = useState<KPIFilter>('ALL');

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [agentsData, clientsData] = await Promise.all([
        fetchAgents(),
        fetchClients()
      ]);
      setAgents(agentsData);
      setClients(clientsData);
      if (agentsData.length > 0 && !selectedAgentId) {
        setSelectedAgentId(agentsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for global data updates (e.g. from AddAgentModal or AddClientModal)
  useEffect(() => {
    const handleDataUpdated = () => {
      loadData();
    };
    window.addEventListener('agentpulse:data-updated', handleDataUpdated);
    return () => {
      window.removeEventListener('agentpulse:data-updated', handleDataUpdated);
    };
  }, [loadData]);

  // Connect to Django Channels WebSocket for real-time location & event stream
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    function connectWs() {
      try {
        ws = new WebSocket(WS_BASE_URL);

        ws.onopen = () => {
          console.log('[WebSocket] Connected to /ws/location/');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[WebSocket] Broadcast received:', data);

            // Handle location ping
            if (data.event === 'location_ping') {
              setAgents((prev) =>
                prev.map((agent) => {
                  if (agent.id === data.agent_id) {
                    return {
                      ...agent,
                      last_latitude: data.latitude,
                      last_longitude: data.longitude,
                      last_speed: data.speed,
                      battery_level: data.battery_level,
                      current_status: data.status,
                      last_seen_at: data.timestamp
                    };
                  }
                  return agent;
                })
              );

              setRecentEvents((prev) => [
                {
                  id: Math.random().toString(),
                  time: new Date().toLocaleTimeString(),
                  type: 'ping',
                  text: `GPS ping: ${data.speed} km/h • Batt ${data.battery_level}%`,
                  agentName: data.agent_name || `Agent #${data.agent_id}`
                },
                ...prev.slice(0, 15)
              ]);
            }

            // Handle check-in event
            else if (data.event === 'agent_checked_in') {
              setAgents((prev) =>
                prev.map((agent) => {
                  if (agent.id === data.agent_id) {
                    return {
                      ...agent,
                      current_status: 'CHECKED_IN',
                      active_visit: {
                        id: data.visit_id,
                        client_id: data.client_id,
                        client_name: data.client_name,
                        check_in_time: data.timestamp,
                        distance_at_checkin: data.distance_meters
                      }
                    };
                  }
                  return agent;
                })
              );

              setRecentEvents((prev) => [
                {
                  id: Math.random().toString(),
                  time: new Date().toLocaleTimeString(),
                  type: 'check_in',
                  text: `Verified check-in at ${data.client_name} (${data.distance_meters.toFixed(1)}m from center)`,
                  agentName: data.agent_name
                },
                ...prev.slice(0, 15)
              ]);
            }

            // Handle check-out event
            else if (data.event === 'agent_checked_out') {
              setAgents((prev) =>
                prev.map((agent) => {
                  if (agent.id === data.agent_id) {
                    return {
                      ...agent,
                      current_status: data.status || 'IDLE',
                      active_visit: null
                    };
                  }
                  return agent;
                })
              );

              setRecentEvents((prev) => [
                {
                  id: Math.random().toString(),
                  time: new Date().toLocaleTimeString(),
                  type: 'check_out',
                  text: `Checked out from ${data.client_name}. Duration: ${data.duration_minutes}m, Order: $${data.order_value}`,
                  agentName: data.agent_name
                },
                ...prev.slice(0, 15)
              ]);
            }

            // Handle duty toggle event
            else if (data.event === 'duty_status_changed') {
              setAgents((prev) =>
                prev.map((agent) => {
                  if (agent.id === data.agent_id) {
                    return {
                      ...agent,
                      is_on_duty: data.is_on_duty,
                      current_status: data.status
                    };
                  }
                  return agent;
                })
              );
            }

            // Handle new client creation event
            else if (data.event === 'client_created') {
              fetchClients().then((cls) => setClients(cls)).catch(console.error);
            }
          } catch (e) {
            console.error('Error parsing WS frame:', e);
          }
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connectWs, 3000);
        };
      } catch (err) {
        reconnectTimer = setTimeout(connectWs, 3000);
      }
    }

    connectWs();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  // Compute KPI metrics
  const onDutyCount = agents.filter((a) => a.is_on_duty).length;
  const checkedInCount = agents.filter((a) => a.current_status === 'CHECKED_IN').length;
  const lowBatteryCount = agents.filter((a) => (a.battery_level ?? 100) < 30).length;

  // Derive filtered agents based on interactive KPI card selection
  const filteredAgents = agents.filter((agent) => {
    if (kpiFilter === 'ON_DUTY') return agent.is_on_duty;
    if (kpiFilter === 'CHECKED_IN') return agent.current_status === 'CHECKED_IN';
    if (kpiFilter === 'LOW_BATTERY') return (agent.battery_level ?? 100) < 30;
    return true;
  });

  const handleOpenAddAgent = () => {
    window.dispatchEvent(new CustomEvent('agentpulse:open-add-agent'));
  };

  const handleOpenAddClient = () => {
    window.dispatchEvent(new CustomEvent('agentpulse:open-add-client'));
  };

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Interactive Top KPI Cards with Filter Triggers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Agents KPI Card */}
        <button
          type="button"
          onClick={() => setKpiFilter('ALL')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            kpiFilter === 'ALL'
              ? 'bg-slate-50/80 border-slate-900 shadow-xs ring-1 ring-slate-900'
              : 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Fleet Agents</span>
            {kpiFilter === 'ALL' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-white">ALL</span>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{agents.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Click to view all fleet</span>
        </button>

        {/* Active On-Duty KPI Card */}
        <button
          type="button"
          onClick={() => setKpiFilter(prev => prev === 'ON_DUTY' ? 'ALL' : 'ON_DUTY')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            kpiFilter === 'ON_DUTY'
              ? 'bg-slate-50/80 border-slate-900 shadow-xs ring-1 ring-slate-900'
              : 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active On-Duty</span>
            {kpiFilter === 'ON_DUTY' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-white">FILTERED</span>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{onDutyCount}</div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block font-medium">Streaming live GPS</span>
        </button>

        {/* In-Store Visits KPI Card */}
        <button
          type="button"
          onClick={() => setKpiFilter(prev => prev === 'CHECKED_IN' ? 'ALL' : 'CHECKED_IN')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            kpiFilter === 'CHECKED_IN'
              ? 'bg-slate-50/80 border-slate-900 shadow-xs ring-1 ring-slate-900'
              : 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">In-Store Visits</span>
            {kpiFilter === 'CHECKED_IN' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-white">FILTERED</span>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{checkedInCount}</div>
          <span className="text-[11px] text-blue-600 mt-0.5 block font-medium">Inside verified geofence</span>
        </button>

        {/* Low Battery KPI Card */}
        <button
          type="button"
          onClick={() => setKpiFilter(prev => prev === 'LOW_BATTERY' ? 'ALL' : 'LOW_BATTERY')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            kpiFilter === 'LOW_BATTERY'
              ? 'bg-slate-50/80 border-slate-900 shadow-xs ring-1 ring-slate-900'
              : 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Low Battery</span>
            {kpiFilter === 'LOW_BATTERY' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-white">FILTERED</span>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{lowBatteryCount}</div>
          <span className="text-[11px] text-rose-600 mt-0.5 block font-medium">&lt; 30% battery reserve</span>
        </button>
      </div>

      {/* Main Command Center: Live Map + Agent Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-[580px]">
        {/* Interactive Map */}
        <div className="lg:col-span-2 flex flex-col space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900"></span>
              <h2 className="text-sm font-bold text-slate-900">Operational Radar</h2>
              {kpiFilter !== 'ALL' && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[11px] font-medium">
                  <Filter className="w-3 h-3 text-slate-500" />
                  <span>Showing {filteredAgents.length} of {agents.length}</span>
                  <button
                    onClick={() => setKpiFilter('ALL')}
                    className="hover:text-rose-600 ml-0.5 cursor-pointer"
                    title="Clear filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Clean Action Hub Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddAgent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
                title="Register New Field Agent"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Agent</span>
              </button>

              <button
                onClick={handleOpenAddClient}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 shadow-xs transition-all cursor-pointer"
                title="Create Geofenced Client Store Location"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>+ Add Store</span>
              </button>

              <button
                onClick={loadData}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                title="Refresh Map Data"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline font-medium">Refresh</span>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-[520px] lg:h-full min-h-[480px]">
            <LiveMap
              agents={filteredAgents}
              clients={clients}
              selectedAgentId={selectedAgentId}
              onSelectAgent={(id) => setSelectedAgentId(id)}
            />
          </div>
        </div>

        {/* Agent Fleet Drawer (Synced with filtered agents) */}
        <div className="lg:col-span-1 h-full min-h-[450px]">
          <AgentDrawer
            agents={filteredAgents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={(id) => setSelectedAgentId(id)}
          />
        </div>
      </div>

      {/* Live Operational Event Activity Stream */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs text-slate-900">Real-Time Event Stream</h3>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-semibold">
              WebSocket Pub/Sub
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Updates live without page reloads</span>
        </div>

        <div className="overflow-x-auto">
          {recentEvents.length === 0 ? (
            <div className="text-xs text-slate-400 py-3 text-center">
              Listening for field telemetry and geofence check-ins...
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentEvents.slice(0, 5).map((evt) => (
                <div key={evt.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-slate-400">{evt.time}</span>
                    <span className="font-semibold text-slate-800">{evt.agentName}:</span>
                    <span className="text-slate-600">{evt.text}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      evt.type === 'check_in'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : evt.type === 'check_out'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {evt.type.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  fetchAgents,
  fetchRouteReplay,
  Agent,
  RouteReplayData,
  RouteBreadcrumb
} from '@/lib/api';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Calendar,
  User,
  Navigation,
  Gauge,
  Battery,
  MapPin,
  Clock,
  Store,
  Compass,
  ArrowRight,
  Users,
  UserPlus
} from 'lucide-react';

export default function RouteReplayPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [replayData, setReplayData] = useState<RouteReplayData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const pathPolylineRef = useRef<any>(null);
  const activeMarkerRef = useRef<any>(null);
  const stopMarkersRef = useRef<any[]>([]);
  const visitMarkersRef = useRef<any[]>([]);

  // Load available agents
  const loadAgents = useCallback(async () => {
    try {
      const list = await fetchAgents();
      setAgents(list);
      if (list.length > 0) {
        setSelectedAgentId(prev => prev && list.some(a => a.id === prev) ? prev : list[0].id);
      } else {
        setSelectedAgentId(null);
        setReplayData(null);
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Error fetching agents:', e);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();

    const handleDataUpdated = () => loadAgents();
    window.addEventListener('agentpulse:data-updated', handleDataUpdated);
    return () => window.removeEventListener('agentpulse:data-updated', handleDataUpdated);
  }, [loadAgents]);

  // Load route data for selected agent and date
  const loadRoute = useCallback(async () => {
    if (!selectedAgentId) {
      setReplayData(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentIndex(0);
    try {
      const data = await fetchRouteReplay(selectedAgentId, selectedDate);
      setReplayData(data);
    } catch (e) {
      console.error('Error fetching route replay:', e);
      setReplayData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgentId, selectedDate]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    async function initReplayMap() {
      const L = (await import('leaflet')).default;

      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [11.8028, 76.0033],
        zoom: 14,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Clean OpenStreetMap tiles - 100% Free, no watermark, no API key needed
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    initReplayMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render Path & Static Markers when replayData loads
  useEffect(() => {
    if (!mapInstanceRef.current || !replayData) return;

    async function drawRoute() {
      const data = replayData;
      if (!data) return;

      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      if (!map) return;

      // Clean up previous layers
      if (pathPolylineRef.current) {
        map.removeLayer(pathPolylineRef.current);
      }
      stopMarkersRef.current.forEach(m => map.removeLayer(m));
      stopMarkersRef.current = [];
      visitMarkersRef.current.forEach(m => map.removeLayer(m));
      visitMarkersRef.current = [];

      const coords: [number, number][] = data.path.map(p => [p.lat, p.lng]);

      if (coords.length === 0) return;

      // Fit map bounds
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40] });

      // Draw route polyline
      const polyline = L.polyline(coords, {
        color: '#0284c7',
        weight: 4.5,
        opacity: 0.9,
        lineJoin: 'round'
      }).addTo(map);
      pathPolylineRef.current = polyline;

      // Start Marker
      const startPoint = coords[0];
      const startIcon = L.divIcon({
        className: 'start-marker',
        html: `
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 border-2 border-white shadow-md text-xs font-bold text-white">
            A
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      L.marker(startPoint, { icon: startIcon }).addTo(map).bindPopup('<div class="p-1 font-bold text-xs text-slate-900">Route Departure Point</div>');

      // End Marker
      const endPoint = coords[coords.length - 1];
      const endIcon = L.divIcon({
        className: 'end-marker',
        html: `
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 border-2 border-white shadow-md text-xs font-bold text-white">
            B
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      L.marker(endPoint, { icon: endIcon }).addTo(map).bindPopup('<div class="p-1 font-bold text-xs text-slate-900">Route Final Point</div>');

      // Verified Visit Pins
      data.visits.forEach(visit => {
        const visitIcon = L.divIcon({
          className: 'visit-pin',
          html: `
            <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 border-2 border-white shadow-md text-white font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const vMarker = L.marker([visit.check_in_latitude, visit.check_in_longitude], { icon: visitIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2 space-y-1 text-xs">
              <span class="font-bold text-sm text-slate-900">${visit.client_name}</span>
              <p class="text-slate-600">${visit.client_address}</p>
              <div class="pt-1 text-slate-600">
                <span>Check-in Distance: <strong class="text-emerald-700">${visit.distance_at_checkin}m</strong></span>
              </div>
              <div class="text-slate-600">
                <span>Order Value: <strong class="text-blue-700 font-bold">$${visit.order_value}</strong></span>
              </div>
            </div>
          `);
        visitMarkersRef.current.push(vMarker);
      });

      // Active Replaying Agent Marker
      const initialPoint = coords[0];
      const activeIcon = L.divIcon({
        className: 'active-replay-marker',
        html: `
          <div class="relative flex items-center justify-center w-11 h-11 rounded-full bg-blue-600 border-2.5 border-white shadow-xl shadow-blue-500/40">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      if (activeMarkerRef.current) {
        map.removeLayer(activeMarkerRef.current);
      }
      activeMarkerRef.current = L.marker(initialPoint, { icon: activeIcon }).addTo(map);
    }

    drawRoute();
  }, [replayData]);

  // Timeline playback timer
  useEffect(() => {
    if (!isPlaying || !replayData || replayData.path.length === 0) return;

    const intervalTime = Math.max(80, 500 / playbackSpeed);

    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= replayData.path.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, replayData, playbackSpeed]);

  // Move active marker along path and smooth-pan map as currentIndex changes
  useEffect(() => {
    if (!replayData || replayData.path.length === 0 || !activeMarkerRef.current) return;
    const currentPoint = replayData.path[currentIndex];
    if (currentPoint) {
      activeMarkerRef.current.setLatLng([currentPoint.lat, currentPoint.lng]);

      // Automatically smooth-pan the map following the agent during playback
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([currentPoint.lat, currentPoint.lng], {
          animate: true,
          duration: 0.35,
          easeLinearity: 0.25
        });
      }
    }
  }, [currentIndex, replayData]);

  const currentPoint = replayData?.path[currentIndex] || null;

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Top Header & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            <span>Interactive Route Replay</span>
          </h1>
          <p className="text-xs text-slate-500">
            Replay historical travel path, analyze transit speeds, dwell times, and verified stops
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Agent Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <User className="w-4 h-4 text-slate-500" />
            <select
              value={selectedAgentId ?? ''}
              onChange={(e) => setSelectedAgentId(e.target.value ? Number(e.target.value) : null)}
              className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer"
            >
              {agents.length === 0 ? (
                <option value="">No registered agents</option>
              ) : (
                agents.map((a) => (
                  <option key={a.id} value={a.id} className="bg-white text-slate-900">
                    {a.full_name} ({a.employee_id})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/90 shadow-sm text-center flex flex-col items-center justify-center space-y-3 my-6">
          <div className="max-w-md space-y-1.5">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold inline-block">Fleet Inactive</span>
            <h3 className="text-base font-bold text-slate-900 pt-1">No Field Agents Registered</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              There are currently no field agents in your fleet. Register your first agent to record live breadcrumbs, customer check-ins, and replay historical routes.
            </p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('agentpulse:open-add-agent'))}
            className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            + Register First Field Agent
          </button>
        </div>
      ) : (
        <>
          {/* Map + Telemetry HUD */}
          <div className="relative w-full h-[550px] rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Empty Path Notice */}
            {(!replayData || replayData.path.length === 0) && !isLoading && (
              <div className="absolute inset-0 z-[300] bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg text-center space-y-2 max-w-sm pointer-events-auto">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">No Route Points for This Date</h4>
                  <p className="text-xs text-slate-500">
                    This agent has not logged any GPS breadcrumbs on {selectedDate}.
                  </p>
                </div>
              </div>
            )}

            {/* Live Replay HUD Overlay (Top-Left) */}
            {currentPoint && (
              <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-md text-xs space-y-2 min-w-[240px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900 text-xs">{replayData?.agent_name}</span>
                  <span className="font-mono text-[11px] text-blue-600 font-semibold">{replayData?.employee_id}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Current Speed</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-sm text-slate-900">
                      <Gauge className="w-3.5 h-3.5 text-blue-600" />
                      <span>{currentPoint.speed} km/h</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Battery Gauge</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-sm text-emerald-600">
                      <Battery className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{currentPoint.battery}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="font-mono text-slate-800 font-medium">
                      {new Date(currentPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Position:</span>
                    <span className="font-mono text-slate-500 text-[10px]">
                      {currentPoint.lat.toFixed(4)}, {currentPoint.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Route Summary Badge (Top-Right) */}
            {replayData && replayData.path.length > 0 && (
              <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs hidden sm:flex items-center gap-4 shadow-md">
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Distance</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {replayData.total_distance_km} km
                  </span>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Verified Visits</span>
                  <span className="font-mono font-bold text-blue-600 text-sm">
                    {replayData.visits.length}
                  </span>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div>
                  <span className="text-[10px] text-slate-500 block">GPS Breadcrumbs</span>
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {replayData.total_points}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Timeline Player Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900">Route Timeline Scrub</span>
              </div>
              <div className="font-mono text-slate-500 text-xs font-semibold">
                Step {replayData?.path.length ? currentIndex + 1 : 0} of {replayData?.path.length || 0}
              </div>
            </div>

            {/* Timeline Slider */}
            <input
              type="range"
              min="0"
              max={replayData?.path.length ? replayData.path.length - 1 : 0}
              value={currentIndex}
              disabled={!replayData || replayData.path.length === 0}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {/* Playback Controls & Speed Multipliers */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                {/* Play / Pause */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!replayData || replayData.path.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-sm shadow-blue-500/20 transition-all"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
                </button>

                {/* Reset */}
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentIndex(0);
                  }}
                  disabled={!replayData || replayData.path.length === 0}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 hover:text-slate-900 transition-colors"
                  title="Reset to Start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Speed Multiplier */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <span className="text-slate-500 px-2 font-medium">Speed:</span>
                {[1, 2, 5, 10].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-colors ${
                      playbackSpeed === spd
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

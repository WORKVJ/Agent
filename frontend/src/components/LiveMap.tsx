'use client';

import React, { useEffect, useRef } from 'react';
import type { Agent, ClientLocation } from '@/lib/api';

interface LiveMapProps {
  agents: Agent[];
  clients: ClientLocation[];
  selectedAgentId: number | null;
  onSelectAgent: (agentId: number) => void;
}

export default function LiveMap({
  agents,
  clients,
  selectedAgentId,
  onSelectAgent
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const agentMarkersRef = useRef<Map<number, any>>(new Map());
  const clientMarkersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;

      if (!mapContainerRef.current || mapInstanceRef.current || !isMounted) return;

      const initialCenter: [number, number] = [40.7580, -73.9855];
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
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

      // Render client locations & geofences
      clientMarkersRef.current = [];
      clients.forEach(client => {
        try {
          // Geofence Circle (50m perimeter)
          const circle = L.circle([client.latitude, client.longitude], {
            radius: client.geofence_radius_meters,
            color: '#0284c7',
            weight: 1.5,
            opacity: 0.9,
            fillColor: '#38bdf8',
            fillOpacity: 0.2,
            dashArray: '4, 6'
          }).addTo(map);

          // Client Pin Marker
          const clientIcon = L.divIcon({
            className: 'custom-client-icon',
            html: `
              <div class="relative flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 border-2 border-white text-white shadow-md transform hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <div class="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-indigo-900 border border-white text-[8px] font-mono text-cyan-200 font-semibold">50m</div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
          });

          const marker = L.marker([client.latitude, client.longitude], { icon: clientIcon })
            .addTo(map)
            .bindPopup(`
              <div class="p-2 space-y-1.5 text-xs">
                <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                  <span class="font-bold text-sm text-slate-900">${client.name}</span>
                  <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-semibold border border-blue-200">Client</span>
                </div>
                <p class="text-slate-600">${client.address}</p>
                <div class="flex items-center justify-between text-slate-500 text-[11px] pt-1">
                  <span>Contact: <strong class="text-slate-800">${client.contact_person || 'N/A'}</strong></span>
                  <span class="font-mono text-blue-600 font-semibold">${client.geofence_radius_meters}m Geofence</span>
                </div>
              </div>
            `);

          clientMarkersRef.current.push({ marker, circle });
        } catch (err) {
          console.warn('Failed to add client marker:', err);
        }
      });
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
        } catch (_) {}

        agentMarkersRef.current.forEach(m => {
          try { m.remove(); } catch (_) {}
        });
        agentMarkersRef.current.clear();

        clientMarkersRef.current.forEach(item => {
          try {
            item.marker?.remove();
            item.circle?.remove();
          } catch (_) {}
        });
        clientMarkersRef.current = [];

        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, [clients]);

  // Update Agent Markers dynamically when telemetry updates
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    async function updateMarkers() {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      if (!map || !map._loaded) return;

      const currentMarkerMap = agentMarkersRef.current;
      const validAgentIds = new Set<number>();

      agents.forEach(agent => {
        if (!agent.last_latitude || !agent.last_longitude) return;
        validAgentIds.add(agent.id);

        const latLng: [number, number] = [agent.last_latitude, agent.last_longitude];

        // Status badge color and classes
        let ringClass = 'ring-gray-idle';
        let statusLabel = 'Off-Duty';
        let statusBadgeBg = 'bg-slate-100 text-slate-600 border border-slate-300';

        if (agent.is_on_duty) {
          if (agent.current_status === 'CHECKED_IN') {
            ringClass = 'ring-pulse-green';
            statusLabel = 'In-Store Meeting';
            statusBadgeBg = 'bg-emerald-50 text-emerald-700 border border-emerald-300';
          } else if (agent.current_status === 'MOVING') {
            ringClass = 'ring-blue-transit';
            statusLabel = `${agent.last_speed} km/h (In Transit)`;
            statusBadgeBg = 'bg-blue-50 text-blue-700 border border-blue-300';
          } else {
            ringClass = 'ring-gray-idle';
            statusLabel = 'Idle';
            statusBadgeBg = 'bg-amber-50 text-amber-700 border border-amber-300';
          }
        }

        const batteryColor =
          agent.battery_level > 50
            ? 'text-emerald-600'
            : agent.battery_level > 20
            ? 'text-amber-600'
            : 'text-rose-600';

        const isSelected = selectedAgentId === agent.id;

        const customIcon = L.divIcon({
          className: 'agent-pin-container',
          html: `
            <div class="relative group cursor-pointer">
              <div class="w-10 h-10 ${ringClass} font-bold text-xs ${
            isSelected ? 'scale-115 shadow-xl ring-4 ring-indigo-500' : ''
          } transition-all duration-300">
                <span>${(agent.full_name || agent.user?.username || 'A').split(' ').map((n: string) => n[0]).join('')}</span>
              </div>
              <div class="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full ${statusBadgeBg} text-[10px] font-mono font-bold whitespace-nowrap shadow-sm pointer-events-none">
                ${statusLabel}
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -22]
        });

        // Hover tooltip content
        const tooltipContent = `
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold">${agent.full_name || agent.user?.username}</span>
            <span class="text-[10px] font-mono opacity-80">(${agent.battery_level}%)</span>
          </div>
          <div class="text-[10px] mt-0.5 opacity-90">
            ${statusLabel} ${agent.active_visit ? `• ${agent.active_visit.client_name}` : ''}
          </div>
        `;

        const existingMarker = currentMarkerMap.get(agent.id);

        // Check if existing marker is still valid on this map
        if (existingMarker && existingMarker._map === map && existingMarker._icon) {
          try {
            existingMarker.setLatLng(latLng);
            existingMarker.setIcon(customIcon);
            existingMarker.setTooltipContent(tooltipContent);
          } catch (err) {
            try { existingMarker.remove(); } catch (_) {}
            currentMarkerMap.delete(agent.id);
          }
        }

        if (!currentMarkerMap.has(agent.id)) {
          try {
            const newMarker = L.marker(latLng, { icon: customIcon })
              .addTo(map)
              .bindTooltip(tooltipContent, {
                className: 'agent-hover-tooltip',
                direction: 'top',
                offset: [0, -22],
                opacity: 0.95
              })
              .bindPopup(`
                <div class="p-2 space-y-2 text-xs">
                  <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div>
                      <h4 class="font-bold text-sm text-slate-900">${agent.full_name || agent.user?.username}</h4>
                      <span class="text-[11px] font-mono text-slate-500">${agent.employee_id}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeBg}">
                      ${agent.current_status}
                    </span>
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-slate-700">
                    <div class="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span class="text-[10px] text-slate-500 block">Battery Level</span>
                      <strong class="${batteryColor} font-mono text-sm">${agent.battery_level}%</strong>
                    </div>
                    <div class="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span class="text-[10px] text-slate-500 block">Current Speed</span>
                      <strong class="text-slate-900 font-mono text-sm">${agent.last_speed} km/h</strong>
                    </div>
                  </div>
                  ${
                    agent.active_visit
                      ? `
                    <div class="bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 text-[11px]">
                      <span class="text-emerald-700 font-semibold block flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Active In-Store Visit
                      </span>
                      <span class="text-slate-900 font-medium">${agent.active_visit.client_name}</span>
                      <span class="text-slate-500 block text-[10px]">${agent.active_visit.distance_at_checkin}m from geofence center</span>
                    </div>
                  `
                      : ''
                  }
                  <button
                    id="select-agent-btn-${agent.id}"
                    class="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-xs shadow-sm transition-colors"
                  >
                    Focus & Track Agent
                  </button>
                </div>
              `);

            newMarker.on('popupopen', () => {
              const btn = document.getElementById(`select-agent-btn-${agent.id}`);
              if (btn) {
                btn.onclick = () => onSelectAgent(agent.id);
              }
            });

            newMarker.on('click', () => {
              onSelectAgent(agent.id);
            });

            currentMarkerMap.set(agent.id, newMarker);
          } catch (err) {
            console.warn('Failed to add agent marker:', err);
          }
        }
      });

      // Safely remove markers for agents that no longer exist or have no coordinates
      currentMarkerMap.forEach((marker, agentId) => {
        if (!validAgentIds.has(agentId)) {
          try { marker.remove(); } catch (_) {}
          currentMarkerMap.delete(agentId);
        }
      });
    }

    updateMarkers();
  }, [agents, selectedAgentId, onSelectAgent]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedAgentId) return;
    const selectedAgent = agents.find(a => a.id === selectedAgentId);
    if (selectedAgent && selectedAgent.last_latitude && selectedAgent.last_longitude) {
      try {
        if (map._loaded && map.getContainer()) {
          map.stop();
          map.flyTo(
            [selectedAgent.last_latitude, selectedAgent.last_longitude],
            16,
            { duration: 1.0 }
          );
        }
      } catch (err) {
        console.warn('flyTo failed:', err);
      }
    }
  }, [selectedAgentId, agents]);

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm bg-white">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] glass-panel px-3.5 py-2.5 rounded-xl text-xs space-y-2 border border-slate-200 shadow-md hidden sm:block">
        <div className="font-semibold text-slate-800 text-[11px] tracking-wide uppercase flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span> Live Fleet Radar
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-700 font-medium">In-Store Meeting</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="text-slate-700 font-medium">In Transit / Moving</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            <span className="text-slate-700 font-medium">Off Duty / Idle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-600 border border-white"></span>
            <span className="text-slate-700 font-medium">Client Geofence (50m)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

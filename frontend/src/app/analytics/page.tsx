'use client';

import React, { useEffect, useState } from 'react';
import {
  fetchAnalytics,
  fetchVisits,
  AnalyticsData,
  VisitLog
} from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Car,
  DollarSign,
  CheckCircle2,
  Calendar,
  Users,
  Award,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  X,
  FileText,
  Camera,
  MapPin,
  UploadCloud
} from 'lucide-react';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVisitModal, setSelectedVisitModal] = useState<VisitLog | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [analyticsData, visitsData] = await Promise.all([
          fetchAnalytics(),
          fetchVisits()
        ]);
        setAnalytics(analyticsData);
        setVisits(visitsData);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const totalTimeMinutes =
    (analytics?.time_and_distance.meeting_time_minutes || 0) +
    (analytics?.time_and_distance.transit_time_minutes || 0);

  const meetingPercent =
    totalTimeMinutes > 0
      ? Math.round(((analytics?.time_and_distance.meeting_time_minutes || 0) / totalTimeMinutes) * 100)
      : 50;
  const transitPercent = 100 - meetingPercent;

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Visit Audits & Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified client visit durations, selfie punch audits, distance covered, and meeting outcomes
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{analytics?.date || new Date().toISOString().split('T')[0]}</span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Distance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Distance</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {analytics?.time_and_distance.total_distance_km || 0} <span className="text-sm font-normal text-slate-400 font-sans">km</span>
          </div>
          <span className="text-[11px] text-slate-400 block">All fleet routes today</span>
        </div>

        {/* Visits & Conversion */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Completed Visits</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {analytics?.visits.completed || 0} <span className="text-sm font-normal text-slate-400 font-sans">/ {analytics?.visits.total || 0}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium block">
            {analytics?.visits.conversion_rate_percent || 0}% completion rate
          </span>
        </div>

        {/* Order Revenue Pipeline */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Order Revenue</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ${Number(analytics?.visits.total_order_value || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-blue-600 font-medium block">From verified meetings</span>
        </div>

        {/* Active Workforce */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Fleet on Duty</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {analytics?.agents.on_duty || 0} <span className="text-sm font-normal text-slate-400 font-sans">/ {analytics?.agents.total || 0}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium block">Active GPS tracking</span>
        </div>
      </div>

      {/* Time Allocation Breakdown: Transit vs. In-Meeting */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Time Allocation (Transit vs. Client Meetings)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Productive client engagement time vs. travel overhead
            </p>
          </div>
          {totalTimeMinutes > 0 && (
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                <span className="text-slate-700 font-medium">In-Meeting: {analytics?.time_and_distance.meeting_time_minutes || 0}m ({meetingPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                <span className="text-slate-700 font-medium">Transit: {analytics?.time_and_distance.transit_time_minutes || 0}m ({transitPercent}%)</span>
              </div>
            </div>
          )}
        </div>

        {totalTimeMinutes === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No transit or meeting time recorded yet today. Active tracking begins when field agents punch in.
          </div>
        ) : (
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-slate-900 transition-all duration-500"
              style={{ width: `${meetingPercent}%` }}
            />
            <div
              className="h-full bg-slate-300 transition-all duration-500"
              style={{ width: `${transitPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Verified Visit Logs History Table with Time In/Out and Selfie Proof */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Client Visit Logs & Audit Records
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Timestamped visit proofs, duration, and outcomes</p>
          </div>
          <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
            {visits.length} recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-[11px]">
                <th className="py-3 px-4">Agent</th>
                <th className="py-3 px-4">Client Visited</th>
                <th className="py-3 px-4">Time In / Out</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Selfie Proof</th>
                <th className="py-3 px-4">Order Value</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {visits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-800">No client visits logged today</p>
                    <p className="text-xs text-slate-400 mt-0.5">Completed visits with timestamped selfie punch audits will appear here automatically.</p>
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {v.agent_name || `Agent #${v.agent}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{v.client_name}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {v.client_address}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                      <div>IN: {new Date(v.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div>OUT: {v.check_out_time ? new Date(v.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {v.duration_minutes ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {v.duration_minutes}m
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium">
                          In Meeting
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {v.selfie_image ? (
                        <button
                          type="button"
                          onClick={() => setSelectedVisitModal(v)}
                          className="flex items-center gap-2 group cursor-pointer text-left"
                          title="Click to view full watermarked photo"
                        >
                          <img
                            src={v.selfie_image}
                            alt="Punch Proof"
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 group-hover:scale-105 group-hover:border-blue-500 transition-all shadow-2xs bg-black"
                          />
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200 group-hover:bg-emerald-100">
                            View Proof
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      ${Number(v.order_value).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {v.meeting_notes || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedVisitModal(v)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-Side Audit Modal for Detailed Visit Inspection */}
      {selectedVisitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <span>Visit Audit & Verification Proof</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold">
                      VERIFIED
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Field Agent: <strong className="text-slate-800">{selectedVisitModal.agent_name}</strong> • Client: <strong className="text-slate-800">{selectedVisitModal.client_name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVisitModal(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Side-by-Side 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Full High-Res Watermarked Selfie Proof */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>Watermarked Selfie Proof</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    GPS & Time Stamped
                  </span>
                </div>

                <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950 min-h-[300px] flex items-center justify-center group">
                  {selectedVisitModal.selfie_image ? (
                    <img
                      src={selectedVisitModal.selfie_image}
                      alt="Watermarked Selfie Punch Proof"
                      className="w-full h-auto max-h-[420px] object-contain"
                    />
                  ) : (
                    <div className="text-center p-8 text-slate-400 space-y-2">
                      <Camera className="w-10 h-10 mx-auto text-slate-500" />
                      <p className="text-xs">No watermarked photo recorded for this visit.</p>
                    </div>
                  )}
                  {selectedVisitModal.selfie_image && (
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-white flex items-center justify-between">
                      <span className="font-mono text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                        <span>Geofence Verified (&lt;50m)</span>
                      </span>
                      <span className="font-mono text-slate-400">Distance: {selectedVisitModal.distance_at_checkin}m</span>
                    </div>
                  )}
                </div>

                {/* Optional Attachment Preview if available */}
                {selectedVisitModal.attachment_image && (
                  <div className="space-y-1.5 pt-2">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                      <span>Attached Order / Storefront Proof</span>
                    </span>
                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xs max-h-36">
                      <img
                        src={selectedVisitModal.attachment_image}
                        alt="Storefront Attachment"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Clean Metadata Summary Cards */}
              <div className="flex flex-col space-y-3.5 justify-between">
                {/* Timing Summary Cards Grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Time In</span>
                    <strong className="text-slate-900 font-mono text-sm block">
                      {new Date(selectedVisitModal.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(selectedVisitModal.check_in_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Time Out</span>
                    <strong className="text-slate-900 font-mono text-sm block">
                      {selectedVisitModal.check_out_time
                        ? new Date(selectedVisitModal.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Active'}
                    </strong>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {selectedVisitModal.check_out_time ? 'Punched Out' : 'In Progress'}
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                    <span className="text-[10px] uppercase font-semibold text-blue-600 block mb-1">Total Duration</span>
                    <strong className="text-blue-700 font-mono text-sm block">
                      {selectedVisitModal.duration_minutes ? `${selectedVisitModal.duration_minutes} min` : 'Ongoing'}
                    </strong>
                    <span className="text-[9px] text-blue-500 font-medium">In-Store</span>
                  </div>
                </div>

                {/* Client Location & Verification Card */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{selectedVisitModal.client_name}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                      {selectedVisitModal.distance_at_checkin}m from geofence
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{selectedVisitModal.client_address}</span>
                  </p>
                </div>

                {/* Discussion Notes Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 flex-1">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Discussion Notes & Outcome:</span>
                  </span>
                  <div className="text-xs text-slate-800 leading-relaxed bg-white p-3 rounded-xl border border-slate-200 min-h-[90px]">
                    {selectedVisitModal.meeting_notes ? (
                      <div className="space-y-2">
                        <p>{selectedVisitModal.meeting_notes}</p>
                        {/* Render quick-tag highlights if present */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {['#OrderPlaced', '#FollowUpNeeded', '#PaymentCollected', '#StockAudited'].map((tag) =>
                            selectedVisitModal.meeting_notes?.includes(tag) ? (
                              <span key={tag} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200">
                                {tag}
                              </span>
                            ) : null
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No notes recorded</span>
                    )}
                  </div>
                </div>

                {/* Order Value & Follow Up Footer Card */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <span className="text-[10px] font-semibold text-emerald-700 block uppercase">Order Secured</span>
                    <span className="font-mono font-bold text-lg text-emerald-800">
                      ${Number(selectedVisitModal.order_value).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase">Follow-Up Date</span>
                    <span className="font-mono font-semibold text-sm text-slate-900 block mt-0.5">
                      {selectedVisitModal.follow_up_date || 'None scheduled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

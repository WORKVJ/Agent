'use client';

import React, { useState, useEffect } from 'react';
import { Building2, X, MapPin, Phone, User, Compass, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClientLocation } from '@/lib/api';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddClientModal({ isOpen, onClose, onSuccess }: AddClientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    latitude: '',
    longitude: '',
    geofence_radius_meters: '50'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const useCurrentLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            latitude: pos.coords.latitude.toFixed(6),
            longitude: pos.coords.longitude.toFixed(6)
          }));
        },
        (err) => console.warn('Could not get current GPS:', err),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  useEffect(() => {
    if (isOpen && (!formData.latitude || !formData.longitude)) {
      useCurrentLocation();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      const radius = parseFloat(formData.geofence_radius_meters) || 50.0;

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Please enter valid numeric latitude and longitude coordinates.');
      }

      const res = await createClientLocation({
        name: formData.name.trim(),
        address: formData.address.trim(),
        contact_person: formData.contact_person.trim(),
        contact_phone: formData.contact_phone.trim(),
        latitude: lat,
        longitude: lng,
        geofence_radius_meters: radius
      });

      setSuccessMsg(res.message || 'Client location created with 50m geofence!');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setSuccessMsg('');
        setFormData({
          name: '',
          address: '',
          contact_person: '',
          contact_phone: '',
          latitude: '40.7580',
          longitude: '-73.9855',
          geofence_radius_meters: '50'
        });
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register client location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preset quick coordinates helper
  const handleSetPreset = (lat: string, lng: string, addressPreset: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: prev.address || addressPreset
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Add Client Target Store</h3>
              <p className="text-xs text-slate-400">Register target address and automated 50m geofence perimeter</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store / Client Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Midtown Tech Plaza"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Street Address *</label>
            <input
              type="text"
              required
              placeholder="e.g. 120 W 45th St, New York, NY 10036"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="e.g. David Ross"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                placeholder="+1 212-555-0188"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude *</label>
              <input
                type="text"
                required
                placeholder="40.7580"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude *</label>
              <input
                type="text"
                required
                placeholder="-73.9855"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Radius (Meters)</label>
              <input
                type="number"
                min="10"
                max="500"
                value={formData.geofence_radius_meters}
                onChange={(e) => setFormData({ ...formData, geofence_radius_meters: e.target.value })}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-mono font-bold text-blue-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* GPS Location Helpers */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-600 font-medium">
              Want to set geofence at your current place?
            </span>
            <button
              type="button"
              onClick={useCurrentLocation}
              className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Use Current GPS</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Registering Geofence...</span>
              ) : (
                <>
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Register Store Geofence</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

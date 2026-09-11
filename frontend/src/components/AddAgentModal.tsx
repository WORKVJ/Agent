'use client';

import React, { useState } from 'react';
import { UserPlus, X, AlertCircle, CheckCircle2, Shield, Lock, Smartphone } from 'lucide-react';
import { createAgent } from '@/lib/api';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddAgentModal({ isOpen, onClose, onSuccess }: AddAgentModalProps) {
  const [newAgentForm, setNewAgentForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    employee_id: '',
    phone_number: '',
    email: '',
    password: 'AgentPassword123!'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentError, setAgentError] = useState('');
  const [agentSuccess, setAgentSuccess] = useState('');

  if (!isOpen) return null;

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAgentError('');
    setAgentSuccess('');

    try {
      const res = await createAgent(newAgentForm);
      setAgentSuccess(res.message || 'Agent registered successfully!');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setAgentSuccess('');
        setNewAgentForm({
          first_name: '',
          last_name: '',
          username: '',
          employee_id: '',
          phone_number: '',
          email: '',
          password: 'AgentPassword123!'
        });
      }, 1200);
    } catch (err: any) {
      setAgentError(err.message || 'Failed to create agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Register Field Agent</h3>
              <p className="text-xs text-slate-400">Add an agent profile and assign credentials for mobile app login</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {agentError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{agentError}</span>
          </div>
        )}

        {agentSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{agentSuccess}</span>
          </div>
        )}

        <form onSubmit={handleCreateAgent} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Alex"
                value={newAgentForm.first_name}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, first_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rivera"
                value={newAgentForm.last_name}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, last_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID</label>
              <input
                type="text"
                placeholder="Auto (e.g. AGT-106)"
                value={newAgentForm.employee_id}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, employee_id: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none transition-all uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Login Username</label>
              <input
                type="text"
                placeholder="Auto (e.g. alex)"
                value={newAgentForm.username}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, username: e.target.value.toLowerCase() })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none transition-all lowercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+1 555 019 2834"
                value={newAgentForm.phone_number}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, phone_number: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="alex@company.com"
                value={newAgentForm.email}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Login Password</label>
            <input
              type="text"
              value={newAgentForm.password}
              onChange={(e) => setNewAgentForm({ ...newAgentForm, password: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs font-mono font-medium text-slate-900 outline-none transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Default password provided. Can be changed anytime from the User Directory.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-xs font-bold text-white shadow-md hover:shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Registering...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Field Agent</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

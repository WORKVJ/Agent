'use client';

import React, { useState } from 'react';
import { UserPlus, X, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Register Field Agent</h3>
              <p className="text-xs text-slate-400">Add an agent profile and assign an employee badge ID</p>
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

        {agentError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{agentError}</span>
          </div>
        )}

        {agentSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{agentSuccess}</span>
          </div>
        )}

        <form onSubmit={handleCreateAgent} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Alex"
                value={newAgentForm.first_name}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, first_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rivera"
                value={newAgentForm.last_name}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, last_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
              <input
                type="text"
                placeholder="Auto (e.g. AGT-106)"
                value={newAgentForm.employee_id}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, employee_id: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none transition-all uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                placeholder="Auto (e.g. agent_alex)"
                value={newAgentForm.username}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, username: e.target.value.toLowerCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all lowercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+1 555-0199"
                value={newAgentForm.phone_number}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, phone_number: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="alex@company.com"
                value={newAgentForm.email}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="text"
              value={newAgentForm.password}
              onChange={(e) => setNewAgentForm({ ...newAgentForm, password: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all"
            />
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Registering...</span>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Agent</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

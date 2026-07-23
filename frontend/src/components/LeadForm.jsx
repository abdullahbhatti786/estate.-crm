import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from './Toast';

const STATUSES = ['New', 'Contacted', 'Interested', 'Negotiation', 'Converted', 'Lost'];

export default function LeadForm({ initialData, onSave, onCancel }) {
  const [form, setForm] = useState(initialData || { name: '', phone: '', email: '', description: '', status: 'New', follow_up_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initialData?.id) {
        await api.put(`/leads/${initialData.id}`, form);
        toast('Lead updated', 'success');
      } else {
        await api.post('/leads', form);
        toast('Lead added', 'success');
      }
      onSave();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Name *</label>
          <input
            type="text" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 transition-all"
            placeholder="Customer name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone *</label>
          <input
            type="text" required value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 transition-all"
            placeholder="+971 50 XXX XXXX"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
          <input
            type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 transition-all"
            placeholder="customer@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 transition-all"
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Follow-up Date & Time</label>
          <input
            type="datetime-local" value={form.follow_up_date ? new Date(form.follow_up_date).toISOString().slice(0, 16) : ''}
            onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
            className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes / Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 transition-all resize-none"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button" onClick={onCancel}
          className="px-4 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-secondary hover:text-text-primary transition-all"
        >
          Cancel
        </button>
        <button
          type="submit" disabled={saving}
          className="px-6 py-2.5 bg-accent text-bg-primary font-bold rounded-xl hover:bg-accent-hover transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Lead'}
        </button>
      </div>
    </form>
  );
}

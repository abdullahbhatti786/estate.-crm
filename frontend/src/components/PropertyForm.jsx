import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from './Toast';
import { Trash2, Download, Plus, FileText } from 'lucide-react';

const PAYMENT_STATUSES = ['Pending', 'Paid', 'Overdue'];

export default function PropertyForm({ initialData, onSave, onCancel }) {
  const emptyProperty = {
    owner_name: '', owner_phone: '', owner_email: '',
    tenant_name: '', tenant_phone: '', tenant_email: '',
    apartment_unit: '', rent_amount: '', security_deposit: '',
    lease_start: '', lease_end: '', payment_status: 'Pending',
    notes: '',
    payment_schedule: [], property_status: 'Rented'
  };

  const [form, setForm] = useState(initialData || emptyProperty);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        lease_start: initialData.lease_start ? initialData.lease_start.split('T')[0] : '',
        lease_end: initialData.lease_end ? initialData.lease_end.split('T')[0] : '',
      });
    }
  }, [initialData]);

  const handleGenerateSchedule = (numPayments) => {
    const rent = parseFloat(form.rent_amount);
    if (!rent || !numPayments) {
      toast('Please enter Rent Amount first', 'error');
      return;
    }
    const amountPerPayment = (rent / numPayments).toFixed(2);
    const newSchedule = Array.from({ length: numPayments }).map((_, i) => {
      let d = new Date(form.lease_start || new Date());
      d.setMonth(d.getMonth() + (i * (12 / numPayments)));
      return {
        amount: amountPerPayment,
        due_date: d.toISOString().split('T')[0],
        status: 'Due',
        payment_mode: 'Cheque'
      };
    });
    setForm({ ...form, payment_schedule: newSchedule });
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, rent_amount: parseFloat(form.rent_amount) || 0, security_deposit: parseFloat(form.security_deposit) || 0 };
      if (initialData?.id || initialData?._id) {
        await api.put(`/properties/${initialData.id || initialData._id}`, data);
        toast('Property updated', 'success');
      } else {
        await api.post('/properties', data);
        toast('Property added', 'success');
      }
      onSave();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Owner Section */}
      <div>
        <h3 className="text-sm font-semibold text-accent mb-3 uppercase tracking-wider">Owner Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Name *</label>
            <input type="text" required value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className={inputClass} placeholder="Owner name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone *</label>
            <input type="text" required value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} className={inputClass} placeholder="+971 50 XXX XXXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
            <input type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} className={inputClass} placeholder="owner@email.com" />
          </div>
        </div>
      </div>

      {/* Tenant Section */}
      <div>
        <h3 className="text-sm font-semibold text-purple mb-3 uppercase tracking-wider">Tenant Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Name *</label>
            <input type="text" required value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} className={inputClass} placeholder="Tenant name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone *</label>
            <input type="text" required value={form.tenant_phone} onChange={(e) => setForm({ ...form, tenant_phone: e.target.value })} className={inputClass} placeholder="+971 55 XXX XXXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
            <input type="email" value={form.tenant_email} onChange={(e) => setForm({ ...form, tenant_email: e.target.value })} className={inputClass} placeholder="tenant@email.com" />
          </div>
        </div>
      </div>

      {/* Property & Financial */}
      <div>
        <h3 className="text-sm font-semibold text-warning mb-3 uppercase tracking-wider">Property & Financials</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Apartment/Unit *</label>
            <input type="text" required value={form.apartment_unit} onChange={(e) => setForm({ ...form, apartment_unit: e.target.value })} className={inputClass} placeholder="e.g., Tower A - 1204" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Monthly Rent (AED) *</label>
            <input type="number" required value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} className={inputClass} placeholder="5000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Security Deposit (AED)</label>
            <input type="number" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: e.target.value })} className={inputClass} placeholder="10000" />
          </div>
        </div>
      </div>

      {/* Contract */}
      <div>
        <h3 className="text-sm font-semibold text-info mb-3 uppercase tracking-wider">Contract Period</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Start Date *</label>
            <input type="date" required value={form.lease_start} onChange={(e) => setForm({ ...form, lease_start: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">End Date *</label>
            <input type="date" required value={form.lease_end} onChange={(e) => setForm({ ...form, lease_end: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Payment Status</label>
            <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })} className={inputClass}>
              {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes / Description</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all resize-none"
          placeholder="e.g., Looking for immediate move-in..."
        />
      </div>

      {/* Payment Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-green-500 uppercase tracking-wider">Payment Schedule</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">Installments:</span>
            <input 
              type="number" 
              min="1" 
              max="48"
              className="w-16 px-2 py-1 text-xs bg-bg-elevated border border-border rounded text-text-primary focus:outline-none focus:border-accent"
              placeholder="e.g. 4"
              id="installment-count-input"
              defaultValue="4"
            />
            <button type="button" onClick={() => {
              const val = parseInt(document.getElementById('installment-count-input').value) || 1;
              handleGenerateSchedule(val);
            }}
              className="px-3 py-1 bg-accent text-bg-primary rounded text-xs font-medium hover:bg-accent-hover transition-colors">
              Generate
            </button>
          </div>
        </div>
        
        {form.payment_schedule && form.payment_schedule.length > 0 && (
          <div className="space-y-3 bg-bg-primary p-4 rounded-xl border border-border max-h-60 overflow-y-auto">
            {form.payment_schedule.map((pmt, idx) => (
              <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-3 items-center bg-bg-surface p-3 rounded-lg border border-border shadow-sm">
                <div className="w-16 flex-shrink-0 text-xs font-bold text-text-muted text-center py-1.5 bg-bg-elevated rounded">#{idx + 1}</div>
                <input type="number" required value={pmt.amount} onChange={(e) => {
                  const newSched = [...form.payment_schedule];
                  newSched[idx].amount = e.target.value;
                  setForm({ ...form, payment_schedule: newSched });
                }} className={`${inputClass} !py-1.5 !text-sm`} placeholder="Amount" />
                <input type="date" required value={pmt.due_date} onChange={(e) => {
                  const newSched = [...form.payment_schedule];
                  newSched[idx].due_date = e.target.value;
                  setForm({ ...form, payment_schedule: newSched });
                }} className={`${inputClass} !py-1.5 !text-sm w-36`} />
                <select value={pmt.payment_mode} onChange={(e) => {
                  const newSched = [...form.payment_schedule];
                  newSched[idx].payment_mode = e.target.value;
                  setForm({ ...form, payment_schedule: newSched });
                }} className={`${inputClass} !py-1.5 !text-sm w-28`}>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="Transfer">Transfer</option>
                </select>
                <select value={pmt.status} onChange={(e) => {
                  const newSched = [...form.payment_schedule];
                  newSched[idx].status = e.target.value;
                  setForm({ ...form, payment_schedule: newSched });
                }} className={`${inputClass} !py-1.5 !text-sm w-28 font-medium ${pmt.status === 'Paid' ? 'text-success' : 'text-warning'}`}>
                  <option value="Due">Due</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            ))}
          </div>
        )}
        {(!form.payment_schedule || form.payment_schedule.length === 0) && (
          <div className="text-center py-6 bg-bg-primary rounded-xl border border-border border-dashed text-text-muted text-sm">
            No payment schedule generated. Click a number above to split the rent.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-secondary hover:text-text-primary transition-all">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-bg-primary font-medium rounded-xl hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 transition-all duration-300">
          {saving ? 'Saving...' : 'Save Property'}
        </button>
      </div>
    </form>
  );
}

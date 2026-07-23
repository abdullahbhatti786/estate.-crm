import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';

const STATUSES = ['New', 'Contacted', 'Interested', 'Negotiation', 'Converted', 'Lost'];

const emptyLead = { name: '', phone: '', email: '', description: '', status: 'New', follow_up_date: '' };

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [form, setForm] = useState(emptyLead);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const res = await api.get('/leads', {
        params: { search, status: statusFilter, page, limit: 20 }
      });
      setLeads(res.data.leads);
      setTotal(res.data.total);
      setPages(res.data.totalPages || res.data.pages);
    } catch (err) {
      toast('Failed to load leads', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState(null);
  const handleSearch = (val) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
    setSearchTimeout(timeout);
  };

  const openCreate = () => {
    setEditingLead(null);
    setForm(emptyLead);
    setModalOpen(true);
  };

  const openEdit = (lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      description: lead.description || '',
      status: lead.status || 'New',
      follow_up_date: lead.follow_up_date || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingLead) {
        await api.put(`/leads/${editingLead.id}`, form);
        toast('Lead updated successfully', 'success');
      } else {
        await api.post('/leads', form);
        toast('Lead created successfully', 'success');
      }
      setModalOpen(false);
      fetchLeads();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save lead', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      toast('Lead deleted', 'success');
      fetchLeads();
    } catch (err) {
      toast('Failed to delete lead', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} leads?`)) return;

    setDeleting(true);
    try {
      await api.delete('/leads/bulk/delete', { data: { ids: selectedIds } });
      toast('Leads deleted successfully', 'success');
      setSelectedIds([]);
      fetchLeads();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to delete leads', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    window.open('/api/upload/export/leads', '_blank');
  };

  const columns = [
    { key: 'name', header: 'Name', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email', render: (val) => val || <span className="text-text-muted">—</span> },
    { key: 'description', header: 'Notes', render: (val) => (
      <span className="max-w-[200px] truncate block text-text-secondary">{val || '—'}</span>
    )},
    { key: 'follow_up_date', header: 'Follow-up', render: (val) => {
      if (!val) return <span className="text-text-muted">—</span>;
      const date = new Date(val);
      const isPast = date < new Date();
      return (
        <span className={`text-xs font-medium px-2 py-1 rounded border whitespace-nowrap ${isPast ? 'bg-danger/10 text-danger border-danger/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
          {date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      );
    }},
    { key: 'status', header: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'source', header: 'Source', render: (val) => <StatusBadge status={val} /> },
    { key: 'created_at', header: 'Added', render: (val) => (
      <span className="text-text-muted text-xs">{new Date(val).toLocaleDateString()}</span>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sales Pipeline</h1>
          <p className="text-sm text-text-muted mt-1">Manage your leads and prospects</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-bg-surface border border-border rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-accent/50 transition-all"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 bg-danger/10 border border-danger/20 rounded-lg text-sm font-medium text-danger hover:bg-danger/20 transition-all disabled:opacity-50"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">{deleting ? 'Deleting...' : `Delete (${selectedIds.length})`}</span>
            </button>
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-bg-surface border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-bg-hover transition-all"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            id="add-lead-btn"
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-bg-primary font-bold rounded-lg hover:bg-accent-hover transition-all duration-300"
          >
            <Plus size={16} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={leads}
        total={total}
        page={page}
        pages={pages}
        onPageChange={setPage}
        onSearch={handleSearch}
        searchPlaceholder="Search leads by name, phone, email..."
        loading={loading}
        emptyMessage="No leads found. Add your first lead!"
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        actions={(row) => (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => openEdit(row)}
              className="p-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent-dim transition-all"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => handleDelete(row.id)}
              className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-all"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingLead ? 'Edit Lead' : 'Add New Lead'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Name *</label>
              <input
                type="text" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all"
                placeholder="Customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone *</label>
              <input
                type="text" required value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all"
                placeholder="+971 50 XXX XXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
              <input
                type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all"
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
                type="datetime-local" value={form.follow_up_date}
                onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes / Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all resize-none"
              placeholder="e.g., Looking for 3-bedroom apartment in Marina..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-secondary hover:text-text-primary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-bg-primary font-medium rounded-xl hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 transition-all duration-300"
            >
              {saving ? 'Saving...' : (editingLead ? 'Update Lead' : 'Add Lead')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

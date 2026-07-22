import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { Plus, Pencil, Trash2, Download, FileText } from 'lucide-react';

const PAYMENT_STATUSES = ['Paid', 'Pending', 'Overdue'];

const emptyProperty = {
  owner_name: '', owner_phone: '', owner_email: '',
  tenant_name: '', tenant_phone: '', tenant_email: '',
  apartment_unit: '', rent_amount: '', security_deposit: '',
  lease_start: '', lease_end: '', payment_status: 'Pending',
  payment_schedule: [], images: [], documents: []
};

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProperty);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/properties', {
        params: { search, payment_status: paymentFilter, property_status: 'Rented', page, limit: 20 }
      });
      setProperties(res.data.properties);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast('Failed to load properties', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, paymentFilter, page]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const [searchTimeout, setSearchTimeout] = useState(null);
  const handleSearch = (val) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => { setSearch(val); setPage(1); }, 300);
    setSearchTimeout(timeout);
  };

  const openCreate = () => { setEditing(null); setForm(emptyProperty); setModalOpen(true); };

  const openEdit = async (prop) => {
    setEditing(prop);
    // Basic fields immediately
    setForm({
      owner_name: prop.owner_name || '', owner_phone: prop.owner_phone || '', owner_email: prop.owner_email || '',
      tenant_name: prop.tenant_name || '', tenant_phone: prop.tenant_phone || '', tenant_email: prop.tenant_email || '',
      apartment_unit: prop.apartment_unit || '', rent_amount: prop.rent_amount || '',
      security_deposit: prop.security_deposit || '',
      lease_start: prop.lease_start ? prop.lease_start.split('T')[0] : '',
      lease_end: prop.lease_end ? prop.lease_end.split('T')[0] : '',
      payment_status: prop.payment_status || 'Pending',
      payment_schedule: [],
      images: prop.images || [],
      documents: prop.documents || []
    });
    setModalOpen(true);
    
    try {
      const res = await api.get(`/properties/${prop.id}`);
      if (res.data.property) {
        setForm(prev => ({
          ...prev,
          payment_schedule: res.data.property.payment_schedule || [],
          images: res.data.property.images || [],
          documents: res.data.property.documents || []
        }));
      }
    } catch (e) {
      console.error('Failed to load payment schedule');
    }
  };

  const handleGenerateSchedule = (numPayments) => {
    const rent = parseFloat(form.rent_amount) || 0;
    if (rent === 0) {
      toast('Please enter rent amount first', 'warning');
      return;
    }
    const amountPerPayment = (rent / numPayments).toFixed(2);
    const newSchedule = Array.from({ length: numPayments }).map((_, i) => {
      // Very basic date generation based on start date + months
      let d = new Date(form.lease_start || new Date());
      d.setMonth(d.getMonth() + (i * (12 / numPayments)));
      return {
        amount: amountPerPayment,
        due_date: d.toISOString().split('T')[0],
        payment_mode: 'Cheque',
        status: 'Due'
      };
    });
    setForm({ ...form, payment_schedule: newSchedule });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    try {
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.imageUrl) {
        setForm(prev => ({
          ...prev,
          images: [...(prev.images || []), res.data.imageUrl]
        }));
        toast('Image uploaded', 'success');
      }
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const docName = prompt('Enter a name for this document (e.g., Emirates ID, Lease Contract):', file.name) || file.name;

    const formData = new FormData();
    formData.append('document', file);

    setUploadingDoc(true);
    try {
      const res = await api.post('/upload/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.documentUrl) {
        setForm(prev => ({
          ...prev,
          documents: [...(prev.documents || []), { name: docName, url: res.data.documentUrl }]
        }));
        toast('Document uploaded', 'success');
      }
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to upload document', 'error');
    } finally {
      setUploadingDoc(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDownloadImage = async (url) => {
    const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
    try {
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const filename = url.split('/').pop() || 'document';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed, falling back to new tab', err);
      window.open(fullUrl, '_blank');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, rent_amount: parseFloat(form.rent_amount) || 0, security_deposit: parseFloat(form.security_deposit) || 0 };
      if (editing) {
        await api.put(`/properties/${editing.id}`, data);
        toast('Property updated', 'success');
      } else {
        await api.post('/properties', data);
        toast('Property added', 'success');
      }
      setModalOpen(false);
      fetchProperties();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this property record?')) return;
    try {
      await api.delete(`/properties/${id}`);
      toast('Property deleted', 'success');
      fetchProperties();
    } catch { toast('Failed to delete', 'error'); }
  };

  const formatAED = (val) => {
    if (!val && val !== 0) return '—';
    return `AED ${Number(val).toLocaleString()}`;
  };

  const columns = [
    { 
      key: 'image', 
      header: 'Image', 
      render: (_, row) => (
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg-elevated border border-border shrink-0 flex items-center justify-center">
          {row.images && row.images.length > 0 ? (
            <img src={row.images[0].startsWith('http') ? row.images[0] : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${row.images[0]}`} alt="Property" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-text-muted">No Img</span>
          )}
        </div>
      )
    },
    { key: 'docs_count', header: 'Docs', render: (_, row) => {
      const count = row.documents?.length || 0;
      return count > 0 ? (
        <div className="flex items-center gap-1 text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded w-fit">
          <FileText size={12} /> {count}
        </div>
      ) : <span className="text-xs text-text-muted">—</span>;
    }},
    { key: 'apartment_unit', header: 'Unit', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'owner_name', header: 'Owner' },
    { key: 'owner_phone', header: 'Owner Phone' },
    { key: 'tenant_name', header: 'Tenant' },
    { key: 'tenant_phone', header: 'Tenant Phone' },
    { key: 'rent_amount', header: 'Rent', render: (val) => <span className="font-medium text-accent">{formatAED(val)}</span> },
    { key: 'security_deposit', header: 'Deposit', render: (val) => <span className="text-text-secondary">{formatAED(val)}</span> },
    { key: 'lease_start', header: 'Start', render: (val) => <span className="text-xs text-text-muted">{val ? val.split('T')[0] : '—'}</span> },
    { key: 'lease_end', header: 'End', render: (val) => {
      if (!val) return <span className="text-xs text-text-muted">—</span>;
      const dateStr = val.split('T')[0];
      const days = Math.ceil((new Date(val) - new Date()) / (1000 * 60 * 60 * 24));
      return (
        <span className={`text-xs font-medium ${days <= 0 ? 'text-danger' : days <= 30 ? 'text-warning' : 'text-text-muted'}`}>
          {dateStr} {days <= 30 && days > 0 ? `(${days}d)` : days <= 0 ? '(Expired)' : ''}
        </span>
      );
    }},
    { key: 'payment_status', header: 'Payment', render: (val, row) => {
      const schedule = row.payment_schedule || [];
      if (schedule.length > 0) {
        const total = schedule.length;
        const paid = schedule.filter(p => p.status === 'Paid').length;
        const isAllPaid = paid === total;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${isAllPaid ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
            {paid} / {total} Paid
          </span>
        );
      }
      return <StatusBadge status={val} />;
    }},
  ];

  const inputClass = "w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Properties</h1>
          <p className="text-sm text-text-muted mt-1">Track owners, tenants, and lease contracts</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-bg-surface border border-border rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-accent/50 transition-all"
          >
            <option value="All">All Payments</option>
            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => window.open('/api/upload/export/properties', '_blank')}
            className="flex items-center gap-2 px-4 py-2.5 bg-bg-surface border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-bg-hover transition-all">
            <Download size={16} /><span className="hidden sm:inline">Export</span>
          </button>
          <button id="add-property-btn" onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-bg-primary font-bold rounded-lg hover:bg-accent-hover transition-all duration-300">
            <Plus size={16} /><span>Add Property</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={properties}
        total={total}
        page={page}
        pages={pages}
        onPageChange={setPage}
        onSearch={handleSearch}
        searchPlaceholder="Search properties..."
        loading={loading}
        emptyMessage="No property records found."
        selectable={true}
        selectedIds={[]}
        onSelectionChange={() => {}}
        actions={(row) => (
          <div className="flex items-center gap-1 justify-end">
            <button onClick={() => openEdit(row)} className="p-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent-dim transition-all"><Pencil size={15} /></button>
            <button onClick={() => handleDelete(row.id)} className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-all"><Trash2 size={15} /></button>
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Property' : 'Add Property'} maxWidth="max-w-3xl">
        <form onSubmit={handleSave} className="space-y-5">
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

          {/* Images Section */}
          <div>
            <h3 className="text-sm font-semibold text-info mb-3 uppercase tracking-wider">Property Images</h3>
            <div className="flex flex-wrap gap-3 mb-3">
              {form.images && form.images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                  <img src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img}`} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => handleDownloadImage(img)} title="Download" className="p-1 hover:bg-white/20 rounded">
                      <Download size={16} className="text-white" />
                    </button>
                    <button type="button" onClick={() => {
                      const newImgs = [...form.images];
                      newImgs.splice(idx, 1);
                      setForm({ ...form, images: newImgs });
                    }} title="Delete" className="p-1 hover:bg-white/20 rounded">
                      <Trash2 size={16} className="text-danger" />
                    </button>
                  </div>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:text-accent transition-colors text-text-muted">
                {uploadingImage ? <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /> : <Plus size={20} />}
                <span className="text-[10px] mt-1 font-medium">{uploadingImage ? 'Uploading' : 'Add Image'}</span>
                <input type="file" className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
            </div>
          </div>

          {/* Lease Documents Section */}
          <div>
            <h3 className="text-sm font-semibold text-accent mb-3 uppercase tracking-wider">Lease Documents & IDs</h3>
            <div className="space-y-2 mb-3">
              {form.documents && form.documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-bg-surface border border-border rounded-lg group hover:border-accent transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-bg-elevated rounded-lg text-accent shrink-0"><FileText size={18} /></div>
                    <span className="text-sm font-medium text-text-primary truncate">{doc.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => handleDownloadImage(doc.url)} className="p-2 text-text-muted hover:text-accent hover:bg-bg-elevated rounded-lg transition-colors" title="Download">
                      <Download size={16} />
                    </button>
                    <button type="button" onClick={() => {
                      const newDocs = [...form.documents];
                      newDocs.splice(idx, 1);
                      setForm({ ...form, documents: newDocs });
                    }} className="p-2 text-text-muted hover:text-danger hover:bg-bg-elevated rounded-lg transition-colors" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <label className="flex items-center justify-center gap-2 w-full p-4 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-accent hover:text-accent transition-colors text-text-muted">
                {uploadingDoc ? <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /> : <Plus size={18} />}
                <span className="text-sm font-medium">{uploadingDoc ? 'Uploading...' : 'Upload Document (PDF, JPG, PNG)'}</span>
                <input type="file" className="hidden" accept=".pdf, image/jpeg, image/png, .doc, .docx" onChange={handleDocumentUpload} disabled={uploadingDoc} />
              </label>
            </div>
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
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-secondary hover:text-text-primary transition-all">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-bg-primary font-medium rounded-xl hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 transition-all duration-300">
              {saving ? 'Saving...' : (editing ? 'Update Property' : 'Add Property')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

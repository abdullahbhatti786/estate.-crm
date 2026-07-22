import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { Plus, Pencil, Trash2, Download, FileText } from 'lucide-react';

const emptyProperty = {
  owner_name: '', owner_phone: '', owner_email: '',
  apartment_unit: '', rent_amount: '', security_deposit: '',
  property_status: 'Available', images: [], documents: []
};

export default function Inventory() {
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProperty);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/properties', {
        params: { search, property_status: 'Available', page, limit: 20 }
      });
      setProperties(res.data.properties);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const [searchTimeout, setSearchTimeout] = useState(null);
  const handleSearch = (val) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => { setSearch(val); setPage(1); }, 300);
    setSearchTimeout(timeout);
  };

  const openCreate = () => { setEditing(null); setForm(emptyProperty); setModalOpen(true); };

  const openEdit = (prop) => {
    setEditing(prop);
    setForm({
      owner_name: prop.owner_name || '', owner_phone: prop.owner_phone || '', owner_email: prop.owner_email || '',
      apartment_unit: prop.apartment_unit || '', rent_amount: prop.rent_amount || '',
      security_deposit: prop.security_deposit || '', property_status: 'Available',
      images: prop.images || [],
      documents: prop.documents || []
    });
    setModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    try {
      // NOTE: Our API requires token in headers. api.post automatically attaches it.
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
    
    const docName = prompt('Enter a name for this document (e.g., Title Deed, Owner ID):', file.name) || file.name;

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
        toast('Inventory property updated', 'success');
      } else {
        await api.post('/properties', data);
        toast('Inventory property added', 'success');
      }
      setModalOpen(false);
      fetchInventory();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this inventory record?')) return;
    try {
      await api.delete(`/properties/${id}`);
      toast('Property deleted', 'success');
      fetchInventory();
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
    { key: 'apartment_unit', header: 'Unit', render: (val) => <span className="font-medium text-text-primary">{val}</span> },
    { key: 'owner_name', header: 'Owner' },
    { key: 'owner_phone', header: 'Owner Phone' },
    { key: 'rent_amount', header: 'Asking Rent', render: (val) => <span className="font-medium text-accent">{formatAED(val)}</span> },
    { key: 'security_deposit', header: 'Deposit', render: (val) => <span className="text-text-secondary">{formatAED(val)}</span> },
    { key: 'created_at', header: 'Listed On', render: (val) => <span className="text-xs text-text-muted">{new Date(val).toLocaleDateString()}</span> },
  ];

  const inputClass = "w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Inventory</h1>
          <p className="text-sm text-text-muted mt-1">Manage available properties for rent</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.open('/api/upload/export/inventory', '_blank')}
            className="flex items-center gap-2 px-4 py-2.5 bg-bg-surface border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-bg-hover transition-all">
            <Download size={16} /><span className="hidden sm:inline">Export</span>
          </button>
          <button id="add-inventory-btn" onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-bg-primary font-bold rounded-lg hover:bg-accent-hover transition-all duration-300">
            <Plus size={16} /><span>Add to Inventory</span>
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
        searchPlaceholder="Search available properties..."
        loading={loading}
        emptyMessage="No inventory properties found."
        actions={(row) => (
          <div className="flex items-center gap-1 justify-end">
            <button onClick={() => openEdit(row)} className="p-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent-dim transition-all"><Pencil size={15} /></button>
            <button onClick={() => handleDelete(row.id)} className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-all"><Trash2 size={15} /></button>
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Inventory Property' : 'Add to Inventory'} maxWidth="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Owner Section */}
          <div>
            <h3 className="text-sm font-semibold text-accent mb-3 uppercase tracking-wider">Owner Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Name *</label>
                <input type="text" required value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className={inputClass} placeholder="Owner name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone *</label>
                <input type="text" required value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} className={inputClass} placeholder="+971 50 XXX XXXX" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                <input type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} className={inputClass} placeholder="owner@email.com" />
              </div>
            </div>
          </div>

          {/* Property Section */}
          <div>
            <h3 className="text-sm font-semibold text-warning mb-3 uppercase tracking-wider">Property Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Apartment/Unit *</label>
                <input type="text" required value={form.apartment_unit} onChange={(e) => setForm({ ...form, apartment_unit: e.target.value })} className={inputClass} placeholder="e.g., Tower A - 1204" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Asking Rent (AED) *</label>
                <input type="number" required value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} className={inputClass} placeholder="50000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Expected Deposit (AED)</label>
                <input type="number" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: e.target.value })} className={inputClass} placeholder="2500" />
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

          {/* Lease/Property Documents Section */}
          <div>
            <h3 className="text-sm font-semibold text-accent mb-3 uppercase tracking-wider">Property Documents & IDs</h3>
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

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-secondary hover:text-text-primary transition-all">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-bg-primary font-medium rounded-xl hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 transition-all duration-300">
              {saving ? 'Saving...' : (editing ? 'Update Property' : 'Add to Inventory')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import { toast } from '../components/Toast';
import { ArrowRightLeft, Pencil, Trash2 } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LeadForm from '../components/LeadForm';
import PropertyForm from '../components/PropertyForm';

import { FileText } from 'lucide-react';

const formatAED = (val) => {
  if (!val && val !== 0) return '—';
  return `AED ${Number(val).toLocaleString()}`;
};

const LEAD_COLUMNS = [
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

const PROPERTY_COLUMNS = [
  { key: 'apartment_unit', header: 'Unit', render: (val) => <span className="font-medium">{val}</span> },
  { key: 'notes', header: 'Notes', render: (val) => (
    <span className="max-w-[150px] truncate block text-text-secondary">{val || '—'}</span>
  )},
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

export default function DataWorking() {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' or 'properties'
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [transferring, setTransferring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      if (activeTab === 'sales') {
        const res = await api.get('/leads', {
          params: { search, page, limit: 20, is_data_working: true }
        });
        setData(res.data.leads);
        setTotal(res.data.total);
        setPages(res.data.totalPages || res.data.pages);
      } else {
        const res = await api.get('/properties', {
          params: { search, page, limit: 20, is_data_working: true }
        });
        setData(res.data.properties);
        setTotal(res.data.total);
        setPages(res.data.totalPages || res.data.pages);
      }
    } catch (err) {
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, page, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleBulkTransfer = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to transfer ${selectedIds.length} records?`)) return;

    setTransferring(true);
    try {
      const endpoint = activeTab === 'sales' ? '/leads/bulk/transfer' : '/properties/bulk/transfer';
      await api.put(endpoint, { ids: selectedIds });
      toast('Records transferred successfully!', 'success');
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast(err.response?.data?.error || 'Transfer failed', 'error');
    } finally {
      setTransferring(false);
    }
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} records?`)) return;

    setDeleting(true);
    try {
      const endpoint = activeTab === 'sales' ? '/leads/bulk/delete' : '/properties/bulk/delete';
      await api.delete(endpoint, { data: { ids: selectedIds } });
      toast('Records deleted successfully!', 'success');
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast(err.response?.data?.error || 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      const endpoint = activeTab === 'sales' ? `/leads/${id}` : `/properties/${id}`;
      await api.delete(endpoint);
      toast('Record deleted', 'success');
      fetchData();
    } catch (err) {
      toast('Failed to delete', 'error');
    }
  };

  const openEdit = (row) => {
    setEditingData(row);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Data Working</h1>
          <p className="text-sm text-text-muted mt-1">Staging area for raw and imported data</p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDeleteSelected}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 bg-danger/10 border border-danger/20 rounded-lg text-sm font-medium text-danger hover:bg-danger/20 transition-all duration-300 disabled:opacity-50"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">{deleting ? 'Deleting...' : `Delete (${selectedIds.length})`}</span>
            </button>
            <button
              onClick={handleBulkTransfer}
              disabled={transferring}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-bg-primary font-bold rounded-lg hover:bg-accent-hover transition-all duration-300 disabled:opacity-50"
            >
              <ArrowRightLeft size={16} />
              <span>{transferring ? 'Transferring...' : `Transfer Selected (${selectedIds.length})`}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => { setActiveTab('sales'); setPage(1); setSearch(''); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'sales' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Sales (Leads)
        </button>
        <button
          onClick={() => { setActiveTab('properties'); setPage(1); setSearch(''); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'properties' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Properties
        </button>
      </div>

      <DataTable
        columns={activeTab === 'sales' ? LEAD_COLUMNS : PROPERTY_COLUMNS}
        data={data}
        total={total}
        page={page}
        pages={pages}
        onPageChange={setPage}
        onSearch={handleSearch}
        searchPlaceholder={`Search raw ${activeTab}...`}
        loading={loading}
        emptyMessage={`No raw ${activeTab} found.`}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        actions={(row) => (
          <div className="flex items-center gap-1 justify-end">
            <button onClick={() => openEdit(row)} className="p-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent-dim transition-all"><Pencil size={15} /></button>
            <button onClick={() => handleDelete(row.id || row._id)} className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-all"><Trash2 size={15} /></button>
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Edit ${activeTab === 'sales' ? 'Lead' : 'Property'}`} maxWidth={activeTab === 'properties' ? 'max-w-3xl' : 'max-w-xl'}>
        {activeTab === 'sales' ? (
          <LeadForm 
            initialData={editingData} 
            onCancel={() => setModalOpen(false)} 
            onSave={() => { setModalOpen(false); fetchData(); }} 
          />
        ) : (
          <PropertyForm 
            initialData={editingData} 
            onCancel={() => setModalOpen(false)} 
            onSave={() => { setModalOpen(false); fetchData(); }} 
          />
        )}
      </Modal>
    </div>
  );
}

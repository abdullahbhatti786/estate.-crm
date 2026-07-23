import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import { toast } from '../components/Toast';
import { ArrowRightLeft } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const LEAD_COLUMNS = [
  { key: 'name', header: 'Name', render: (val) => <span className="font-semibold">{val}</span> },
  { key: 'phone', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'status', header: 'Status', render: (val) => <StatusBadge status={val} /> },
  { key: 'source', header: 'Source' },
];

const PROPERTY_COLUMNS = [
  { key: 'owner_name', header: 'Owner', render: (val) => <span className="font-semibold">{val}</span> },
  { key: 'apartment_unit', header: 'Unit' },
  { key: 'rent_amount', header: 'Rent', render: (val) => `$${val?.toLocaleString()}` },
  { key: 'payment_status', header: 'Payment', render: (val) => <StatusBadge status={val} /> },
  { key: 'property_status', header: 'Status', render: (val) => <StatusBadge status={val} /> }
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Data Working</h1>
          <p className="text-sm text-text-muted mt-1">Staging area for raw and imported data</p>
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkTransfer}
            disabled={transferring}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-bg-primary font-bold rounded-lg hover:bg-accent-hover transition-all duration-300 disabled:opacity-50"
          >
            <ArrowRightLeft size={16} />
            <span>{transferring ? 'Transferring...' : `Transfer Selected (${selectedIds.length})`}</span>
          </button>
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
      />
    </div>
  );
}

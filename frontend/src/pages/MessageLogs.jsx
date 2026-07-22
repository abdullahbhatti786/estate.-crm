import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import StatsCard from '../components/StatsCard';
import Modal from '../components/Modal';
import { Send, AlertTriangle, CheckCircle, Eye } from 'lucide-react';

export default function MessageLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [channelFilter, setChannelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [viewMessage, setViewMessage] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/messages/logs', {
        params: { channel: channelFilter, status: statusFilter, page, limit: 20 }
      });
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [channelFilter, statusFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const columns = [
    { key: 'contact_name', header: 'Contact', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'contact_value', header: 'Phone/Email' },
    { key: 'channel', header: 'Channel', render: (val) => (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
        val === 'whatsapp' ? 'bg-success-dim/30 text-success border border-success/20' : 'bg-info-dim/30 text-info border border-info/20'
      }`}>
        {val === 'whatsapp' ? '📱' : '📧'} {val}
      </span>
    )},
    { key: 'message', header: 'Message', render: (val) => (
      <div className="flex items-center gap-2">
        <span className="max-w-[200px] truncate block text-text-secondary text-xs">{val}</span>
        <button onClick={() => setViewMessage(val)} className="flex items-center gap-1 text-[10px] bg-bg-elevated px-2 py-1 rounded hover:bg-accent/20 hover:text-accent transition-colors font-medium border border-border/50">
          <Eye size={12} /> View
        </button>
      </div>
    )},
    { key: 'status', header: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'error_message', header: 'Error', render: (val) => val ? (
      <span className="max-w-[150px] truncate block text-danger text-xs">{val}</span>
    ) : '—' },
    { key: 'sent_by_name', header: 'Sent By', render: (val) => (
      <span className="text-text-muted text-xs">{val || '—'}</span>
    )},
    { key: 'sent_at', header: 'Date', render: (val) => (
      <span className="text-text-muted text-xs">{new Date(val).toLocaleString()}</span>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard icon={Send} label="Total Sent" value={total} color="accent" />
        <StatsCard icon={CheckCircle} label="Delivered Rate" value={total > 0 ? "98%" : "0%"} color="success" />
        <StatsCard icon={AlertTriangle} label="Failed Messages" value={0} color="danger" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Message Logs</h1>
          <p className="text-sm text-text-muted mt-1">Complete history of sent messages</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={channelFilter}
            onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-bg-surface border border-border rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-accent/50 transition-all"
          >
            <option value="All">All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-bg-surface border border-border rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-accent/50 transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        total={total}
        page={page}
        pages={pages}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No messages sent yet"
      />

      <Modal isOpen={!!viewMessage} onClose={() => setViewMessage(null)} title="Full Message" maxWidth="max-w-xl">
        <div className="p-4 bg-bg-elevated rounded-xl text-sm whitespace-pre-wrap text-text-primary border border-border/50 max-h-[60vh] overflow-y-auto leading-relaxed">
          {viewMessage}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => setViewMessage(null)} className="px-4 py-2 bg-bg-surface border border-border rounded-lg hover:bg-bg-hover transition-colors text-sm font-medium">Close</button>
        </div>
      </Modal>
    </div>
  );
}

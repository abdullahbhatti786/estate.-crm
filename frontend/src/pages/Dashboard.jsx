import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import DashboardCalendar from '../components/DashboardCalendar';
import { Users, Building2, Send, Calendar, MoreHorizontal, ArrowRight, Clock } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Pagination states
  const [paymentPage, setPaymentPage] = useState(1);
  const [leasePage, setLeasePage] = useState(1);
  const itemsPerPage = 5;

  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentPayments = stats?.upcomingPayments?.slice((paymentPage - 1) * itemsPerPage, paymentPage * itemsPerPage) || [];
  const totalPaymentPages = Math.ceil((stats?.upcomingPayments?.length || 0) / itemsPerPage);

  const currentLeases = stats?.expiringSoon?.slice((leasePage - 1) * itemsPerPage, leasePage * itemsPerPage) || [];
  const totalLeasePages = Math.ceil((stats?.expiringSoon?.length || 0) / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Overview of your real estate operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatsCard
          icon={Users}
          label="Total Leads"
          value={stats?.totalLeads || 0}
          color="accent"
          trend={12}
        />
        <StatsCard
          icon={Building2}
          label="Active Leases"
          value={stats?.activeLeases || 0}
          color="accent"
          trend={3}
        />
        <StatsCard
          icon={Calendar}
          label="Expiring Soon (30d)"
          value={stats?.expiringSoonCount || 0}
          color="warning"
          actionReq={stats?.expiringSoonCount > 0}
        />
        <StatsCard
          icon={Send}
          label="Messages Sent"
          value={stats?.totalMessages || 0}
          color="accent"
          trend={20}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Recent Leads</h2>
            <button className="text-text-muted hover:text-text-primary"><MoreHorizontal size={18} /></button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-bold text-text-muted uppercase tracking-widest">Name</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 text-right text-[11px] font-bold text-text-muted uppercase tracking-widest">Date Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stats?.recentLeads?.length > 0 ? (
                stats.recentLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-bg-hover/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-text-primary">{lead.name}</td>
                    <td className="px-5 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-5 py-3 text-right text-text-secondary">
                      {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="px-5 py-4 text-center text-text-muted">No leads yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Expiring Leases */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Expiring Leases</h2>
            <button onClick={() => navigate('/properties')} className="text-xs font-medium text-text-secondary hover:text-text-primary flex items-center gap-1">View All <ArrowRight size={14} /></button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-bold text-text-muted uppercase tracking-widest">Unit</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-text-muted uppercase tracking-widest">Tenant</th>
                <th className="px-5 py-3 text-right text-[11px] font-bold text-text-muted uppercase tracking-widest">Days Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {currentLeases.length > 0 ? (
                currentLeases.map((p) => (
                  <tr key={p.id} className="hover:bg-bg-hover/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-text-primary">{p.apartment_unit}</td>
                    <td className="px-5 py-3 text-text-secondary">{p.tenant_name}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border bg-bg-primary/50 ${p.daysRemaining <= 14 ? 'text-warning border-warning/20' : 'text-text-secondary border-border'}`}>
                        {p.daysRemaining <= 14 && <Clock size={12} />}
                        {p.daysRemaining <= 0 ? 'Expired' : `${String(p.daysRemaining).padStart(2, '0')} Days`}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="px-5 py-4 text-center text-text-muted">No expiring leases</td></tr>
              )}
            </tbody>
          </table>
          {totalLeasePages > 1 && (
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <button 
                disabled={leasePage === 1} 
                onClick={() => setLeasePage(p => p - 1)}
                className="text-xs font-medium text-text-secondary disabled:opacity-50 hover:text-text-primary"
              >
                Previous
              </button>
              <span className="text-xs text-text-muted">Page {leasePage} of {totalLeasePages}</span>
              <button 
                disabled={leasePage === totalLeasePages} 
                onClick={() => setLeasePage(p => p + 1)}
                className="text-xs font-medium text-text-secondary disabled:opacity-50 hover:text-text-primary"
              >
                Next
              </button>
            </div>
          )}
        </div>
        {/* Upcoming Payments */}
        <div className="glass-card overflow-hidden sm:col-span-1 lg:col-span-2">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Upcoming Payments & Reminders</h2>
            <button onClick={() => navigate('/properties')} className="text-xs font-medium text-text-secondary hover:text-text-primary flex items-center gap-1">View All <ArrowRight size={14} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-text-muted uppercase tracking-widest">Unit / Tenant</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-text-muted uppercase tracking-widest">Amount</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-text-muted uppercase tracking-widest">Mode</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-text-muted uppercase tracking-widest">Due Date</th>
                  <th className="px-5 py-3 text-right text-[11px] font-bold text-text-muted uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {currentPayments.length > 0 ? (
                  currentPayments.map(p => (
                    <tr key={p.id} className="hover:bg-bg-hover/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-text-primary">{p.apartment_unit}</div>
                        <div className="text-xs text-text-secondary">{p.tenant_name}</div>
                      </td>
                      <td className="px-5 py-3 font-medium text-accent">AED {Number(p.amount).toLocaleString()}</td>
                      <td className="px-5 py-3 text-text-secondary">{p.payment_mode}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border bg-bg-primary/50 ${p.status === 'Overdue' ? 'text-danger border-danger/20' : 'text-warning border-warning/20'}`}>
                          {new Date(p.due_date).toLocaleDateString()} ({p.status})
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => navigate('/properties', { state: { search: p.apartment_unit } })} className="px-3 py-1.5 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 ml-auto">
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-5 py-4 text-center text-text-muted">No upcoming payments</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPaymentPages > 1 && (
            <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-bg-surface">
              <button 
                disabled={paymentPage === 1} 
                onClick={() => setPaymentPage(p => p - 1)}
                className="text-xs font-medium text-text-secondary disabled:opacity-50 hover:text-text-primary"
              >
                Previous
              </button>
              <span className="text-xs text-text-muted">Page {paymentPage} of {totalPaymentPages}</span>
              <button 
                disabled={paymentPage === totalPaymentPages} 
                onClick={() => setPaymentPage(p => p + 1)}
                className="text-xs font-medium text-text-secondary disabled:opacity-50 hover:text-text-primary"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Calendar View - Spans full width at the bottom */}
        <div className="sm:col-span-1 lg:col-span-2 mt-2">
          <DashboardCalendar />
        </div>
      </div>
    </div>
  );
}

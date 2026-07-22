import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { toast } from '../components/Toast';
import { Plus, Pencil, Trash2, Shield, UserCheck, UserX } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ username: '', full_name: '', email: '', password: '', role: 'agent' });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.users);
    } catch {
      toast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/auth/register', form);
      toast('User created successfully', 'success');
      setModalOpen(false);
      setForm({ username: '', full_name: '', email: '', password: '', role: 'agent' });
      fetchUsers();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to create user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/auth/users/${user.id}`, { is_active: user.is_active ? 0 : 1 });
      toast(`User ${user.is_active ? 'deactivated' : 'activated'}`, 'success');
      fetchUsers();
    } catch {
      toast('Failed to update user', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      toast('User deleted', 'success');
      fetchUsers();
    } catch (err) {
      toast(err.response?.data?.error || 'Cannot delete', 'error');
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">User Management</h1>
          <p className="text-sm text-text-muted mt-1">Manage agent accounts and permissions</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-bg-primary font-bold rounded-lg hover:bg-accent-hover transition-all duration-300">
          <Plus size={16} /> <span>Add User</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {users.map(user => (
            <div key={user.id} className="glass-card p-5 hover:border-border-light transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    user.role === 'admin' ? 'bg-accent-dim/30 text-accent border border-accent/20' : 'bg-info-dim/30 text-info border border-info/20'
                  }`}>
                    {user.full_name?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text-primary">{user.full_name}</div>
                    <div className="text-xs text-text-muted">@{user.username}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {user.role === 'admin' && <Shield size={14} className="text-accent" />}
                  <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-success' : 'bg-danger'}`} />
                </div>
              </div>

              <div className="text-sm text-text-secondary mb-4 bg-bg-surface px-3 py-2 rounded-md border border-border">
                {user.email || 'No email provided'}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'admin' ? 'bg-accent-dim text-accent' : 'bg-bg-elevated text-text-secondary'
                  }`}>{user.role}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    user.is_active ? 'bg-success-dim/30 text-success' : 'bg-danger-dim/30 text-danger'
                  }`}>{user.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                {user.role !== 'admin' && (
                  <div className="flex gap-1">
                    <button onClick={() => toggleActive(user)}
                      className="p-1.5 rounded-md bg-bg-surface border border-border text-text-muted hover:text-warning hover:border-warning/30 transition-all"
                      title={user.is_active ? 'Deactivate' : 'Activate'}>
                      {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                    <button onClick={() => handleDelete(user.id)}
                      className="p-1.5 rounded-md bg-bg-surface border border-border text-text-muted hover:text-danger hover:border-danger/30 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add New User" maxWidth="max-w-md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name *</label>
            <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Username *</label>
            <input type="text" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputClass} placeholder="johndoe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="john@company.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Password *</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} placeholder="Min 6 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass}>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-bg-surface border border-border rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-accent text-bg-primary font-bold rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-all">
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

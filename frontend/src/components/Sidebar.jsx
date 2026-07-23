import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Upload, MessageSquare,
  ClipboardList, LogOut, ChevronLeft, ChevronRight, Settings, Box, Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from './Toast';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/leads', icon: Users, label: 'Sales Pipeline' },
  { path: '/data-working', icon: ClipboardList, label: 'Data Working' },
  { path: '/properties', icon: Building2, label: 'Properties' },
  { path: '/inventory', icon: Box, label: 'Inventory' },
  { path: '/upload', icon: Upload, label: 'Excel Import' },
  { path: '/messaging', icon: MessageSquare, label: 'Messaging' },
  { path: '/message-logs', icon: ClipboardList, label: 'Message Logs' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const adminItems = [
  { path: '/users', icon: Settings, label: 'User Management' },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const collapsed = false;

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', password: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user && isProfileOpen) {
      setProfileForm({ full_name: user.full_name || '', email: user.email || '', password: '' });
    }
  }, [user, isProfileOpen]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/auth/profile', profileForm);
      toast('Profile updated successfully! Refreshing...', 'success');
      setTimeout(() => window.location.reload(), 1500); // Reload to reflect changes globally
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed left-0 top-0 h-screen bg-bg-surface border-r border-border flex flex-col z-30 transition-transform duration-300 w-[260px] ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      {/* Logo */}
      <div className="px-5 py-6 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
          <img src="https://ui-avatars.com/api/?name=Nexus+CRM&background=18181b&color=0cd69b" alt="Logo" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in flex-1">
            <div className="text-lg font-bold text-accent tracking-tight">Nexus CRM</div>
            <div className="text-[11px] text-text-muted mt-0.5">Elite Portfolio</div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className={`text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-3 ${collapsed ? 'text-center' : 'px-3'}`}>
          {collapsed ? '•' : 'Menu'}
        </div>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-200 group relative
              ${isActive
                ? 'bg-accent-dim/50 text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
                <item.icon size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
                {!collapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}

        {/* Admin Section */}
        {user?.role === 'admin' && (
          <>
            <div className={`text-[10px] font-semibold text-text-muted uppercase tracking-widest mt-6 mb-3 ${collapsed ? 'text-center' : 'px-3'}`}>
              {collapsed ? '•' : 'Admin'}
            </div>
            {adminItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-accent-dim/50 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
                    <item.icon size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    {!collapsed && <span>{item.label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-4 space-y-4">
        {/* Quick Add Button */}
        <button
          onClick={() => {
            const addBtn = document.getElementById('add-lead-btn');
            if (addBtn) addBtn.click();
            else window.location.href = '/leads';
          }}
          className={`flex items-center justify-center gap-2 w-full py-2.5 bg-accent text-bg-primary font-semibold rounded-lg hover:bg-accent-hover transition-all duration-300 ${collapsed ? 'px-0' : 'px-4'}`}
        >
          <Plus size={18} />
          {!collapsed && <span>Quick Add Lead</span>}
        </button>

        {/* User info */}
        <div 
          onClick={() => setIsProfileOpen(true)}
          className={`flex items-center gap-3 p-3 rounded-xl border border-border bg-bg-primary/50 cursor-pointer hover:border-accent hover:shadow-md transition-all ${collapsed ? 'justify-center' : ''}`}
          title="Profile Settings"
        >
          <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-text-primary text-xs font-bold shrink-0 overflow-hidden">
            <img src={`https://ui-avatars.com/api/?name=${user?.full_name}&background=27272a&color=f4f4f5`} alt="User" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{user?.full_name}</div>
              <div className="text-[10px] text-text-muted">{user?.role === 'admin' ? 'Senior Broker' : 'Agent'}</div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className={`flex items-center justify-center gap-2 w-full py-2.5 mt-2 bg-danger-dim/50 text-danger font-semibold rounded-xl hover:bg-danger hover:text-white transition-all duration-300 ${collapsed ? 'px-0' : 'px-4'}`}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>

    {/* Profile Settings Modal */}
    {isProfileOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md animate-slide-up overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-bg-elevated flex justify-between items-center">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Settings size={20} className="text-accent" /> Profile Settings
            </h2>
            <button onClick={() => setIsProfileOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
              <Plus size={24} className="rotate-45" />
            </button>
          </div>
          <form onSubmit={handleProfileSave} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Username (Read-only)</label>
              <input type="text" value={user?.username || ''} disabled className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-muted cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
              <input 
                type="text" 
                required 
                value={profileForm.full_name} 
                onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border rounded-xl text-text-primary focus:border-accent outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
              <input 
                type="email" 
                value={profileForm.email} 
                onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border rounded-xl text-text-primary focus:border-accent outline-none" 
              />
            </div>
            <div className="pt-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">New Password</label>
              <input 
                type="password" 
                placeholder="Leave blank to keep current password"
                value={profileForm.password} 
                onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border rounded-xl text-text-primary focus:border-accent outline-none" 
              />
            </div>
            <div className="pt-4 flex gap-3">
              <button 
                type="button" 
                onClick={() => setIsProfileOpen(false)}
                className="flex-1 py-2.5 bg-bg-elevated hover:bg-bg-hover text-text-primary font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={savingProfile}
                className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-bg-primary font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}

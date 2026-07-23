
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Search, Bell, LogOut, Menu } from 'lucide-react';
import api from './services/api';
import ToastContainer from './components/Toast';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Properties from './pages/Properties';
import Inventory from './pages/Inventory';
import Upload from './pages/Upload';
import Messaging from './pages/Messaging';
import MessageLogs from './pages/MessageLogs';
import UserManagement from './pages/UserManagement';
import DataWorking from './pages/DataWorking';

function ProtectedRoute() {
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readNotifs, setReadNotifs] = useState(() => {
    try {
      const saved = localStorage.getItem(`readNotifs_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/dashboard/notifications');
        setNotifications(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifs();
    const int = setInterval(fetchNotifs, 60000); // refresh every minute
    return () => clearInterval(int);
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchResults(null);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const delay = setTimeout(async () => {
      setIsSearching(true);
      setSearchResults(null);
      try {
        const [leadsRes, propsRes] = await Promise.all([
          api.get('/leads', { params: { search: searchQuery, limit: 3 } }),
          api.get('/properties', { params: { search: searchQuery, limit: 3 } })
        ]);
        setSearchResults({
          leads: leadsRes.data.leads || [],
          properties: propsRes.data.properties || []
        });
      } catch (err) {
        console.error("Search failed", err);
        setSearchResults({ error: err.message || "Failed to search" });
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleMarkAsRead = (id) => {
    if (!readNotifs.includes(id)) {
      const newRead = [...readNotifs, id];
      setReadNotifs(newRead);
      localStorage.setItem(`readNotifs_${user?.id}`, JSON.stringify(newRead));
    }
    setShowNotifications(false);
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifs(allIds);
    localStorage.setItem(`readNotifs_${user?.id}`, JSON.stringify(allIds));
  };

  const unreadCount = notifications.filter(n => !readNotifs.includes(n.id)).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <span className="text-text-muted text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full lg:ml-[260px]`}>
        {/* Topbar */}
        <header className="h-[80px] lg:h-[100px] border-b border-border bg-bg-primary/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8 gap-2 lg:gap-4">
          <div className="flex items-center gap-2 lg:gap-4 w-full max-w-xl relative">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors lg:hidden">
              <Menu size={24} />
            </button>
            <div className="relative flex-1" ref={searchRef}>
              <Search size={20} className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none lg:w-[25px] lg:h-[25px]" />
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-bg-surface border border-border rounded-xl pl-10 lg:pl-12 pr-4 py-2 lg:py-3 text-sm lg:text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all shadow-sm"
              />
              <div className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 px-1.5 lg:px-2 py-0.5 lg:py-1 bg-bg-elevated rounded text-[10px] lg:text-xs text-text-muted font-medium border border-border pointer-events-none hidden sm:block">⌘K</div>

              {/* Search Results */}
              {(searchResults || isSearching) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden z-50 min-h-[100px]">
                  {isSearching ? (
                    <div className="p-8 text-center text-text-muted text-sm flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                      Searching the database...
                    </div>
                  ) : searchResults?.error ? (
                    <div className="p-8 text-center text-danger text-sm font-semibold">
                      Error: {searchResults.error}
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {searchResults.leads?.length === 0 && searchResults.properties?.length === 0 ? (
                        <div className="p-8 text-center flex flex-col gap-2">
                          <span className="text-base font-semibold text-text-primary">No results found</span>
                          <span className="text-sm text-text-muted">We couldn't find anything matching "{searchQuery}"</span>
                        </div>
                      ) : (
                        <>
                          {searchResults.leads.length > 0 && (
                            <div>
                              <div className="px-4 py-2 text-xs font-semibold text-text-muted bg-bg-elevated/50">Leads</div>
                              {searchResults.leads.map(lead => (
                                <Link
                                  key={lead.id}
                                  to="/leads"
                                  onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                                  className="block px-4 py-3 hover:bg-bg-hover border-b border-border/50 transition-colors"
                                >
                                  <div className="font-medium text-sm text-text-primary">{lead.name}</div>
                                  <div className="text-xs text-text-secondary mt-0.5">{lead.phone} • {lead.status}</div>
                                </Link>
                              ))}
                            </div>
                          )}
                          {searchResults.properties.length > 0 && (
                            <div>
                              <div className="px-4 py-2 text-xs font-semibold text-text-muted bg-bg-elevated/50">Properties</div>
                              {searchResults.properties.map(prop => (
                                <Link
                                  key={prop.id}
                                  to="/properties"
                                  onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                                  className="block px-4 py-3 hover:bg-bg-hover transition-colors"
                                >
                                  <div className="font-medium text-sm text-text-primary">Unit {prop.apartment_unit}</div>
                                  <div className="text-xs text-text-secondary mt-0.5">{prop.tenant_name} • {prop.payment_status}</div>
                                </Link>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-text-muted hover:text-text-primary transition-colors relative bg-bg-surface rounded-full border border-border hover:border-accent/50 hover:shadow-sm"
              >
                <Bell size={25} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-accent rounded-full text-[10px] font-bold text-bg-primary animate-pulse-glow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {showNotifications && (
                <div className="fixed left-4 right-4 top-[75px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-96 max-h-[80vh] overflow-y-auto glass-card shadow-2xl animate-fade-in z-50 rounded-2xl flex flex-col border border-border/50">
                  <div className="px-5 py-4 border-b border-border bg-bg-surface/90 sticky top-0 z-10 backdrop-blur-md flex items-center justify-between">
                    <h3 className="text-base font-bold text-text-primary">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-accent hover:text-accent-hover font-semibold">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="px-5 py-10 text-center text-base text-text-muted">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map(n => {
                        const isRead = readNotifs.includes(n.id);
                        return (
                          <Link
                            key={n.id}
                            to={n.link}
                            onClick={() => handleMarkAsRead(n.id)}
                            className={`px-5 py-4 hover:bg-bg-hover transition-colors flex flex-col gap-1.5 relative ${isRead ? 'opacity-75' : 'bg-bg-elevated/50'}`}
                          >
                            {!isRead && (
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-accent rounded-full" />
                            )}
                            <div className="flex items-center justify-between gap-2 pl-3">
                              <span className={`text-base font-bold ${isRead ? 'text-text-secondary' : 'text-text-primary'}`}>{n.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded font-bold ${n.type === 'danger' ? 'bg-danger-dim text-danger' :
                                  n.type === 'warning' ? 'bg-warning-dim text-warning' :
                                    'bg-info-dim text-info'
                                }`}>
                                {n.type === 'danger' ? 'Urgent' : n.type === 'warning' ? 'Warning' : 'Info'}
                              </span>
                            </div>
                            <p className="text-base text-text-secondary leading-relaxed pl-3">{n.message}</p>
                            <span className="text-xs text-text-muted mt-1 pl-3 font-medium">
                              {new Date(n.date).toLocaleDateString()}
                            </span>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/data-working" element={<DataWorking />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/messaging" element={<Messaging />} />
            <Route path="/message-logs" element={<MessageLogs />} />
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

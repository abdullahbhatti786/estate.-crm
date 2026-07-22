import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, User, Lock } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] animate-fade-in space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-full overflow-hidden mb-5">
            <img src="https://ui-avatars.com/api/?name=Nexus+CRM&background=18181b&color=0cd69b" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Welcome back</h1>
          <p className="text-sm text-text-muted mt-2">Sign in to Nexus CRM</p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-danger-dim border border-danger/30 text-danger text-sm animate-fade-in">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>

              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full pl-11 pr-11 py-3 bg-bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-border bg-bg-surface accent-accent cursor-pointer" />
                <span className="text-text-secondary group-hover:text-text-primary transition-colors">Keep me logged in</span>
              </label>
              <a href="#" className="text-accent hover:text-accent-hover font-medium transition-colors">Forgot password?</a>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent text-bg-primary font-bold rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-all duration-300 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin mx-auto" />
              ) : (
                'Login to Dashboard'
              )}
            </button>
          </form>
        </div>

        {/* Footer Links */}
        <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
          <a href="#" className="hover:text-text-primary transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-text-primary transition-colors">Terms of Service</a>
          <span>•</span>
          <a href="#" className="hover:text-text-primary transition-colors">Support</a>
        </div>
      </div>
    </div>
  );
}

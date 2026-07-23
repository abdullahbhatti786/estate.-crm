import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from '../components/Toast';
import { Mail, MessageSquare, Save } from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [gmailSenderName, setGmailSenderName] = useState('');
  const [gmailEmail, setGmailEmail] = useState('');
  const [gmailPassword, setGmailPassword] = useState('');
  const [hasGmailPassword, setHasGmailPassword] = useState(false);

  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [hasWhatsappToken, setHasWhatsappToken] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await api.get('/auth/integrations');
      setGmailSenderName(res.data.gmail_sender_name || '');
      setGmailEmail(res.data.gmail_email || '');
      setHasGmailPassword(res.data.has_gmail_password);
      setWhatsappPhoneId(res.data.whatsapp_phone_number_id || '');
      setHasWhatsappToken(res.data.has_whatsapp_token);
    } catch (err) {
      toast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        gmail_sender_name: gmailSenderName,
        gmail_email: gmailEmail,
        whatsapp_phone_number_id: whatsappPhoneId
      };
      // Only send passwords if they typed something new
      if (gmailPassword) payload.gmail_app_password = gmailPassword;
      if (whatsappToken) payload.whatsapp_access_token = whatsappToken;

      await api.put('/auth/integrations', payload);
      toast('Integrations saved successfully', 'success');
      setGmailPassword('');
      setWhatsappToken('');
      fetchIntegrations(); // Refresh status
    } catch (err) {
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-bg-primary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all";

  if (loading) return <div className="p-8 text-text-secondary">Loading settings...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full animate-fade-in pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Settings & Integrations</h1>
        <p className="text-sm text-text-muted mt-1">Manage your personal API keys for sending emails and WhatsApp messages.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Gmail Card */}
        <div className="bg-bg-surface border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-info-dim/20 text-info rounded-lg">
              <Mail size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Gmail Integration</h2>
              <p className="text-xs text-text-muted">Used for sending bulk emails. Requires a Google App Password.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Sender Name (Optional)</label>
              <input 
                type="text" 
                value={gmailSenderName} 
                onChange={(e) => setGmailSenderName(e.target.value)} 
                className={inputClass} 
                placeholder="e.g. John Doe - Real Estate" 
              />
              <p className="text-[10px] text-text-muted mt-1">This name will appear as the sender instead of your raw email address.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Gmail Address</label>
              <input 
                type="email" 
                value={gmailEmail} 
                onChange={(e) => setGmailEmail(e.target.value)} 
                className={inputClass} 
                placeholder="you@gmail.com" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                App Password {hasGmailPassword && <span className="text-success text-xs ml-2">(Saved ✓)</span>}
              </label>
              <input 
                type="password" 
                value={gmailPassword} 
                onChange={(e) => setGmailPassword(e.target.value)} 
                className={inputClass} 
                placeholder={hasGmailPassword ? "Leave blank to keep saved password" : "16-character app password"} 
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Card */}
        <div className="bg-bg-surface border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-success-dim/20 text-success rounded-lg">
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">WhatsApp Cloud API</h2>
              <p className="text-xs text-text-muted">Used for sending bulk WhatsApp messages via Meta.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone Number ID</label>
              <input 
                type="text" 
                value={whatsappPhoneId} 
                onChange={(e) => setWhatsappPhoneId(e.target.value)} 
                className={inputClass} 
                placeholder="e.g. 104928374928374" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Access Token {hasWhatsappToken && <span className="text-success text-xs ml-2">(Saved ✓)</span>}
              </label>
              <input 
                type="password" 
                value={whatsappToken} 
                onChange={(e) => setWhatsappToken(e.target.value)} 
                className={inputClass} 
                placeholder={hasWhatsappToken ? "Leave blank to keep saved token" : "EAAJ..."} 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-bg-primary font-bold rounded-lg hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

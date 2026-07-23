import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import { toast } from '../components/Toast';
import { MessageSquare, Send, AlertTriangle, Info, Sparkles, Copy, RefreshCw, Image as ImageIcon, X, Paperclip } from 'lucide-react';

export default function Messaging() {
  const [source, setSource] = useState('leads');
  const [contacts, setContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('whatsapp');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [aiError, setAiError] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [aiImage, setAiImage] = useState(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const res = await api.get(`/${source}`, { params: { limit: 100 } });
      const data = source === 'leads' ? res.data.leads : res.data.properties;
      setContacts(data);
    } catch {
      toast('Failed to load contacts', 'error');
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  useEffect(() => {
    api.get('/messages/status').then(res => setServiceStatus(res.data)).catch(() => {});
  }, []);

  const getSelectedContacts = () => {
    return contacts.filter(c => selectedIds.includes(c.id)).map(c => {
      if (source === 'leads') {
        return { id: c.id, name: c.name, phone: c.phone, email: c.email };
      }
      return { id: c.id, name: c.tenant_name, phone: c.tenant_phone, email: c.tenant_email };
    });
  };

  const handleSend = async () => {
    const selected = getSelectedContacts();
    if (selected.length === 0) { toast('Select at least one contact', 'warning'); return; }
    if (!message) { toast('Enter a message', 'warning'); return; }
    if (channel === 'email' && !subject) { toast('Enter an email subject', 'warning'); return; }

    setSending(true);
    setSendResult(null);
    try {
      const endpoint = channel === 'whatsapp' ? '/messages/whatsapp' : '/messages/email';
      const body = { 
        contacts: selected, 
        message, 
        source_table: source,
        attachments: attachments 
      };
      if (channel === 'email') body.subject = subject;

      const res = await api.post(endpoint, body);
      setSendResult(res.data);
      toast(`Sent to ${res.data.summary.sent}/${res.data.summary.total} contacts`, 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt) return;
    setAiGenerating(true);
    setAiError('');
    setAiDraft('');
    try {
      const body = { prompt: aiPrompt, channel, history: chatHistory };
      if (aiImage) {
        body.image = { data: aiImage.data, mimeType: aiImage.mimeType };
      }
      const res = await api.post('/ai/generate', body);
      setAiDraft(res.data.text);
      
      // Update history (keep last 10)
      setChatHistory(prev => {
        const newHistory = [...prev, { prompt: aiPrompt, response: res.data.text }];
        return newHistory.slice(-10); // Keep only last 10 messages
      });
    } catch (err) {
      if (err.response?.data?.missing_key) {
        setAiError(err.response.data.error);
      } else {
        setAiError('Failed to generate message. ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCopyDraft = () => {
    let draftText = aiDraft;
    const subjectMatch = draftText.match(/^Subject:\s*(.*)/i);
    if (subjectMatch) {
      setSubject(subjectMatch[1].trim());
      draftText = draftText.replace(/^Subject:\s*(.*)\n*/i, '').trim();
    }
    setMessage(draftText);
    toast('Draft copied to composer', 'success');
  };

  const handleAiImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3.5 * 1024 * 1024) return toast('File must be under 3.5MB', 'error');
      const reader = new FileReader();
      reader.onloadend = () => {
        setAiImage({ data: reader.result.split(',')[1], mimeType: file.type, preview: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3.5 * 1024 * 1024) return toast('File must be under 3.5MB', 'error');
    
    const formData = new FormData();
    formData.append('document', file);
    setUploadingAttachment(true);
    try {
      const res = await api.post('/upload/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachments(prev => [...prev, { url: res.data.documentUrl, name: res.data.documentName }]);
      e.target.value = ''; // Reset input
    } catch (err) {
      toast('Failed to upload file', 'error');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const previewMessage = () => {
    const selected = getSelectedContacts();
    if (selected.length === 0) return message;
    const first = selected[0];
    return message
      .replace(/\{\{name\}\}/gi, first.name || '')
      .replace(/\{\{phone\}\}/gi, first.phone || '')
      .replace(/\{\{email\}\}/gi, first.email || '');
  };

  const leadColumns = [
    { key: 'name', header: 'Name', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email', render: (val) => val || '—' },
  ];

  const propertyColumns = [
    { key: 'tenant_name', header: 'Tenant', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'tenant_phone', header: 'Phone' },
    { key: 'tenant_email', header: 'Email', render: (val) => val || '—' },
    { key: 'apartment_unit', header: 'Unit' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Messaging</h1>
        <p className="text-sm text-text-muted mt-1">Send bulk WhatsApp and Email messages</p>
      </div>

      {/* Service Status */}
      {serviceStatus && (
        <div className="flex gap-3">
          {['whatsapp', 'email'].map(svc => {
            const info = serviceStatus[svc];
            return (
              <div key={svc} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
                info?.mode === 'DUMMY' ? 'bg-warning-dim border-warning/30 text-warning' : 'bg-success-dim border-success/30 text-success'
              }`}>
                <div className={`w-2 h-2 rounded-full ${info?.mode === 'DUMMY' ? 'bg-warning' : 'bg-success'}`} />
                {svc === 'whatsapp' ? 'WhatsApp' : 'Email'}: {info?.mode || 'Unknown'}
              </div>
            );
          })}
        </div>
      )}

      {serviceStatus?.whatsapp?.mode === 'DUMMY' && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-warning-dim border border-warning/30">
          <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-warning">
            Running in <strong>DUMMY mode</strong>. Messages are simulated, not actually sent. Configure API keys in <code>.env</code> for live messaging.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Column 1: Contact Selection */}
        <div className="xl:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm font-medium text-text-secondary">Select from:</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="px-3 py-1.5 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-all"
            >
              <option value="leads">Leads</option>
              <option value="properties">Properties (Tenants)</option>
            </select>
          </div>

          <DataTable
            columns={source === 'leads' ? leadColumns : propertyColumns}
            data={contacts}
            total={contacts.length}
            page={1}
            pages={1}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            loading={loading}
            emptyMessage="No contacts found"
            searchPlaceholder="Search contacts..."
          />
        </div>

        {/* Column 2: AI Assistant */}
        <div className="space-y-4 xl:col-span-1">
          <div className="glass-card p-4 h-full flex flex-col border border-accent/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-accent" />
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">AI Assistant</h2>
            </div>
            
            <label className="block text-sm font-medium text-text-secondary mb-2">What do you want to say?</label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (aiPrompt) handleAIGenerate();
                }
              }}
              rows={3}
              className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 transition-all resize-none mb-2"
              placeholder="e.g. Write a friendly rent reminder for next week..."
            />
            
            {aiImage && (
              <div className="relative inline-block mb-3 bg-bg-surface p-1 rounded-lg border border-border">
                {aiImage.mimeType === 'application/pdf' ? (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm text-text-primary">
                    <Paperclip size={16} className="text-accent" /> <span className="font-medium text-xs">PDF Document</span>
                  </div>
                ) : (
                  <img src={aiImage.preview} alt="Context" className="h-16 rounded-lg object-cover" />
                )}
                <button onClick={() => setAiImage(null)} className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-0.5 hover:bg-danger-hover">
                  <X size={12} />
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-3">
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-elevated border border-border rounded-lg hover:border-accent cursor-pointer transition-colors">
                <ImageIcon size={14} /> Add File
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleAiImageUpload} />
              </label>
            </div>

            <button
              onClick={handleAIGenerate}
              disabled={aiGenerating || !aiPrompt}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-bg-elevated text-accent font-semibold rounded-xl border border-accent/30 hover:bg-accent hover:text-white disabled:opacity-50 transition-all duration-300"
            >
              {aiGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {aiGenerating ? 'Generating...' : 'Generate Draft'}
            </button>

            {aiError && (
              <div className="mt-4 p-3 bg-danger-dim border border-danger/30 rounded-lg text-xs text-danger">
                <p className="font-medium mb-1">AI Error</p>
                <p>{aiError}</p>
                {aiError.includes('API Key') && (
                  <p className="mt-1 text-[10px] text-danger/80">
                    Add GEMINI_API_KEY to your backend/.env file and restart the server.
                  </p>
                )}
              </div>
            )}

            {aiDraft && (
              <div className="mt-4 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-success uppercase tracking-wider">AI Draft</span>
                  <button onClick={handleCopyDraft} className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-medium bg-accent/10 px-2 py-1 rounded">
                    <Copy size={12} /> Use this
                  </button>
                </div>
                <div className="bg-bg-elevated p-3 rounded-xl border border-border text-sm text-text-secondary whitespace-pre-wrap flex-1 min-h-[100px] max-h-[300px] overflow-y-auto">
                  {aiDraft}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Message Composer */}
        <div className="space-y-4 xl:col-span-1">
          {/* Channel */}
          <div className="glass-card p-4">
            <label className="block text-sm font-medium text-text-secondary mb-3">Channel</label>
            <div className="flex bg-bg-surface border border-border rounded-lg p-1">
              <button
                onClick={() => setChannel('whatsapp')}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                  channel === 'whatsapp' ? 'bg-bg-elevated text-success shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                📱 WhatsApp
              </button>
              <button
                onClick={() => setChannel('email')}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                  channel === 'email' ? 'bg-bg-elevated text-info shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                📧 Email
              </button>
            </div>
          </div>

          {/* Subject (email only) */}
          {channel === 'email' && (
            <div className="glass-card p-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line..."
                className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 transition-all"
              />
            </div>
          )}

          {/* Message */}
          <div className="glass-card p-4">
            <label className="block text-sm font-medium text-text-secondary mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent/50 transition-all resize-none"
              placeholder="Type your message here... Use {{name}} to personalize."
            />
            <div className="flex gap-2 mt-2">
              {['{{name}}', '{{phone}}', '{{email}}'].map(p => (
                <button
                  key={p}
                  onClick={() => setMessage(prev => prev + ' ' + p)}
                  className="px-2 py-1 rounded-lg bg-bg-elevated text-xs text-accent border border-accent/20 hover:bg-accent-dim transition-all"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 mb-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-surface border border-border rounded-md text-xs text-text-secondary">
                    <Paperclip size={12} className="text-accent" />
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <button onClick={() => removeAttachment(idx)} className="ml-1 text-danger hover:text-danger-hover">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary hover:border-accent cursor-pointer transition-colors disabled:opacity-50">
              {uploadingAttachment ? <RefreshCw size={18} className="animate-spin text-accent" /> : <Paperclip size={18} className="text-text-muted" />}
              <input type="file" className="hidden" onChange={handleAttachmentUpload} disabled={uploadingAttachment} />
            </label>
            
            <button
              onClick={handleSend}
              disabled={sending || getSelectedContacts().length === 0 || !message || (channel === 'email' && !subject)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  Send to {selectedIds.length} contact{selectedIds.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>

          {/* Preview */}
          {message && selectedIds.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} className="text-info" />
                <span className="text-xs font-medium text-text-muted">Preview (first contact)</span>
              </div>
              <p className="text-sm text-text-secondary whitespace-pre-wrap bg-bg-elevated rounded-xl p-3">{previewMessage()}</p>
            </div>
          )}


          {/* Results */}
          {sendResult && (
            <div className="glass-card p-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Send Results ({sendResult.mode} mode)</h3>
              <div className="flex gap-6 mb-3">
                <div><span className="text-lg font-bold text-success">{sendResult.summary.sent}</span> <span className="text-xs text-text-muted">sent</span></div>
                <div><span className="text-lg font-bold text-danger">{sendResult.summary.failed}</span> <span className="text-xs text-text-muted">failed</span></div>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {sendResult.results.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${
                    r.status === 'sent' ? 'bg-success-dim/50 text-success' : 'bg-danger-dim/50 text-danger'
                  }`}>
                    <span>{r.contact}</span>
                    <span>{r.status === 'sent' ? '✓ Sent' : `✗ ${r.error}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { toast } from '../components/Toast';
import { Send, User, Clock, RefreshCw, MessageCircle } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function Inbox() {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  const fetchThreads = async () => {
    try {
      const res = await api.get('/chat/threads');
      setThreads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (threadId) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/messages/${threadId}`);
      setMessages(res.data);
      
      // Update local unread count
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unread_count: 0 } : t));
    } catch (err) {
      toast('Failed to load messages', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchThreads();
    // Poll for new messages every 10 seconds
    const interval = setInterval(() => {
      fetchThreads();
      if (activeThread) {
        // Silent fetch to update current chat
        api.get(`/chat/messages/${activeThread.id}`).then(res => setMessages(res.data)).catch(() => {});
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectThread = (thread) => {
    setActiveThread(thread);
    fetchMessages(thread.id);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread) return;

    const textToSend = replyText;
    setReplyText('');
    setSending(true);

    // Optimistic UI update
    const tempMsg = {
      id: Date.now().toString(),
      sender: 'agent',
      message: textToSend,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await api.post(`/chat/send/${activeThread.id}`, { message: textToSend });
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? res.data : m));
      
      // Update thread last message
      setThreads(prev => prev.map(t => {
        if (t.id === activeThread.id) {
          return { ...t, last_message: textToSend, last_message_at: new Date().toISOString() };
        }
        return t;
      }));
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to send message', 'error');
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">WhatsApp Inbox</h1>
          <p className="text-text-secondary mt-1">Chat directly with your leads and tenants.</p>
        </div>
      </div>

      <div className="flex-1 bg-bg-surface border border-border rounded-2xl overflow-hidden flex shadow-sm glass-card">
        
        {/* Left Sidebar: Threads */}
        <div className="w-1/3 border-r border-border/50 flex flex-col bg-bg-surface">
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-bg-elevated/50">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <MessageCircle size={18} className="text-accent" /> Conversations
            </h2>
            <button onClick={fetchThreads} className="p-1.5 text-text-muted hover:text-accent rounded-lg transition-colors">
              <RefreshCw size={16} className={loadingThreads ? "animate-spin" : ""} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center p-8 text-text-muted">
                <MessageCircle size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No conversations yet.</p>
                <p className="text-xs mt-1">When someone replies to your bulk messages, they will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {threads.map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`w-full text-left p-4 hover:bg-bg-elevated transition-colors flex gap-3 ${
                      activeThread?.id === thread.id ? 'bg-accent/5 border-l-4 border-l-accent' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent">
                      <User size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-sm text-text-primary truncate">{thread.contact_name}</span>
                        <span className="text-[10px] text-text-muted whitespace-nowrap ml-2">
                          {dayjs(thread.last_message_at).fromNow()}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary truncate">{thread.last_message}</p>
                    </div>
                    {thread.unread_count > 0 && (
                      <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-[10px] font-bold text-white">{thread.unread_count}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Chat Window */}
        <div className="flex-1 flex flex-col bg-bg-elevated/20">
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border/50 bg-bg-surface flex items-center gap-3 shadow-sm z-10">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">{activeThread.contact_name}</h3>
                  <p className="text-xs text-text-muted">{activeThread.contact_number}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-text-muted text-sm">
                    No messages yet. Send the first message!
                  </div>
                ) : (
                  messages.map(msg => {
                    const isAgent = msg.sender === 'agent';
                    return (
                      <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                          isAgent 
                            ? 'bg-accent text-white rounded-br-sm' 
                            : 'bg-bg-surface border border-border text-text-primary rounded-bl-sm'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isAgent ? 'text-white/70' : 'text-text-muted'}`}>
                            {dayjs(msg.timestamp).format('HH:mm')}
                            {isAgent && (
                              <span className="ml-1">
                                {msg.status === 'sending' ? '⏳' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-bg-surface border-t border-border/50">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent text-text-primary"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="bg-accent text-white rounded-xl px-5 py-3 hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
              <MessageCircle size={48} className="opacity-20 mb-4" />
              <p className="font-medium text-text-secondary">Select a conversation to start messaging</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

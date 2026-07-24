import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { toast } from '../components/Toast';
import { Send, User, Clock, RefreshCw, MessageCircle, Paperclip, Mic, Square, X } from 'lucide-react';
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
  
  // Media states
  const [attachment, setAttachment] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
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

  // Audio Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachment(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      toast('Please allow microphone access to record voice notes', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 3.5 MB limit
      if (file.size > 3.5 * 1024 * 1024) {
        toast('File size must be less than 3.5MB', 'error');
        e.target.value = ''; // Reset
        return;
      }
      setAttachment(file);
    }
  };

  const handleSelectThread = (thread) => {
    setActiveThread(thread);
    fetchMessages(thread.id);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!replyText.trim() && !attachment) || !activeThread) return;

    const textToSend = replyText;
    const currentAttachment = attachment;
    
    setReplyText('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSending(true);

    let tempMessageText = textToSend;
    if (currentAttachment && !textToSend) {
      tempMessageText = `[Sending media...]`;
    }

    // Optimistic UI update
    const tempMsg = {
      id: Date.now().toString(),
      sender: 'agent',
      message: tempMessageText,
      timestamp: new Date().toISOString(),
      status: 'sending',
      media_url: currentAttachment ? URL.createObjectURL(currentAttachment) : null,
      media_type: currentAttachment ? (currentAttachment.type.startsWith('image/') ? 'image' : currentAttachment.type.startsWith('audio/') ? 'audio' : currentAttachment.type.startsWith('video/') ? 'video' : 'document') : null
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const formData = new FormData();
      if (textToSend) formData.append('message', textToSend);
      if (currentAttachment) formData.append('media', currentAttachment);

      const res = await api.post(`/chat/send/${activeThread.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? res.data : m));
      
      // Update thread last message
      setThreads(prev => prev.map(t => {
        if (t.id === activeThread.id) {
          return { ...t, last_message: res.data.message || '[Media]', last_message_at: new Date().toISOString() };
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

  const renderMedia = (msg) => {
    if (!msg.media_url) return null;
    
    switch (msg.media_type) {
      case 'image':
        return <img src={msg.media_url} alt="Attachment" className="max-w-[250px] max-h-[250px] rounded-lg mt-2 object-cover" />;
      case 'audio':
        return <audio controls src={msg.media_url} className="mt-2 max-w-[250px] h-10" />;
      case 'video':
        return <video controls src={msg.media_url} className="max-w-[250px] max-h-[250px] rounded-lg mt-2" />;
      default:
        return (
          <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 text-sm underline hover:opacity-80">
            <Paperclip size={14} /> View Document
          </a>
        );
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
        <div className="flex-1 flex flex-col bg-bg-elevated/20 relative">
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
                          
                          {/* Text Content */}
                          {msg.message && !msg.message.startsWith('[') && (
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          )}
                          
                          {/* Media Content */}
                          {renderMedia(msg)}

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

              {/* Attachment Preview */}
              {attachment && !isRecording && (
                <div className="absolute bottom-[72px] left-0 right-0 bg-bg-surface border-t border-border/50 p-3 px-4 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                      <Paperclip size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary truncate max-w-[200px]">{attachment.name}</p>
                      <p className="text-xs text-text-muted">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setAttachment(null); if(fileInputRef.current) fileInputRef.current.value=''; }}
                    className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Chat Input */}
              <div className="p-4 bg-bg-surface border-t border-border/50 relative z-20">
                <form onSubmit={handleSend} className="flex gap-2 items-center">
                  
                  {/* File Attachment */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  />
                  {!isRecording && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 text-text-muted hover:text-accent bg-bg-elevated rounded-xl transition-colors border border-border"
                      title="Attach file"
                    >
                      <Paperclip size={18} />
                    </button>
                  )}

                  {/* Input or Recording State */}
                  {isRecording ? (
                    <div className="flex-1 flex items-center gap-3 bg-danger/10 text-danger border border-danger/20 rounded-xl px-4 py-3">
                      <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                      <span className="text-sm font-medium tracking-widest">{formatTime(recordingTime)}</span>
                      <span className="text-xs ml-auto opacity-80">Recording Voice Note...</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent text-text-primary"
                    />
                  )}

                  {/* Mic / Stop Button */}
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="bg-danger text-white rounded-xl px-4 py-3 hover:bg-red-600 transition-colors flex items-center justify-center"
                    >
                      <Square size={18} className="fill-current" />
                    </button>
                  ) : (!replyText.trim() && !attachment) ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="bg-bg-elevated border border-border text-text-primary rounded-xl px-4 py-3 hover:text-accent transition-colors flex items-center justify-center"
                      title="Hold to Record"
                    >
                      <Mic size={18} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={sending}
                      className="bg-accent text-white rounded-xl px-5 py-3 hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                    </button>
                  )}
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Calendar as CalendarIcon, Clock, Briefcase, User, ExternalLink } from 'lucide-react';
import { toast } from './Toast';

export default function DashboardCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Modal state
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventType, setNewEventType] = useState('Meeting');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/calendar/events');
      setEvents(res.data);
    } catch (err) {
      console.error('Failed to fetch calendar events', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day) => {
    const clickedDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), day));
    setSelectedDate(clickedDate.toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleAddEvent = async () => {
    if (!newEventTitle.trim()) return toast('Title is required', 'error');
    try {
      const body = {
        title: newEventTitle,
        description: newEventDesc,
        event_date: selectedDate,
        type: newEventType
      };
      await api.post('/calendar/events', body);
      toast('Event added successfully', 'success');
      setNewEventTitle('');
      setNewEventDesc('');
      fetchEvents();
    } catch (err) {
      toast('Failed to add event', 'error');
    }
  };

  const handleDeleteEvent = async (id, source) => {
    if (source !== 'custom') return; // Cannot delete auto events from here
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const realId = id.replace('custom_', '');
      await api.delete(`/calendar/events/${realId}`);
      toast('Event deleted', 'success');
      fetchEvents();
    } catch (err) {
      toast('Failed to delete event', 'error');
    }
  };

  const handleEventClick = (ev) => {
    if (ev.type === 'Rent' || ev.type === 'Lease') {
      navigate('/properties');
    } else if (ev.type === 'Lead') {
      navigate('/leads');
    }
  };

  const renderCells = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const cells = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2 min-h-[80px] bg-bg-primary/20 border border-border/30 rounded-lg"></div>);
    }
    
    const todayStr = new Date().toISOString().split('T')[0];

    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      // Create local date string YYYY-MM-DD avoiding timezone issues
      const dateStr = new Date(Date.UTC(year, month, d)).toISOString().split('T')[0];
      const dayEvents = events.filter(e => e.date && (typeof e.date === 'string' ? e.date.split('T')[0] : new Date(e.date).toISOString().split('T')[0]) === dateStr);
      
      const isToday = dateStr === todayStr;

      cells.push(
        <div 
          key={d} 
          onClick={() => handleDayClick(d)}
          className={`p-1 sm:p-2 min-h-[70px] sm:min-h-[80px] border rounded-lg cursor-pointer transition-all hover:border-accent hover:bg-bg-elevated/50 flex flex-col gap-0.5 sm:gap-1 overflow-hidden
            ${isToday ? 'border-accent bg-accent/5' : 'border-border/50 bg-bg-surface'}
          `}
        >
          <div className="flex justify-between items-center mb-0.5 sm:mb-1">
            <span className={`text-xs sm:text-sm font-semibold ${isToday ? 'text-accent' : 'text-text-primary'}`}>{d}</span>
            {dayEvents.length > 0 && <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-bg-elevated text-text-secondary border border-border">{dayEvents.length}</span>}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar flex flex-col">
            {dayEvents.slice(0, 3).map((ev) => (
              <div 
                key={ev.id} 
                className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 sm:py-1 rounded truncate border flex items-center justify-center sm:justify-start ${getEventColor(ev.type)}`}
                title={ev.title}
              >
                <span className="hidden sm:inline truncate">{ev.title}</span>
                <span className="sm:hidden font-bold">{ev.title[0]}</span>
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-[8px] sm:text-[10px] text-text-muted text-center font-medium">+{dayEvents.length - 3}</div>
            )}
          </div>
        </div>
      );
    }
    
    return cells;
  };

  const getEventColor = (type) => {
    switch(type) {
      case 'Rent': return 'bg-danger/10 text-danger border-danger/20';
      case 'Lease': return 'bg-warning/10 text-warning border-warning/20';
      case 'Lead': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-accent/10 text-accent border-accent/20'; // Custom
    }
  };

  const getEventIcon = (type) => {
    switch(type) {
      case 'Rent': return <Clock size={14} />;
      case 'Lease': return <Briefcase size={14} />;
      case 'Lead': return <User size={14} />;
      default: return <CalendarIcon size={14} />;
    }
  };

  const selectedDayEvents = selectedDate ? events.filter(e => e.date && (typeof e.date === 'string' ? e.date.split('T')[0] : new Date(e.date).toISOString().split('T')[0]) === selectedDate) : [];

  return (
    <div className="glass-card p-3 sm:p-5 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
          <CalendarIcon className="text-accent" />
          Interactive Calendar
        </h2>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs font-medium text-text-secondary">
            <span className="flex items-center gap-1"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-danger"></div> Rent</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-warning"></div> Lease</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-accent"></div> Custom</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 bg-bg-elevated border border-border rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-bg-surface rounded text-text-secondary hover:text-text-primary transition-colors"><ChevronLeft size={16}/></button>
            <span className="px-1 sm:px-3 font-semibold text-xs sm:text-sm text-text-primary min-w-[100px] sm:min-w-[120px] text-center">
              {currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-bg-surface rounded text-text-secondary hover:text-text-primary transition-colors"><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-bold text-text-muted uppercase tracking-wider mb-2">{day}</div>
          ))}
          {renderCells()}
        </div>
      )}

      {/* Date Details & Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm p-4">
          <div className="bg-bg-surface border border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-border bg-bg-elevated">
              <h3 className="font-bold text-text-primary">
                Events for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {selectedDayEvents.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {selectedDayEvents.map(ev => (
                    <div 
                      key={ev.id} 
                      onClick={() => ev.source === 'auto' && handleEventClick(ev)}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${getEventColor(ev.type)} bg-opacity-10 ${ev.source === 'auto' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="mt-0.5">{getEventIcon(ev.type)}</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm flex items-center gap-2">
                            {ev.title} 
                            {ev.source === 'auto' && <ExternalLink size={12} className="opacity-50" />}
                          </h4>
                          {ev.description && <p className="text-xs mt-1 whitespace-pre-wrap opacity-90">{ev.description}</p>}
                        </div>
                      </div>
                      {ev.source === 'custom' && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id, ev.source); }} className="text-danger hover:text-danger-hover opacity-70 hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-text-muted text-sm mb-4">
                  No events scheduled for this day.
                </div>
              )}

              <div className="bg-bg-elevated rounded-xl p-4 border border-border mt-auto">
                <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2"><Plus size={16} className="text-accent"/> Add Manual Event</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Event Title</label>
                    <input 
                      type="text" 
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="e.g. Call plumber for Unit 102"
                      className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
                      <select 
                        value={newEventType}
                        onChange={(e) => setNewEventType(e.target.value)}
                        className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                      >
                        <option value="Meeting">Meeting</option>
                        <option value="Reminder">Reminder</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Description (Optional)</label>
                    <textarea 
                      value={newEventDesc}
                      onChange={(e) => setNewEventDesc(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleAddEvent}
                    disabled={!newEventTitle.trim()}
                    className="w-full py-2 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Save Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

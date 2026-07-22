import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

let toastId = 0;
let addToastFn = null;

export function toast(message, type = 'success') {
  if (addToastFn) addToastFn({ id: ++toastId, message, type });
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

const colors = {
  success: 'border-success bg-success-dim text-success',
  error: 'border-danger bg-danger-dim text-danger',
  warning: 'border-warning bg-warning-dim text-warning',
  info: 'border-info bg-info-dim text-info'
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    addToastFn = (t) => setToasts(prev => [...prev, t]);
    return () => { addToastFn = null; };
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const dismiss = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map(t => {
        const Icon = icons[t.type] || Info;
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[t.type]} shadow-2xl`}
            style={{ animation: 'toast-in 0.3s ease-out' }}
          >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

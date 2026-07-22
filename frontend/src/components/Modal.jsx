import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-8 sm:pt-10 pb-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div
        className={`relative w-full ${maxWidth} bg-bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden`}
        style={{ maxHeight: 'calc(100vh - 80px)', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-surface z-10">
          <h2 className="text-lg font-semibold text-text-primary">{title || 'Modal'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto bg-bg-surface">
          {children}
        </div>
      </div>
    </div>
  );
}

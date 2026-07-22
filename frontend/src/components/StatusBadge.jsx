const statusColors = {
  // Lead statuses
  'New': 'text-accent border-accent/20',
  'Contacted': 'text-purple border-purple/20',
  'Interested': 'text-text-primary border-border',
  'Negotiation': 'text-warning border-warning/20',
  'Converted': 'text-success border-success/20',
  'Lost': 'text-danger border-danger/20',
  'Stalled': 'text-danger border-danger/20',
  'Nurturing': 'text-text-secondary border-border',
  'Hot Lead': 'text-accent border-accent/20',

  // Payment statuses
  'Paid': 'text-accent border-accent/20',
  'Pending': 'text-warning border-warning/20',
  'Overdue': 'text-danger border-danger/20',

  // Message statuses
  'sent': 'text-accent border-accent/20',
  'failed': 'text-danger border-danger/20',
  'queued': 'text-warning border-warning/20',
  'Sent': 'text-accent border-accent/20',
  'Failed': 'text-danger border-danger/20',
  'Queued': 'text-warning border-warning/20',

  // Sources
  'Manual': 'text-info border-info/20',
  'Excel Import': 'text-purple border-purple/20'
};

const dotColors = {
  // Same mappings for dots but using bg color
  'New': 'bg-accent', 'Contacted': 'bg-purple', 'Interested': 'bg-text-secondary', 'Negotiation': 'bg-warning', 'Converted': 'bg-success', 'Lost': 'bg-danger', 'Stalled': 'bg-danger', 'Nurturing': 'bg-text-secondary', 'Hot Lead': 'bg-accent',
  'Paid': 'bg-accent', 'Pending': 'bg-warning', 'Overdue': 'bg-danger',
  'sent': 'bg-accent', 'failed': 'bg-danger', 'queued': 'bg-warning',
  'Sent': 'bg-accent', 'Failed': 'bg-danger', 'Queued': 'bg-warning',
  'Manual': 'bg-info', 'Excel Import': 'bg-purple'
};

export default function StatusBadge({ status }) {
  const colorClass = statusColors[status] || 'text-text-secondary border-border';
  const dotClass = dotColors[status] || 'bg-text-secondary';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-bg-primary/50 ${colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {status}
    </span>
  );
}

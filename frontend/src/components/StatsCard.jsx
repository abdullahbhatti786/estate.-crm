import { TrendingUp, AlertTriangle } from 'lucide-react';

export default function StatsCard({ icon: Icon, label, value, subValue, color = 'accent', trend, actionReq }) {
  const colorMap = {
    accent: 'text-accent',
    danger: 'text-danger',
    warning: 'text-warning',
    success: 'text-success',
    info: 'text-info',
    purple: 'text-purple'
  };

  const iconColor = colorMap[color] || colorMap.accent;

  return (
    <div className="glass-card p-5 hover:border-border-light transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-text-secondary">{label}</div>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="flex items-end justify-between">
        <div className="text-4xl font-bold text-text-primary tracking-tight">{value}</div>
        
        {trend && (
          <div className="flex items-center gap-1 text-accent text-xs font-semibold">
            <TrendingUp size={14} />
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}

        {actionReq && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-warning bg-warning-dim border border-warning/20">
            <AlertTriangle size={10} />
            Action Req
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';

export default function MetricCard({ title, value, unit, subtitle, icon: Icon, badge, color = 'emerald' }) {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 sm:p-5 hover:border-slate-700 transition-all shadow-md">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 truncate mr-2">{title}</span>
        {Icon && (
          <div className={`p-1.5 sm:p-2 rounded-lg border shrink-0 ${colorMap[color] || colorMap.emerald}`}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-1.5">
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-white">{value}</span>
        {unit && <span className="text-[11px] sm:text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      <div className="mt-2 flex flex-col xs:flex-row xs:items-center justify-between gap-1 text-[11px] sm:text-xs">
        <span className="text-slate-400 line-clamp-1">{subtitle}</span>
        {badge && (
          <span className={`self-start xs:self-auto px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide border whitespace-nowrap ${colorMap[color]}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

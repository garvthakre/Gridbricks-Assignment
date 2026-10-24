import React from 'react';
import { ShieldAlert, Zap } from 'lucide-react';

export default function TakeawayCard({ summary }) {
  if (!summary) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 relative z-10">
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Operational Risk Takeaway</span>
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">UK Day-Ahead Gate: {summary.cutoff_time} UTC</span>
          </div>

          <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
            Thermal Procurement Reserve Guidance
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {summary.plain_language_takeaway}
          </p>
        </div>

        {/* Quantified Reserve Buffer Card (Responsive on phone and tablet) */}
        <div className="bg-slate-950/80 border border-emerald-500/40 rounded-xl p-4 flex items-center space-x-4 w-full lg:w-auto min-w-0 shrink-0">
          <div className="p-2.5 sm:p-3 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Zap className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs uppercase font-semibold text-slate-400 tracking-wider">Required Thermal Buffer</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
              ±{summary.recommended_buffer_mw?.toLocaleString()} <span className="text-xs sm:text-sm font-normal text-emerald-400">MW</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
              Hedges <strong className="text-slate-200">95%</strong> of Day-Ahead volume variance
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

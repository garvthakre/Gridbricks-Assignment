import React from 'react';
import { Wind, Activity, BarChart3, ShieldCheck } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-2.5 sm:py-0 sm:h-16 gap-2 sm:gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center justify-between w-full sm:w-auto space-x-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Wind className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base sm:text-lg text-white tracking-tight">GridBricks</span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    UK Day-Ahead
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">Renewable Procurement & Risk Desk</p>
              </div>
            </div>

            <div className="flex sm:hidden items-center space-x-1 text-[11px] text-slate-400 bg-slate-800/60 px-2 py-1 rounded-full border border-slate-700/50">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Elexon Live</span>
            </div>
          </div>

          {/* Navigation Tabs (Fully responsive for mobile & tablet) */}
          <div className="flex items-center justify-center w-full sm:w-auto space-x-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('decision')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'decision'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Decision View</span>
              <span className="hidden md:inline text-[11px] opacity-80">(D-1 Cutoff)</span>
            </button>
            <button
              onClick={() => setActiveTab('accuracy')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'accuracy'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Accuracy & Risk</span>
            </button>
          </div>

          {/* Desktop Market Status Info */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-700/50">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Elexon BMRS Verified</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

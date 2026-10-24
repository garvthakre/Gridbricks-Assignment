import React from 'react';
import { Wind, Activity, BarChart3, Clock, ShieldCheck } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wind className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">GridBricks PowerDesk</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  UK Day-Ahead
                </span>
              </div>
              <p className="text-xs text-slate-400">Wholesale Electricity Procurement & Renewable Risk Analytics</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('decision')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'decision'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>1. Decision View (D-1 Cutoff)</span>
            </button>
            <button
              onClick={() => setActiveTab('accuracy')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'accuracy'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>2. Forecast Accuracy & Risk</span>
            </button>
          </div>

          {/* Market Status Info */}
          <div className="hidden md:flex items-center space-x-3 text-xs">
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

'use client';

import React, { useState } from 'react';
import Header from '../components/Header';
import DayAheadView from '../components/DayAheadView';
import AccuracyView from '../components/AccuracyView';

export default function Home() {
  const [activeTab, setActiveTab] = useState('decision');
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '';

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation & Brand Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Trading Desk Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'decision' ? (
          <DayAheadView apiBaseUrl={apiBaseUrl} />
        ) : (
          <AccuracyView apiBaseUrl={apiBaseUrl} />
        )}
      </main>

      {/* Footer with Compliance & Data Citations */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-slate-300">UK Wind Day-Ahead Procurement Portal</span>
            <span className="mx-2 text-slate-600">•</span>
            <span>Developed for UK Wholesale Electricity Day-Ahead Trading Desk</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Data: Elexon BMRS (FUELHH & WINDFOR)</span>
            <span>•</span>
            <span>Evaluation Window: January 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

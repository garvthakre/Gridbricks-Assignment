import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Clock,
  Calendar,
  TrendingDown,
} from 'lucide-react';
import MetricCard from './MetricCard';
import TakeawayCard from './TakeawayCard';

export default function AccuracyView({ apiBaseUrl = '' }) {
  const [cutoffTime, setCutoffTime] = useState('11:00:00');
  const [cutoffs, setCutoffs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [diurnal, setDiurnal] = useState([]);
  const [leadTimes, setLeadTimes] = useState([]);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch cutoffs
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/dates`);
        const json = await res.json();
        setCutoffs(json.cutoffs || []);
      } catch (err) {
        console.error('Failed to load cutoffs:', err);
      }
    }
    fetchMetadata();
  }, [apiBaseUrl]);

  // Fetch all accuracy analytics when cutoffTime changes
  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const [sumRes, diuRes, ltRes, dailyRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/accuracy/summary?cutoff_time=${cutoffTime}`),
          fetch(`${apiBaseUrl}/api/accuracy/diurnal?cutoff_time=${cutoffTime}`),
          fetch(`${apiBaseUrl}/api/accuracy/lead-time?cutoff_time=${cutoffTime}`),
          fetch(`${apiBaseUrl}/api/accuracy/daily?cutoff_time=${cutoffTime}`),
        ]);

        if (sumRes.ok) setSummary(await sumRes.json());
        if (diuRes.ok) setDiurnal(await diuRes.json());
        if (ltRes.ok) setLeadTimes(await ltRes.json());
        if (dailyRes.ok) setDaily(await dailyRes.json());
      } catch (err) {
        console.error('Failed to fetch accuracy analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [cutoffTime, apiBaseUrl]);

  return (
    <div className="space-y-6">
      {/* Cutoff Selector & Header info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>January 2026 Forecast Verification Benchmark</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluates 1,488 settlement half-hours (Jan 2 – Feb 1, 2026) across Great Britain wind actuals vs. decision-time forecasts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>ASSUMED CUTOFF:</span>
          </label>
          <select
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {cutoffs.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Plain-Language Takeaway & Procurement Buffer */}
      {summary && <TakeawayCard summary={summary} />}

      {/* Benchmark KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Mean Abs Error"
            value={summary.mae_mw ? `${summary.mae_mw.toLocaleString()}` : '--'}
            unit="MW"
            subtitle="Overall accuracy"
            badge="MAE"
            color="amber"
          />
          <MetricCard
            title="Root Mean Sq Error"
            value={summary.rmse_mw ? `${summary.rmse_mw.toLocaleString()}` : '--'}
            unit="MW"
            subtitle="Variance penalty"
            badge="RMSE"
            color="rose"
          />
          <MetricCard
            title="Systematic Bias"
            value={summary.bias_mw ? `${summary.bias_mw > 0 ? '+' : ''}${summary.bias_mw.toLocaleString()}` : '--'}
            unit="MW"
            subtitle={summary.bias_mw > 0 ? 'Over-forecasted (Long)' : 'Under-forecasted (Short)'}
            badge={summary.bias_mw > 0 ? 'Over' : 'Under'}
            color={summary.bias_mw > 0 ? 'amber' : 'sky'}
          />
          <MetricCard
            title="MAPE (%)"
            value={summary.mape_pct ? `${summary.mape_pct}%` : '--'}
            unit=""
            subtitle="Relative percentage"
            badge="MAPE"
            color="purple"
          />
          <MetricCard
            title="P90 Error"
            value={summary.p90_error_mw ? `${summary.p90_error_mw.toLocaleString()}` : '--'}
            unit="MW"
            subtitle="90% of periods within"
            badge="P90 Risk"
            color="sky"
          />
          <MetricCard
            title="P95 Error"
            value={summary.p95_error_mw ? `${summary.p95_error_mw.toLocaleString()}` : '--'}
            unit="MW"
            subtitle="Extreme tail deviation"
            badge="P95 Risk"
            color="emerald"
          />
        </div>
      )}

      {/* Detailed Analysis Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Diurnal Error Distribution (Hour of Day) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Diurnal Error Profile (Hour of Day 00:00 - 23:00)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies which settlement hours exhibit highest forecast error and bias.
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diurnal} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="hour_of_day"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(h) => `${h}:00`}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
                />
                <Tooltip content={<DiurnalTooltip />} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} />
                <Bar dataKey="mae_mw" name="Mean Abs Error (MW)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bias_mw" name="Mean Bias (MW)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Error vs. Forecast Lead Time Horizon */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <span>Error vs. Forecast Horizon (Lead Time)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Shows how forecast reliability changes as lead time increases from 12h to 36h+.
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadTimes} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="lead_time_bin" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
                />
                <Tooltip content={<LeadTimeTooltip />} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} />
                <Bar dataKey="mae_mw" name="MAE (MW)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rmse_mw" name="RMSE (MW)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 3: Daily Accuracy Trend Across January 2026 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="border-b border-slate-800 pb-3 mb-4">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Daily Error Evolution (January 2026 Time-Series)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Day-by-day MAE and Bias across all 31 delivery days in the decision window.
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 10, right: 15, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="delivery_date"
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(d) => d.substring(8)}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
              />
              <Tooltip content={<DailyTooltip />} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} />
              <Line type="monotone" dataKey="mae_mw" name="Daily MAE (MW)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="bias_mw" name="Daily Bias (MW)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function DiurnalTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
        <div className="font-bold text-white border-b border-slate-800 pb-1">
          Hour {data.hour_of_day}:00 UTC
        </div>
        <div className="text-amber-400">MAE: <strong className="font-mono">{data.mae_mw?.toLocaleString()} MW</strong></div>
        <div className="text-sky-400">Bias: <strong className="font-mono">{data.bias_mw > 0 ? `+${data.bias_mw.toLocaleString()}` : data.bias_mw?.toLocaleString()} MW</strong></div>
        <div className="text-slate-400 text-[10px]">Observations: {data.count} half-hours</div>
      </div>
    );
  }
  return null;
}

function LeadTimeTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
        <div className="font-bold text-white border-b border-slate-800 pb-1">
          Horizon: {data.lead_time_bin} (Avg: {data.lead_time_hours_avg}h)
        </div>
        <div className="text-emerald-400">MAE: <strong className="font-mono">{data.mae_mw?.toLocaleString()} MW</strong></div>
        <div className="text-rose-400">RMSE: <strong className="font-mono">{data.rmse_mw?.toLocaleString()} MW</strong></div>
        <div className="text-slate-400 text-[10px]">Observations: {data.count}</div>
      </div>
    );
  }
  return null;
}

function DailyTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
        <div className="font-bold text-white border-b border-slate-800 pb-1">
          Delivery Date: {data.delivery_date}
        </div>
        <div className="text-amber-400">MAE: <strong className="font-mono">{data.mae_mw?.toLocaleString()} MW</strong></div>
        <div className="text-sky-400">Bias: <strong className="font-mono">{data.bias_mw > 0 ? `+${data.bias_mw.toLocaleString()}` : data.bias_mw?.toLocaleString()} MW</strong></div>
      </div>
    );
  }
  return null;
}

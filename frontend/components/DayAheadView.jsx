import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Calendar, Clock, AlertCircle, Table as TableIcon } from 'lucide-react';
import MetricCard from './MetricCard';

export default function DayAheadView({ apiBaseUrl = '' }) {
  const [dates, setDates] = useState([]);
  const [cutoffs, setCutoffs] = useState([]);
  const [selectedDate, setSelectedDate] = useState('2026-01-15');
  const [selectedCutoff, setSelectedCutoff] = useState('11:00:00');
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(false);

  // Fetch available dates and cutoff options on mount
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/dates`);
        const json = await res.json();
        setDates(json.dates || []);
        setCutoffs(json.cutoffs || []);
        if (json.default_date) setSelectedDate(json.default_date);
        if (json.default_cutoff) setSelectedCutoff(json.default_cutoff);
      } catch (err) {
        console.error('Failed to load date metadata:', err);
      }
    }
    fetchMetadata();
  }, [apiBaseUrl]);

  // Fetch day forecast & actuals when selectedDate or selectedCutoff changes
  useEffect(() => {
    async function fetchDayData() {
      if (!selectedDate) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/forecast/day?delivery_date=${selectedDate}&cutoff_time=${selectedCutoff}`
        );
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        setDayData(data);
      } catch (err) {
        console.error('Error fetching day forecast:', err);
        setError('Failed to fetch day-ahead forecast data. Make sure backend is running.');
      } finally {
        setLoading(false);
      }
    }
    fetchDayData();
  }, [selectedDate, selectedCutoff, apiBaseUrl]);

  // Prepare chart data formatting
  const chartData = dayData?.points?.map((pt) => {
    const timeStr = pt.start_time ? pt.start_time.substring(11, 16) : `SP ${pt.settlement_period}`;
    return {
      period: pt.settlement_period,
      time: timeStr,
      fullTime: pt.start_time,
      actual: pt.actual_mw,
      forecast: pt.forecast_mw,
      error: pt.error_mw,
      leadTime: pt.lead_time_hours,
      publishTime: pt.forecast_publish_time,
    };
  }) || [];

  const maxGen = chartData.reduce((acc, cur) => Math.max(acc, cur.actual || 0, cur.forecast || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Control Bar: Date Selector & Cutoff Gate Closure */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full sm:w-auto">
          {/* Delivery Date Picker */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-400 mb-1 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>DELIVERY DAY (D)</span>
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* D-1 Gate Closure Cutoff */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-400 mb-1 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>D-1 AUCTION CUTOFF</span>
            </label>
            <select
              value={selectedCutoff}
              onChange={(e) => setSelectedCutoff(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {cutoffs.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Decision Context Pill */}
        {dayData && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 sm:px-4 sm:py-2.5 text-xs text-slate-300 w-full sm:w-auto">
            <div className="text-slate-400 text-[10px] sm:text-[11px]">Wholesale Market Decision Lock:</div>
            <div className="font-semibold text-emerald-400 font-mono text-xs sm:text-sm">
              {dayData.decision_datetime?.replace('Z', ' UTC')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Filters out all forecasts published after gate closure.
            </div>
          </div>
        )}
      </div>

      {/* Day KPI Cards (Responsive grid: 2 cols on mobile, 4 on desktop) */}
      {dayData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            title="Day MAE"
            value={dayData.day_mae ? `${dayData.day_mae.toLocaleString()}` : '--'}
            unit="MW"
            subtitle="Avg half-hour error"
            badge="Decision Error"
            color="amber"
          />
          <MetricCard
            title="Day RMSE"
            value={dayData.day_rmse ? `${dayData.day_rmse.toLocaleString()}` : '--'}
            unit="MW"
            subtitle="Penalizes large spikes"
            badge="Volatility"
            color="rose"
          />
          <MetricCard
            title="Day Bias"
            value={dayData.day_bias ? `${dayData.day_bias > 0 ? '+' : ''}${dayData.day_bias.toLocaleString()}` : '--'}
            unit="MW"
            subtitle={dayData.day_bias > 0 ? 'Over-forecasted (Long)' : 'Under-forecasted (Short)'}
            badge={dayData.day_bias > 0 ? 'Over-Forecast' : 'Under-Forecast'}
            color={dayData.day_bias > 0 ? 'amber' : 'sky'}
          />
          <MetricCard
            title="Peak Generation"
            value={maxGen ? `${maxGen.toLocaleString()}` : '--'}
            unit="MW"
            subtitle="Highest observed wind"
            badge="Grid Peak"
            color="emerald"
          />
        </div>
      )}

      {/* Main Half-Hourly Chart View */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-800 gap-2 mb-3 sm:mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              National Wind: Actuals vs. D-1 Cutoff Forecast
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              48 Settlement Periods (30-min resolution) for {selectedDate}. Locked before {selectedCutoff} UTC on D-1.
            </p>
          </div>

          <button
            onClick={() => setShowTable(!showTable)}
            className="self-start sm:self-auto flex items-center space-x-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showTable ? 'Hide Table' : 'Audit Table'}</span>
          </button>
        </div>

        {loading ? (
          <div className="h-64 sm:h-80 flex items-center justify-center text-slate-400 text-xs sm:text-sm">
            Loading settlement period data...
          </div>
        ) : error ? (
          <div className="h-64 sm:h-80 flex items-center justify-center text-rose-400 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        ) : (
          <div className="h-[280px] sm:h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 15, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={10}
                  tickMargin={6}
                  interval={5}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
                />
                
                {/* Actual Wind Generation (Solid Blue) */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual (FUELHH)"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: '#38bdf8' }}
                />

                {/* D-1 Decision Forecast (Dashed Emerald) */}
                <Line
                  type="stepAfter"
                  dataKey="forecast"
                  name="D-1 Forecast (WINDFOR)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col xs:flex-row items-start xs:items-center justify-between text-[11px] sm:text-xs text-slate-400 gap-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
              <span>Actual (30-min)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
              <span>D-1 Forecast</span>
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-500">Source: Elexon BMRS</span>
        </div>
      </div>

      {/* Optional Audit Settlement Table (Horizontal scrolling container) */}
      {showTable && dayData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xl overflow-hidden">
          <h3 className="text-xs sm:text-sm font-bold text-white mb-2.5">Settlement Audit Table (All 48 Half-Hours)</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs text-slate-300 min-w-[640px]">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2 px-2.5">Period</th>
                  <th className="py-2 px-2.5">Start Time (UTC)</th>
                  <th className="py-2 px-2.5">Actual (MW)</th>
                  <th className="py-2 px-2.5">D-1 Forecast (MW)</th>
                  <th className="py-2 px-2.5">Error (MW)</th>
                  <th className="py-2 px-2.5">Abs Error (MW)</th>
                  <th className="py-2 px-2.5">Lead Time</th>
                  <th className="py-2 px-2.5">Published</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px] sm:text-xs">
                {dayData.points.map((pt) => (
                  <tr key={pt.settlement_period} className="hover:bg-slate-800/40">
                    <td className="py-1.5 px-2.5 font-semibold text-slate-200">SP {pt.settlement_period}</td>
                    <td className="py-1.5 px-2.5 font-mono">{pt.start_time.substring(11, 16)}</td>
                    <td className="py-1.5 px-2.5 font-mono text-sky-400">{pt.actual_mw?.toLocaleString()}</td>
                    <td className="py-1.5 px-2.5 font-mono text-emerald-400">{pt.forecast_mw?.toLocaleString()}</td>
                    <td className={`py-1.5 px-2.5 font-mono ${pt.error_mw > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {pt.error_mw > 0 ? `+${pt.error_mw.toLocaleString()}` : pt.error_mw?.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono">{pt.abs_error_mw?.toLocaleString()}</td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-400">{pt.lead_time_hours}h</td>
                    <td className="py-1.5 px-2.5 font-mono text-slate-400">{pt.forecast_publish_time?.replace('T', ' ').replace('Z', '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom interactive tooltip for settlement chart
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const err = data.forecast !== null && data.actual !== null ? data.forecast - data.actual : null;

    return (
      <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5 min-w-[200px]">
        <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between">
          <span>SP {data.period} ({data.time} UTC)</span>
          <span className="text-slate-400 text-[10px]">{data.leadTime ? `${data.leadTime}h lead` : ''}</span>
        </div>
        <div className="flex justify-between text-sky-400">
          <span>Actual Wind:</span>
          <span className="font-mono font-bold">{data.actual?.toLocaleString()} MW</span>
        </div>
        <div className="flex justify-between text-emerald-400">
          <span>D-1 Forecast:</span>
          <span className="font-mono font-bold">{data.forecast?.toLocaleString()} MW</span>
        </div>
        {err !== null && (
          <div className={`flex justify-between pt-1 border-t border-slate-800 font-semibold ${err > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            <span>Error (F - A):</span>
            <span className="font-mono">{err > 0 ? `+${err.toLocaleString()}` : err.toLocaleString()} MW</span>
          </div>
        )}
        <div className="text-[10px] text-slate-500 pt-0.5">
          Published: {data.publishTime?.replace('T', ' ').replace('Z', ' UTC')}
        </div>
      </div>
    );
  }
  return null;
}

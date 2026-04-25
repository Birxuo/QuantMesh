'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { fetchCatalog } from '../lib/api';

const SIGNAL_BADGES = {
  alpha: { icon: '' },
  volatility: { icon: '' },
  sentiment: { icon: '' }
};


function SignalValue({ value, signal }) {
  if (value === null || value === undefined) return <span className="text-qm-text-muted">—</span>;

  const num = Number(value);
  if (signal === 'sentiment') {
    const label = num > 0.6 ? 'Bullish' : num < 0.4 ? 'Bearish' : 'Neutral';
    const color = num > 0.6 ? 'text-emerald-600' : num < 0.4 ? 'text-red-500' : 'text-qm-text-muted';
    return (
      <div className="flex items-center gap-2">
        <span className={`font-mono font-bold ${color}`}>{num.toFixed(4)}</span>
        <span className={`text-[9px] font-bold uppercase ${color}`}>{label}</span>
      </div>
    );
  }

  const isPositive = num > 0;
  const color = isPositive ? 'text-emerald-600' : num < 0 ? 'text-red-500' : 'text-qm-text-muted';
  const Icon = isPositive ? TrendingUp : num < 0 ? TrendingDown : Minus;

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3 h-3 ${color}`} />
      <span className={`font-mono font-bold ${color}`}>
        {signal === 'volatility' ? `${(num * 100).toFixed(2)}%` : num.toFixed(6)}
      </span>
    </div>
  );
}

export default function RawSignals() {
  const [catalog, setCatalog] = useState([]);
  const [signalData, setSignalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState({});
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Load catalog on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchCatalog();
        setCatalog(data.signals || []);
        setError(null);
      } catch {
        setError('Provider offline');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Fetch a single signal value (free preview via /catalog doesn't return live values,
  // so we fetch from the endpoint directly — this will return 402 in prod but we show schema)
  const fetchSignal = useCallback(async (endpoint) => {
    setFetching((prev) => ({ ...prev, [endpoint]: true }));
    try {
      const res = await fetch(`/provider${endpoint}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        setSignalData((prev) => ({ ...prev, [endpoint]: { data, timestamp: Date.now(), error: null } }));
      } else if (res.status === 402) {
        setSignalData((prev) => ({
          ...prev,
          [endpoint]: { data: null, timestamp: Date.now(), error: '402 — Payment Required' },
        }));
      } else {
        setSignalData((prev) => ({
          ...prev,
          [endpoint]: { data: null, timestamp: Date.now(), error: `HTTP ${res.status}` },
        }));
      }
    } catch {
      setSignalData((prev) => ({
        ...prev,
        [endpoint]: { data: null, timestamp: Date.now(), error: 'Failed to fetch' },
      }));
    } finally {
      setFetching((prev) => ({ ...prev, [endpoint]: false }));
    }
  }, []);

  // Fetch all signals
  const fetchAll = useCallback(async () => {
    setLastRefresh(Date.now());
    for (const sig of catalog) {
      await fetchSignal(sig.endpoint);
    }
  }, [catalog, fetchSignal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-qm-text-muted">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        <span className="text-xs font-mono">LOADING_SIGNAL_REGISTRY...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-qm-text-muted">
        <AlertCircle className="w-6 h-6 text-qm-orange" />
        <span className="text-xs font-mono">{error}</span>
      </div>
    );
  }

  // Group by signal type
  const grouped = catalog.reduce((acc, sig) => {
    const type = sig.signal || 'unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(sig);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-4 h-4 text-qm-text-muted" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-qm-text-muted">
            {catalog.length} registered endpoints
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[10px] font-mono text-qm-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(lastRefresh).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded text-[10px] font-bold hover:bg-gray-800 transition-colors uppercase"
          >
            <RefreshCw className="w-3 h-3" />
            Fetch All
          </button>
        </div>
      </div>

      {/* Signal Tables by Type */}
      {Object.entries(grouped).map(([type, signals]) => {
        const badge = SIGNAL_BADGES[type] || { color: 'bg-gray-50 text-gray-700 border-gray-200', icon: '' };
        return (
          <div key={type} className="border border-qm-border rounded-lg bg-white overflow-hidden">
            <div className="bg-qm-surface px-6 py-3 border-b border-qm-border flex items-center gap-2">
              <span>{badge.icon}</span>
              <span className="text-[11px] font-bold uppercase tracking-widest">{type.replace('-', ' ')}</span>
              <span className="text-[9px] font-mono text-qm-text-muted ml-auto">{signals.length} signals</span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-qm-surface-alt text-[10px] font-mono text-qm-text-muted uppercase">
                  <th className="px-5 py-2.5 font-medium">Endpoint</th>
                  <th className="px-5 py-2.5 font-medium">Asset</th>
                  <th className="px-5 py-2.5 font-medium text-right">Price</th>
                  <th className="px-5 py-2.5 font-medium">Live Value</th>
                  <th className="px-5 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {signals.map((sig) => {
                  const sd = signalData[sig.endpoint];
                  const isFetching = fetching[sig.endpoint];
                  return (
                    <tr key={sig.endpoint} className="border-t border-qm-border hover:bg-qm-surface/30 transition-colors">
                      <td className="px-5 py-3">
                        <code className="text-[10px] font-mono bg-qm-surface px-1.5 py-0.5 rounded">
                          {sig.endpoint}
                        </code>
                      </td>
                      <td className="px-5 py-3 font-bold">{sig.ticker || sig.pair || '—'}</td>
                      <td className="px-5 py-3 text-right font-mono text-qm-green font-bold">
                        ${sig.price_usdc?.toFixed(3)}
                      </td>
                      <td className="px-5 py-3">
                        {isFetching ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-qm-text-muted" />
                        ) : sd?.error ? (
                          <span className="text-[10px] text-qm-orange font-mono">{sd.error}</span>
                        ) : sd?.data ? (
                          <SignalValue value={sd.data.value} signal={type} />
                        ) : (
                          <span className="text-[10px] text-qm-text-muted opacity-40 font-mono">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => fetchSignal(sig.endpoint)}
                          disabled={isFetching}
                          className="px-2.5 py-1 border border-qm-border rounded text-[9px] font-bold uppercase hover:border-black/30 transition-colors disabled:opacity-40"
                        >
                          Query
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

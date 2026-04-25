'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Zap, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { fetchCatalog } from '../lib/api';

// Icon mapping for signal types
const SIGNAL_ICONS = {
  momentum: '',
  volatility: '',
  sentiment: '',
  'arb-spread': '',
};

const SIGNAL_COLORS = {
  momentum: 'text-emerald-600',
  volatility: 'text-amber-600',
  sentiment: 'text-blue-600',
  'arb-spread': 'text-purple-600',
};

export default function SignalCatalog({ transactions }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [providerWallet, setProviderWallet] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadCatalog() {
      try {
        const data = await fetchCatalog();
        if (!mounted) return;
        setCatalog(data.signals || []);
        setProviderWallet(data.provider_wallet || '');
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError('Provider offline');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCatalog();
    // Refresh catalog every 60 seconds
    const interval = setInterval(loadCatalog, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Count activity per endpoint from real transactions
  const activityMap = transactions.reduce((acc, tx) => {
    const ep = tx.endpoint || '';
    acc[ep] = (acc[ep] || 0) + 1;
    return acc;
  }, {});

  // Group signals by type for cleaner display
  const groupedSignals = catalog.reduce((acc, sig) => {
    const type = sig.signal || 'unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(sig);
    return acc;
  }, {});

  return (
    <div className="border border-qm-border rounded-lg bg-white overflow-hidden flex flex-col h-[500px] shadow-sm">
      {/* Panel Header */}
      <div className="bg-qm-surface px-8 py-5 border-b border-qm-border flex justify-between items-center shrink-0">
        <h2 className="font-bold tracking-tight text-sm uppercase flex items-center gap-2">
          <Zap className="w-4 h-4 text-qm-orange" />
          Signal Catalog
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-qm-text-muted">
            {catalog.length} ENDPOINTS
          </span>
          {providerWallet && (
            <span className="text-[9px] font-mono text-qm-text-muted bg-qm-surface-alt px-2 py-0.5 rounded">
              {providerWallet.slice(0, 6)}...{providerWallet.slice(-4)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 qm-grid-bg">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-qm-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-mono">LOADING_CATALOG...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-qm-text-muted">
            <AlertCircle className="w-6 h-6 text-qm-orange" />
            <span className="text-xs font-mono">{error}</span>
            <span className="text-[10px] font-mono opacity-60">
              Start the provider: python -m provider.main
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSignals).map(([type, signals]) => (
              <div key={type}>
                {/* Signal type header */}
                <div className="flex items-center gap-2 mb-3 px-2">
                  <span className="text-sm">{SIGNAL_ICONS[type] || ''}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-qm-text-muted">
                    {type.replace('-', ' ')}
                  </span>
                  <div className="flex-1 h-px bg-qm-border" />
                  <span className="text-[9px] font-mono text-qm-text-muted">
                    {signals.length} signals
                  </span>
                </div>

                {/* Signal cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {signals.map((sig) => {
                    const queries = activityMap[sig.endpoint] || 0;
                    return (
                      <div
                        key={sig.endpoint}
                        className="p-4 border border-qm-border rounded-lg bg-white hover:border-black/30 transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 group-hover:scale-100 group-hover:opacity-10 transition-all">
                          <ShieldCheck className="w-10 h-10" />
                        </div>

                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-xs tracking-tight truncate">
                              {sig.ticker || sig.pair || '—'}
                            </h3>
                            <span className="text-[9px] text-qm-text-muted font-mono bg-qm-surface px-1.5 py-0.5 rounded inline-block mt-1">
                              {sig.endpoint}
                            </span>
                          </div>
                          <div className={`text-sm font-mono font-bold ${SIGNAL_COLORS[type] || 'text-qm-green'}`}>
                            ${sig.price_usdc?.toFixed(3)}
                          </div>
                        </div>

                        <p className="text-[10px] text-qm-text-muted leading-relaxed mb-3 line-clamp-2">
                          {sig.description}
                        </p>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className={`w-3 h-3 ${queries > 0 ? 'text-qm-green' : 'text-qm-text-muted opacity-40'}`} />
                            <span className="text-[10px] font-bold text-qm-text-muted">
                              {queries} {queries === 1 ? 'query' : 'queries'}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-qm-text-muted opacity-60">
                            x402-PPQ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-qm-surface-alt px-6 py-3 border-t border-qm-border text-center shrink-0">
        <p className="text-[9px] text-qm-text-muted italic">
          All endpoints are settled in real-time via x402 PPQ standard on Arc Network.
        </p>
      </div>
    </div>
  );
}

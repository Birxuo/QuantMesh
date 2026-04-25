'use client';

import { useState, useEffect } from 'react';
import { Activity, Wallet, BarChart3, Clock, TrendingUp, DollarSign, Zap, Play, Square, Server, Bot } from 'lucide-react';
import { fetchStats, fetchSystemStatus, toggleEngine } from '../lib/api';

export default function AgentStatus({ agentState, wsConnected }) {
  const [stats, setStats] = useState(null);
  const [startTime] = useState(() => Date.now());
  const [sysStatus, setSysStatus] = useState({ provider: false, agent: false });
  const [isToggling, setIsToggling] = useState(false);

  // Poll stats and system status
  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      try {
        const status = await fetchSystemStatus().catch(() => ({ provider: false, agent: false }));
        if (mounted) setSysStatus(status);
        
        if (status.provider) {
          const data = await fetchStats();
          if (mounted) setStats(data);
        }
      } catch {
        // Provider offline
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const [toggleError, setToggleError] = useState(null);

  const handleToggle = async (target, action) => {
    setIsToggling(true);
    setToggleError(null);
    try {
      await toggleEngine(target, action);
      // Optimistic update
      setSysStatus(prev => ({ ...prev, [target]: action === 'start' }));
    } catch (err) {
      console.error(err);
      setToggleError(`Failed to ${action} ${target}: ${err.message}`);
      // Clear error after 5 seconds
      setTimeout(() => setToggleError(null), 5000);
    }
    setIsToggling(false);
  };

  // Real data from stats endpoint
  const totalTxCount = stats?.transaction_count || 0;
  const totalUsdc = stats?.total_usdc || 0;
  const endpointBreakdown = stats?.endpoints || [];
  const providerWallet = stats?.provider_wallet || '';
  const network = stats?.network || '';

  // Agent state from WebSocket events
  const cycleCount = agentState?.cycle_count || 0;
  const signalsPurchased = agentState?.signals_purchased || 0;
  const agentWallet = agentState?.wallet || '';
  const lastDecision = typeof agentState?.decision === 'object' ? agentState?.decision?.action : (agentState?.decision || '');
  const confidence = agentState?.confidence || (typeof agentState?.decision === 'object' ? agentState?.decision?.confidence : 0) || 0;

  // Calculate uptime from page load
  const uptimeMs = Date.now() - startTime;
  const uptimeMinutes = (uptimeMs / 60000).toFixed(1);

  // TPM from real transaction count over uptime
  const tpm = uptimeMs > 60000
    ? ((totalTxCount / (uptimeMs / 60000))).toFixed(1)
    : totalTxCount.toFixed(0);

  return (
    <div className="border border-qm-border rounded-lg bg-white overflow-hidden h-full shadow-sm">
      {/* Panel Header */}
      <div className="bg-qm-surface px-8 py-5 border-b border-qm-border flex justify-between items-center sm:flex-row flex-col gap-4">
        <h2 className="font-bold tracking-tight text-sm uppercase flex items-center gap-2">
          <Activity className="w-4 h-4 text-qm-green" />
          Network Status
        </h2>
        
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2 mr-2">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-qm-green animate-pulse' : 'bg-qm-orange'}`} />
            <span className="text-[10px] font-mono text-qm-text-muted">
              {wsConnected ? 'LIVE FEED' : 'OFFLINE'}
            </span>
          </div>

          {/* Engine Controls: Full Stack */}
          <div className="flex items-center gap-2 bg-white rounded border border-qm-border p-1 shadow-inner">
            
            {/* Provider Toggle */}
            {!sysStatus.provider ? (
              <button
                onClick={() => handleToggle('provider', 'start')}
                disabled={isToggling}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded text-[9px] font-bold uppercase transition-transform hover:scale-105 disabled:opacity-50"
                title="Launch FastAPI Backend"
              >
                <Server className="w-3 h-3" />
                Boot Server
              </button>
            ) : (
              <button
                onClick={() => handleToggle('provider', 'stop')}
                disabled={isToggling}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 rounded text-[9px] font-bold uppercase transition-transform hover:scale-105 disabled:opacity-50"
                title="Halt FastAPI Backend"
              >
                <Square className="w-3 h-3 fill-current" />
                Halt Server
              </button>
            )}

            {/* Agent Toggle - Only show if provider is somewhat alive */}
            {sysStatus.provider && (
              !sysStatus.agent ? (
                <button
                  onClick={() => handleToggle('agent', 'start')}
                  disabled={isToggling}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded text-[9px] font-bold uppercase transition-transform hover:scale-105 disabled:opacity-50"
                  title="Launch Python Consumer Agent"
                >
                  <Bot className="w-3 h-3" />
                  Deploy Agent
                </button>
              ) : (
                <button
                  onClick={() => handleToggle('agent', 'stop')}
                  disabled={isToggling}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 rounded text-[9px] font-bold uppercase transition-transform hover:scale-105 disabled:opacity-50"
                  title="Halt Python Consumer Agent"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Halt Agent
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Engine Toggle Error Banner */}
      {toggleError && (
        <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-600 text-[10px] font-mono">
          ⚠ {toggleError}
        </div>
      )}

      {/* Institutional Metrics Grid */}
      <div className="grid grid-cols-3 divide-x divide-qm-border border-b border-qm-border">
        {/* Revenue */}
        <div className="p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-qm-text-muted mb-3">
            <DollarSign className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Revenue</span>
          </div>
          <div className="font-mono text-3xl font-medium tracking-tighter text-qm-green">
            ${totalUsdc.toFixed(4)}
          </div>
          <div className="text-[10px] text-qm-text-muted font-bold mt-2 font-mono uppercase">
            {totalTxCount} settled tx
          </div>
        </div>

        {/* Tx Frequency */}
        <div className="p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-qm-text-muted mb-3">
            <BarChart3 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Throughput</span>
          </div>
          <div className="font-mono text-3xl font-medium tracking-tighter">
            {tpm} <span className="text-sm text-qm-text-muted">TPM</span>
          </div>
          <div className="text-[10px] text-qm-text-muted font-bold mt-2 font-mono uppercase">
            {endpointBreakdown.length} active endpoints
          </div>
        </div>

        {/* Uptime */}
        <div className="p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-qm-text-muted mb-3">
            <Clock className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Session</span>
          </div>
          <div className="font-mono text-3xl font-medium tracking-tighter">
            {uptimeMinutes} <span className="text-sm text-qm-text-muted">MIN</span>
          </div>
          <div className="text-[10px] text-qm-text-muted font-bold mt-2 font-mono uppercase">
            {cycleCount > 0 ? `Agent cycle ${cycleCount}` : 'Monitoring'}
          </div>
        </div>
      </div>

      {/* Endpoint Breakdown */}
      <div className="p-6 flex-1">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-3.5 h-3.5 text-qm-orange" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-qm-text-muted">
            Endpoint Revenue Breakdown
          </span>
        </div>

        {endpointBreakdown.length === 0 ? (
          <div className="text-[10px] font-mono text-qm-text-muted opacity-40 text-center py-8 border border-dashed border-qm-border rounded-lg">
            Awaiting signal settlement...
          </div>
        ) : (
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[300px] pr-2 -mr-2">
            {[...endpointBreakdown]
              .sort((a, b) => b.revenue - a.revenue)
              .map((ep) => {
              const pct = totalUsdc > 0 ? (ep.revenue / totalUsdc) * 100 : 0;
              
              // Extract parts for better styling (e.g., /signals/momentum/BTC-USD)
              const parts = ep.endpoint.split('/');
              const isSignal = parts[1] === 'signals';
              const signalType = isSignal ? parts[2] : 'sys';
              const asset = isSignal ? parts[3] : ep.endpoint;

              // Color mapping for signal types
              const typeColors = {
                momentum: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                volatility: 'text-amber-700 bg-amber-50 border-amber-200',
                sentiment: 'text-blue-700 bg-blue-50 border-blue-200',
                'arb-spread': 'text-purple-700 bg-purple-50 border-purple-200',
              };
              const badgeClass = typeColors[signalType] || 'text-gray-700 bg-gray-50 border-gray-200';

              return (
                <div key={ep.endpoint} className="group relative flex flex-col p-3 rounded-lg border border-transparent hover:border-qm-border hover:bg-qm-surface-alt transition-all">
                  <div className="flex justify-between items-center mb-2.5">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${badgeClass} shrink-0`}>
                        {signalType.replace('-', ' ')}
                      </div>
                      <span className="text-[11px] font-mono font-bold truncate">
                        {asset}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-mono text-qm-text-muted">
                        {ep.queries.toLocaleString()}×
                      </span>
                      <span className="text-[11px] font-mono font-bold text-qm-green w-[52px] text-right">
                        ${ep.revenue.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-qm-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black/80 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-qm-text-muted w-8 text-right shrink-0">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}


      </div>

      {/* Network info footer */}
      {(providerWallet || network) && (
        <div className="bg-qm-surface-alt px-6 py-3 border-t border-qm-border flex justify-between items-center">
          <span className="text-[9px] font-mono text-qm-text-muted">
            {network}
          </span>
          <span className="text-[9px] font-mono text-qm-text-muted">
            PROVIDER: {providerWallet ? `${providerWallet.slice(0, 6)}...${providerWallet.slice(-4)}` : '—'}
          </span>
        </div>
      )}
    </div>
  );
}

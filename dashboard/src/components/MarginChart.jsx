'use client';

import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Scale, Loader2, AlertCircle } from 'lucide-react';
import { fetchTransactions } from '../lib/api';

// Average Ethereum L1 gas cost for a simple transaction (in USD)
// Based on historical gas prices: ~21,000 gas * ~30 gwei * ~$3,200 ETH
const ETH_AVG_TX_COST = 5.40;

function buildCostComparisonData(transactions) {
  if (!transactions || transactions.length === 0) return [];

  // Group transactions by 30-minute windows
  const buckets = {};
  const sortedTxs = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

  for (const tx of sortedTxs) {
    const ts = tx.timestamp * 1000;
    const date = new Date(ts);
    // Round to nearest 30 minutes
    const minutes = date.getMinutes();
    date.setMinutes(minutes < 30 ? 0 : 30, 0, 0);
    const key = date.getTime();

    if (!buckets[key]) {
      buckets[key] = {
        timestamp: key,
        arc_total: 0,
        eth_total: 0,
        tx_count: 0,
      };
    }

    buckets[key].arc_total += tx.amount_usdc || 0;
    buckets[key].eth_total += ETH_AVG_TX_COST;
    buckets[key].tx_count += 1;
  }

  return Object.values(buckets)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((b) => {
      const d = new Date(b.timestamp);
      const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const timeStr = d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return {
        time: `${dateStr} ${timeStr}`,
        arc_cost: Math.round(b.arc_total * 10000) / 10000,
        eth_cost: Math.round(b.eth_total * 100) / 100,
        tx_count: b.tx_count,
      };
    });
}

const CustomXAxisTick = ({ x, y, payload }) => {
  if (!payload || !payload.value) return null;
  const parts = payload.value.split(' ');
  const dateStr = parts[0];
  const timeStr = parts.slice(1).join(' ');
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#888" fontSize={9} fontFamily="var(--font-mono)">
        {dateStr}
      </text>
      <text x={0} y={0} dy={24} textAnchor="middle" fill="#333" fontSize={10} fontFamily="var(--font-mono)" fontWeight="bold">
        {timeStr}
      </text>
    </g>
  );
};

export default function MarginChart() {
  const [isMounted, setIsMounted] = useState(false);
  const [txHistory, setTxHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // SSR Safety for Recharts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch real transaction history
  useEffect(() => {
    let mounted = true;

    async function loadTxs() {
      try {
        const data = await fetchTransactions();
        if (!mounted) return;
        setTxHistory(data);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError('Provider offline');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTxs();
    const interval = setInterval(loadTxs, 15000); // Refresh every 15s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const chartData = useMemo(() => buildCostComparisonData(txHistory), [txHistory]);

  // Calculate efficiency multiplier from real data
  const totalArc = txHistory.reduce((s, tx) => s + (tx.amount_usdc || 0), 0);
  const totalEth = txHistory.length * ETH_AVG_TX_COST;
  const efficiency = totalArc > 0 ? Math.round(totalEth / totalArc) : 0;
  const marginPct = totalEth > 0 ? ((1 - totalArc / totalEth) * 100).toFixed(2) : '0.00';

  if (!isMounted) {
    return (
      <div className="border border-qm-border rounded-lg bg-white h-full min-h-[400px] flex items-center justify-center">
        <span className="text-xs text-qm-text-muted font-mono animate-pulse">BOOTING_CORE_VIZ...</span>
      </div>
    );
  }

  return (
    <div className="border border-qm-border rounded-lg bg-white overflow-hidden flex flex-col h-full shadow-sm">
      {/* Panel Header */}
      <div className="bg-qm-surface px-8 py-5 border-b border-qm-border flex justify-between items-center">
        <h2 className="font-bold tracking-tight text-sm uppercase flex items-center gap-2">
          <Scale className="w-4 h-4 text-qm-green" />
          The Economics of Alpha (Nanopayment Edge)
        </h2>
        <div className="text-[10px] font-mono font-bold text-qm-green flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-qm-green" />
          ARC_MARGIN: {marginPct}%
        </div>
      </div>

      {/* Chart Body */}
      <div className="flex-1 p-6 min-h-[300px] qm-grid-bg relative">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-qm-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-mono">LOADING_TX_HISTORY...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-qm-text-muted">
            <AlertCircle className="w-6 h-6 text-qm-orange" />
            <span className="text-xs font-mono">{error}</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-qm-text-muted">
            <Scale className="w-8 h-8 opacity-20" />
            <span className="text-xs font-mono">NO SETTLED TRANSACTIONS YET</span>
            <span className="text-[10px] font-mono opacity-60">
              Run the consumer agent to generate x402 transactions
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={250}>
            <AreaChart data={chartData.slice(-500)} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorArc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0a7739" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0a7739" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000a" />
              <XAxis
                dataKey="time"
                height={50}
                axisLine={{ stroke: '#0000001a' }}
                tick={<CustomXAxisTick />}
              />
              <YAxis
                fontSize={10}
                axisLine={{ stroke: '#0000001a' }}
                tick={{ fill: '#666', fontVariantNumeric: 'tabular-nums' }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #0000001a',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value, name) => {
                  if (name === 'Ethereum Gas (Avg)') return [`$${value.toFixed(2)}`, name];
                  return [`$${value.toFixed(4)}`, name];
                }}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Area
                name="Ethereum Gas (Avg)"
                type="monotone"
                dataKey="eth_cost"
                stroke="#666"
                strokeDasharray="5 5"
                fill="transparent"
              />
              <Area
                name="Arc Nanopayment"
                type="monotone"
                dataKey="arc_cost"
                stroke="#0a7739"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorArc)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Overlay — only show when we have data */}
        {chartData.length > 0 && efficiency > 0 && (
          <div className="absolute top-10 right-10 p-4 border border-qm-border bg-white rounded shadow-sm flex flex-col gap-1">
            <span className="text-[9px] font-bold text-qm-text-muted uppercase tracking-widest">Efficiency Multiplier</span>
            <span className="text-xl font-mono font-bold">{efficiency.toLocaleString()}<span className="text-qm-green">X</span></span>
            <span className="text-[9px] font-mono text-qm-text-muted">{txHistory.length} transactions</span>
          </div>
        )}
      </div>

      {/* Logic Summary */}
      <div className="bg-qm-surface-alt px-8 py-4 border-t border-qm-border">
        <div className="flex justify-between items-center text-[10px] font-mono text-qm-text-muted">
          <span>SOURCE: REAL_TX_HISTORY | ETH_L1_AVG: ${ETH_AVG_TX_COST}/tx</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-gray-400 border-t border-dashed border-gray-600" /> ETHEREUM</span>
            <span className="flex items-center gap-1 text-qm-green font-bold"><div className="w-2 h-0.5 bg-qm-green" /> ARC_X402</span>
          </div>
        </div>
      </div>
    </div>
  );
}

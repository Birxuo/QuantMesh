'use client';

import { useState, useEffect, useMemo } from 'react';
import { History, ExternalLink, Hash, Download, Search, Filter, RefreshCw } from 'lucide-react';
import { fetchTransactions } from '../lib/api';

const BLOCK_EXPLORER = 'https://testnet.arcscan.app';

function formatTxHash(hash) {
  if (!hash) return '—';
  const h = hash.startsWith('0x') ? hash : `0x${hash}`;
  return `${h.slice(0, 10)}...${h.slice(-8)}`;
}

function normalizeTxHash(hash) {
  if (!hash) return '';
  return hash.startsWith('0x') ? hash : `0x${hash}`;
}

function formatWallet(wallet) {
  if (!wallet || wallet === 'unknown') return '—';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function parseEndpoint(endpoint) {
  if (!endpoint) return { signal: '—', asset: '—' };
  const parts = endpoint.replace('/signals/', '').split('/');
  return {
    signal: parts[0] || '—',
    asset: parts[1] || endpoint,
  };
}

export default function AuditLog() {
  const [allTxs, setAllTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSignal, setFilterSignal] = useState('all');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');

  // Load full transaction history
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchTransactions();
        setAllTxs(data);
        setError(null);
      } catch {
        setError('Provider offline');
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Extract unique signal types for filter
  const signalTypes = useMemo(() => {
    const types = new Set();
    allTxs.forEach((tx) => {
      const { signal } = parseEndpoint(tx.endpoint);
      types.add(signal);
    });
    return Array.from(types).sort();
  }, [allTxs]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...allTxs];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((tx) =>
        (tx.tx_hash || '').toLowerCase().includes(q) ||
        (tx.endpoint || '').toLowerCase().includes(q) ||
        (tx.from_wallet || '').toLowerCase().includes(q)
      );
    }

    // Signal type filter
    if (filterSignal !== 'all') {
      result = result.filter((tx) => {
        const { signal } = parseEndpoint(tx.endpoint);
        return signal === filterSignal;
      });
    }

    // Sort
    result.sort((a, b) => {
      let va = a[sortField] || 0;
      let vb = b[sortField] || 0;
      if (sortField === 'amount_usdc') { va = Number(va); vb = Number(vb); }
      if (sortDir === 'desc') return va > vb ? -1 : va < vb ? 1 : 0;
      return va < vb ? -1 : va > vb ? 1 : 0;
    });

    return result;
  }, [allTxs, searchQuery, filterSignal, sortField, sortDir]);

  // Aggregate stats
  const totalRevenue = filtered.reduce((s, tx) => s + (tx.amount_usdc || 0), 0);

  // CSV export
  const exportCSV = () => {
    const header = 'timestamp,tx_hash,endpoint,from_wallet,amount_usdc,block_number';
    const rows = filtered.map((tx) =>
      `${tx.timestamp},${tx.tx_hash},${tx.endpoint},${tx.from_wallet},${tx.amount_usdc},${tx.block_number || 0}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantmesh-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIndicator = ({ field }) => {
    if (sortField !== field) return null;
    return <span className="ml-1 text-[8px]">{sortDir === 'desc' ? '▼' : '▲'}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-qm-text-muted">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        <span className="text-xs font-mono">LOADING_AUDIT_LOG...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-qm-text-muted" />
            <input
              type="text"
              placeholder="Search tx hash, endpoint, wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-qm-border rounded-lg text-[11px] font-mono bg-white focus:outline-none focus:border-black/30 transition-colors"
            />
          </div>

          {/* Signal filter */}
          <div className="relative">
            <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-qm-text-muted" />
            <select
              value={filterSignal}
              onChange={(e) => setFilterSignal(e.target.value)}
              className="pl-8 pr-6 py-2 border border-qm-border rounded-lg text-[11px] font-mono bg-white focus:outline-none focus:border-black/30 transition-colors appearance-none cursor-pointer"
            >
              <option value="all">All Types</option>
              {signalTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-qm-text-muted">
            {filtered.length} records · ${totalRevenue.toFixed(4)} USDC
          </span>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-qm-border rounded text-[10px] font-bold hover:border-black/30 transition-colors uppercase"
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="border border-qm-border rounded-lg bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-qm-surface-alt text-[10px] font-mono text-qm-text-muted uppercase">
                <th className="px-5 py-3 font-medium cursor-pointer hover:text-black transition-colors" onClick={() => toggleSort('id')}>
                  # <SortIndicator field="id" />
                </th>
                <th className="px-5 py-3 font-medium cursor-pointer hover:text-black transition-colors" onClick={() => toggleSort('timestamp')}>
                  Timestamp <SortIndicator field="timestamp" />
                </th>
                <th className="px-5 py-3 font-medium">Signal</th>
                <th className="px-5 py-3 font-medium">Asset</th>
                <th className="px-5 py-3 font-medium">Tx Hash</th>
                <th className="px-5 py-3 font-medium">Payer</th>
                <th className="px-5 py-3 font-medium text-right cursor-pointer hover:text-black transition-colors" onClick={() => toggleSort('amount_usdc')}>
                  Amount <SortIndicator field="amount_usdc" />
                </th>
                <th className="px-5 py-3 font-medium text-right">Block</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center text-qm-text-muted font-mono opacity-50">
                    {error ? error : searchQuery || filterSignal !== 'all' ? 'No matching records' : 'No transactions recorded yet'}
                  </td>
                </tr>
              ) : (
                filtered.map((tx, i) => {
                  const { signal, asset } = parseEndpoint(tx.endpoint);
                  const txHash = tx.tx_hash || '';
                  return (
                    <tr
                      key={tx.id || txHash || i}
                      className="border-t border-qm-border hover:bg-qm-surface/30 transition-colors"
                    >
                      <td className="px-5 py-2.5 text-qm-text-muted font-mono text-[10px]">
                        {tx.id || i + 1}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-qm-text-muted">
                        {tx.timestamp
                          ? new Date(tx.timestamp * 1000).toLocaleString([], {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false,
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="px-1.5 py-0.5 border border-qm-border rounded bg-qm-surface text-[9px] font-bold uppercase">
                          {signal}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 font-bold">{asset}</td>
                      <td className="px-5 py-2.5">
                        {txHash ? (
                          <a
                            href={`${BLOCK_EXPLORER}/tx/${normalizeTxHash(txHash)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-qm-green hover:text-black transition-colors font-mono text-[10px]"
                            title="View Transaction on ArcScan"
                          >
                            <Hash className="w-3 h-3" />
                            {formatTxHash(txHash)}
                            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                          </a>
                        ) : (
                          <span className="text-qm-text-muted font-mono text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-[10px] text-qm-text-muted">
                        {formatWallet(tx.from_wallet)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono font-bold text-qm-green">
                        ${(tx.amount_usdc || 0).toFixed(4)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-[10px] text-qm-text-muted">
                        {tx.block_number || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

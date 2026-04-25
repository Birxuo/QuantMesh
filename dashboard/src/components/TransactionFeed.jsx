'use client';

import { ListTree, Hash, ExternalLink, Clock, ArrowUpRight } from 'lucide-react';

const BLOCK_EXPLORER = 'https://testnet.arcscan.app';

function formatTxHash(hash) {
  if (!hash) return '—';
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function formatEndpoint(endpoint) {
  if (!endpoint) return '—';
  // /signals/momentum/BTC-USD → MOMENTUM · BTC-USD
  const parts = endpoint.replace('/signals/', '').split('/');
  if (parts.length === 2) {
    return { type: parts[0].toUpperCase(), ticker: parts[1] };
  }
  return { type: parts[0]?.toUpperCase() || '—', ticker: endpoint };
}

function formatWallet(wallet) {
  if (!wallet || wallet === 'unknown') return '—';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

import { useState, useEffect } from 'react';

export default function TransactionFeed({ transactions, totalCount, totalUsdc }) {
  const [now, setNow] = useState('—');

  useEffect(() => {
    setNow(new Date().toLocaleTimeString());
    const interval = setInterval(() => setNow(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="border border-qm-border rounded-lg bg-white overflow-hidden flex flex-col h-[500px] shadow-sm">
      {/* Panel Header */}
      <div className="bg-qm-surface px-8 py-5 border-b border-qm-border flex justify-between items-center shrink-0">
        <h2 className="font-bold tracking-tight text-sm uppercase flex items-center gap-2">
          <ListTree className="w-4 h-4" />
          Real-time Settlement Ledger
        </h2>
        <div className="flex items-center gap-4 font-mono text-[11px] text-qm-text-muted">
          <span>TX_POOL: {transactions.length}</span>
          <div className="w-px h-3 bg-qm-border" />
          <span className="text-qm-green font-bold text-sm">REVENUE: ${totalUsdc.toFixed(4)}</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="flex-1 overflow-y-auto qm-grid-bg">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-qm-surface-alt border-b border-qm-border z-10">
            <tr className="font-mono text-[10px] text-qm-text-muted uppercase">
              <th className="px-5 py-3 font-medium">Timestamp</th>
              <th className="px-5 py-3 font-medium">Signal</th>
              <th className="px-5 py-3 font-medium">Tx Hash</th>
              <th className="px-5 py-3 font-medium">From</th>
              <th className="px-5 py-3 font-medium text-right">Settlement</th>
            </tr>
          </thead>
          <tbody className="font-code text-[11px]">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-20 text-center text-qm-text-muted italic opacity-50">
                  <div className="flex flex-col items-center gap-3">
                    <ListTree className="w-6 h-6 opacity-30" />
                    <span>Waiting for x402 network activity...</span>
                    <span className="text-[10px]">
                      Run: python -m consumer.agent
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.slice(0, 200).map((tx, i) => {
                const { type, ticker } = formatEndpoint(tx.endpoint);
                const txHash = tx.tx_hash || '';
                return (
                  <tr
                    key={txHash || i}
                    className="border-b border-qm-border hover:bg-qm-surface/30 transition-colors group"
                  >
                    <td className="px-5 py-3 text-qm-text-muted font-mono">
                      {tx.timestamp
                        ? new Date(tx.timestamp * 1000).toLocaleTimeString([], {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 border border-qm-border rounded bg-qm-surface text-[9px] font-bold group-hover:border-black/30 transition-colors">
                          {type}
                        </span>
                        <span className="font-bold text-black">{ticker}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={`${BLOCK_EXPLORER}/address/${tx.from || '0x52ab4dc272B136534f0C482F8Fe35811304222A3'}#tokentxns`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-qm-green hover:text-black transition-colors"
                        title="View Payer Wallet Token Transfers"
                      >
                        <Hash className="w-3 h-3" />
                        <span className="font-mono text-[10px]">{formatTxHash(txHash)}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </td>
                    <td className="px-5 py-3 text-[10px] font-mono text-qm-text-muted">
                      {formatWallet(tx.from)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-bold text-qm-green flex items-center justify-end gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        +${(tx.amount || 0).toFixed(4)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Stats */}
      <div className="bg-qm-surface-alt px-6 py-3 border-t border-qm-border flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-qm-text-muted font-mono">
          <Clock className="w-3 h-3" />
          <span>LAST_UPDATE: {now}</span>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-qm-text-muted">
          Lifetime Settled: {totalCount}
        </div>
      </div>
    </div>
  );
}

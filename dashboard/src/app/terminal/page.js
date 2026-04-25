'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Activity, LayoutDashboard, Database, History, ChevronLeft, Wifi, WifiOff } from 'lucide-react';
import TransactionFeed from '../../components/TransactionFeed';
import MarginChart from '../../components/MarginChart';
import AgentStatus from '../../components/AgentStatus';
import SignalCatalog from '../../components/SignalCatalog';
import RawSignals from '../../components/RawSignals';
import AuditLog from '../../components/AuditLog';
import Logo from '../../components/Logo';
import { QuantMeshSocket, fetchStats, fetchTransactions } from '../../lib/api';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'signals', label: 'Raw Signals', icon: Database },
  { id: 'audit', label: 'Audit Log', icon: History },
];

export default function TerminalPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [agentState, setAgentState] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [totalUsdc, setTotalUsdc] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [newTxFlash, setNewTxFlash] = useState(false);
  const flashTimeout = useRef(null);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((data) => {
    if (data.type === 'tx') {
      const txRecord = {
        tx_hash: data.tx_hash,
        endpoint: data.endpoint,
        amount_usdc: data.amount,
        amount: data.amount,
        from_wallet: data.from,
        from: data.from,
        timestamp: data.timestamp,
        block_number: data.block_number,
        signal_data: data.signal_data,
      };
      setTransactions((prev) => [txRecord, ...prev]);
      if (typeof data.total_count === 'number') setTotalCount(data.total_count);
      if (typeof data.total_usdc === 'number') setTotalUsdc(data.total_usdc);

      // Flash effect on new transaction
      setNewTxFlash(true);
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => setNewTxFlash(false), 800);
    } else if (data.type === 'agent') {
      setAgentState(data);
    } else if (data.type === 'init') {
      setTotalCount(data.transaction_count || 0);
      setTotalUsdc(data.total_usdc || 0);
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    const ws = new QuantMeshSocket(handleMessage, setWsConnected);
    ws.connect();
    const pingInterval = setInterval(() => ws.sendPing(), 30000);
    return () => {
      clearInterval(pingInterval);
      ws.disconnect();
    };
  }, [handleMessage]);

  // Load initial data from REST
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [statsData, txData] = await Promise.all([
          fetchStats().catch(() => null),
          fetchTransactions().catch(() => []),
        ]);

        if (statsData) {
          setTotalCount(statsData.transaction_count || 0);
          setTotalUsdc(statsData.total_usdc || 0);
        }

        if (txData.length > 0) {
          const mapped = txData.map((tx) => ({
            ...tx,
            amount: tx.amount_usdc,
            from: tx.from_wallet,
          }));
          setTransactions(mapped);
        }
      } catch {
        // Provider offline on load
      }
    }
    loadInitialData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Terminal Header */}
      <header className={`border-b border-qm-border px-6 py-4 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-50 transition-colors duration-300 ${newTxFlash ? 'border-b-qm-green/40' : ''}`}>
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo className="w-9 h-9 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-sm leading-none">QuantMesh Terminal</span>
              <span className="text-[9px] text-qm-text-muted font-mono mt-1">v1.0.4-PRO_MAINNET</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center text-qm-text-muted gap-4">
            <div className="w-px h-6 bg-qm-border" />
            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${wsConnected ? 'text-qm-green' : 'text-qm-orange'}`}>
              {wsConnected ? (
                <>
                  <Wifi className="w-3 h-3 animate-pulse" />
                  Provider Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  Provider Disconnected
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* Global Revenue Counter */}
          <div className="hidden lg:flex items-center gap-6 text-[10px] uppercase font-bold tracking-[0.15em] text-qm-text-muted">
            <div className="flex flex-col items-end">
              <span className="text-[8px] opacity-60">Total Queries</span>
              <span className={`font-mono text-sm font-medium transition-colors duration-300 ${newTxFlash ? 'text-qm-green' : 'text-black'}`}>
                {totalCount.toLocaleString()}
              </span>
            </div>
            <div className="w-px h-8 bg-qm-border" />
            <div className="flex flex-col items-end">
              <span className="text-[8px] opacity-60">Cumulative Revenue</span>
              <span className={`font-mono text-sm font-medium text-qm-green transition-all duration-300 ${newTxFlash ? 'scale-110' : 'scale-100'}`}>
                ${totalUsdc.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full transition-colors ${wsConnected ? 'bg-qm-green' : 'bg-qm-orange'}`} />
            <span className="text-[10px] font-mono leading-none">
              {wsConnected ? 'RPC_UP' : 'RPC_RECONNECTING'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Terminal Grid */}
      <main className="flex-1 p-6 lg:p-10 max-w-[1700px] mx-auto w-full">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between mb-8 border-b border-qm-border pb-6">
          <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest border-l-4 border-black pl-4">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 transition-colors ${
                    isActive
                      ? 'text-black underline underline-offset-4 decoration-2'
                      : 'text-qm-text-muted hover:text-black'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          
          <Link href="/" className="flex items-center gap-2 text-[10px] font-bold text-qm-text-muted hover:text-black transition-all">
            <ChevronLeft className="w-3 h-3" /> Exit Terminal
          </Link>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-auto animate-fadeIn">
            <div className="min-h-[500px]">
              <TransactionFeed
                transactions={transactions}
                totalCount={totalCount}
                totalUsdc={totalUsdc}
              />
            </div>
            <div className="min-h-[500px]">
              <MarginChart />
            </div>
            <div className="min-h-[400px]">
              <AgentStatus
                agentState={agentState}
                wsConnected={wsConnected}
              />
            </div>
            <div className="min-h-[500px]">
              <SignalCatalog transactions={transactions} />
            </div>
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="animate-fadeIn">
            <RawSignals />
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="animate-fadeIn">
            <AuditLog />
          </div>
        )}

        {/* System Footer */}
        <div className="mt-12 border-t border-qm-border pt-6 flex flex-col md:flex-row justify-between items-center text-[10px] font-mono text-qm-text-muted gap-4">
          <div className="flex gap-4">
            <span>NETWORK: ARC-PPQ-V4</span>
            <span>SETTLEMENT: USDC_CIRCLE</span>
            <span>VERSION: 0.1.2_STABLE</span>
          </div>
          <div className="text-center font-bold tracking-widest">
            QUANTMESH PROTOCOL · {new Date().getFullYear()}
          </div>
          <div className="flex gap-4">
            <span className={`uppercase ${wsConnected ? 'text-qm-green' : 'text-qm-orange'}`}>
              ● {wsConnected ? 'All systems operational' : 'Provider offline'}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

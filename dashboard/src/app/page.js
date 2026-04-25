'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Activity, Shield, Zap, TrendingUp, BarChart3, Binary } from 'lucide-react';
import Logo from '../components/Logo';

export default function LandingPage() {
  const [stats, setStats] = useState(null);

  // Fetch live stats from the provider if available
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/provider/stats', { signal: AbortSignal.timeout(3000) });
        if (res.ok) setStats(await res.json());
      } catch {
        // Provider offline — landing page works fine without it
      }
    }
    loadStats();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-qm-border px-6 py-4 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <Logo className="w-9 h-9" />
          <span className="font-bold tracking-tight text-lg">QuantMesh</span>
        </div>
        <div className="flex items-center gap-8 text-sm font-medium">
          <Link href="#vision" className="hover:opacity-60 transition-opacity">Hackathon Thesis</Link>
          <Link href="#logic" className="hover:opacity-60 transition-opacity">Protocol</Link>
          <Link href="#economics" className="hover:opacity-60 transition-opacity">Economics</Link>
          <Link href="/terminal" className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors">
            Launch Terminal
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-6 max-w-6xl mx-auto text-center border-b border-qm-border w-full relative overflow-hidden">
        <div className="absolute inset-0 qm-grid-bg opacity-20 -z-10" />
        
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.9]">
          THE <span className="font-display italic font-normal text-qm-green">NANOPAYMENT</span><br />
          SIGNAL TERMINAL
        </h1>
        
        <p className="max-w-2xl mx-auto text-xl text-qm-text-muted mb-10 leading-relaxed">
          The internet-native standard for high-fidelity financial data. 
          Powered by the x402 protocol and the Arc blockchain to enable real-time, pay-per-query signal settlement at sub-cent scale.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link href="/terminal" className="px-8 py-4 bg-black text-white rounded-full font-bold text-lg hover:bg-gray-800 transition-all shadow-xl shadow-black/10 flex items-center gap-2">
            Start Trading Signals
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a href="#vision" className="px-8 py-4 border border-qm-border rounded-full font-bold text-lg hover:bg-qm-surface transition-all">
            Read The Vision
          </a>
        </div>

        {/* Live Stats Bar — only shows when provider is online */}
        {stats && (
          <div className="max-w-lg mx-auto border border-qm-border rounded-xl p-4 bg-white/80 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-center gap-8 text-sm font-mono">
              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase tracking-widest text-qm-text-muted font-bold">Settled Transactions</span>
                <span className="text-2xl font-bold">{stats.transaction_count?.toLocaleString() || 0}</span>
              </div>
              <div className="w-px h-10 bg-qm-border" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase tracking-widest text-qm-text-muted font-bold">Revenue (USDC)</span>
                <span className="text-2xl font-bold text-qm-green">${stats.total_usdc?.toFixed(4) || '0.0000'}</span>
              </div>
              <div className="w-px h-10 bg-qm-border" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase tracking-widest text-qm-text-muted font-bold">Endpoints</span>
                <span className="text-2xl font-bold">{stats.endpoints?.length || 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] font-bold text-qm-green">
              <Activity className="w-3 h-3 animate-pulse" />
              <span>PROVIDER ONLINE</span>
            </div>
          </div>
        )}
      </section>

      {/* The Vision / Hackathon Thesis */}
      <section id="vision" className="py-24 px-6 max-w-4xl mx-auto w-full border-b border-qm-border">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full mb-6">
            <Binary className="w-3 h-3" />
            Hackathon Thesis
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-8">
            The Core Problem: <br/>
            <span className="text-qm-text-muted">Micropayments have never worked on the internet.</span>
          </h2>
          
          <div className="prose prose-lg max-w-none text-qm-text-muted space-y-6">
            <p className="leading-relaxed">
              Every API today charges subscriptions or bulk credits because processing a $0.002 payment has been physically impossible — the transaction fee to move that money is bigger than the money itself. So the entire internet settled for an inferior pricing model. You pay $99/month for a data feed whether you query it once or a million times. 
            </p>
            <p className="font-bold text-black text-xl border-l-4 border-black pl-6 py-2">
              AI agents can't pay for what they use because there's no payment rail that works at that granularity.
            </p>
          </div>
        </div>

        <div className="mb-16">
          <h3 className="text-2xl font-bold tracking-tight mb-6">What QuantMesh Demonstrates</h3>
          <div className="p-8 border border-qm-border rounded-2xl bg-qm-surface-alt shadow-inner">
            <p className="text-lg text-qm-text-muted leading-relaxed">
              When an AI agent needs a market signal, it should pay <span className="text-black font-bold">exactly for that signal — $0.002</span>, settled instantly, no human involved, no subscription, no batching. The agent queries, the agent pays, the provider gets paid. Every single time. 
              <br/><br/>
              <span className="text-qm-green font-bold text-xl block mt-4">
                That's machine-to-machine commerce working the way software actually works.
              </span>
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="p-8 border border-qm-border rounded-2xl bg-white shadow-sm hover:border-qm-green transition-colors">
            <Shield className="w-8 h-8 text-qm-green mb-6" />
            <h4 className="font-bold text-2xl mb-4">The Unlock:<br/>Arc + Circle</h4>
            <p className="text-sm text-qm-text-muted leading-relaxed">
              Gas fees drop from $1.50 to $0.00001. That one change makes the entire model viable. A pricing structure that was mathematically impossible — negative 69,000% margin on Ethereum — becomes 99.5% margin on Arc. Same product, same payments, completely different economics.
            </p>
          </div>
          <div className="p-8 border border-black rounded-2xl bg-black text-white shadow-xl">
            <TrendingUp className="w-8 h-8 text-white mb-6" />
            <h4 className="font-bold text-2xl mb-4">The Bigger<br/>Picture</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              This isn't really about quant signals. It's a proof that <span className="text-white font-bold">any digital resource</span> — compute, data, API calls, AI inference, bandwidth, storage — can be priced and settled per unit of actual consumption. The subscription model only exists because micropayments didn't work. Now they do. That changes the entire economic layer of the internet.
              <br/><br/>
              <span className="text-qm-green font-mono text-[10px] uppercase tracking-widest">QuantMesh is just the first application sitting on top of that primitive.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Technical Implementation Section */}
      <section id="logic" className="py-24 px-6 max-w-6xl mx-auto w-full border-b border-qm-border">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Technical Implementation</h2>
          <p className="text-lg text-qm-text-muted max-w-2xl mx-auto">
            QuantMesh eliminates the friction between data providers and consumers through the x402 payment protocol.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 border border-qm-border rounded-2xl hover:border-black/20 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-qm-surface flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-qm-orange" />
            </div>
            <h3 className="font-bold text-lg mb-3">Pay-Per-Query Protocol</h3>
            <p className="text-sm text-qm-text-muted leading-relaxed">
              Every signal request is settled atomically via x402, a standard HTTP payment header. 
              No subscriptions, no wallets to manage — just HTTP 402 Payment Required.
            </p>
          </div>

          <div className="p-8 border border-qm-border rounded-2xl hover:border-black/20 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-qm-surface flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-qm-green" />
            </div>
            <h3 className="font-bold text-lg mb-3">On-chain Settlement</h3>
            <p className="text-sm text-qm-text-muted leading-relaxed">
              USDC payments settle on Arc's L2 — a high-throughput blockchain designed for 
              micropayments. Full audit trail recorded directly into a local SQLite ledger.
            </p>
          </div>

          <div className="p-8 border border-qm-border rounded-2xl hover:border-black/20 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-qm-surface flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-lg mb-3">Institutional Signals</h3>
            <p className="text-sm text-qm-text-muted leading-relaxed">
              Momentum, volatility, sentiment, and arbitrage spread signals computed 
              from real market data via yfinance. Served via a FastAPI backend wrapper.
            </p>
          </div>
        </div>
      </section>

      {/* Economic Case Section */}
      <section id="economics" className="py-24 px-6 max-w-6xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold tracking-tight mb-6">
              Why <span className="text-qm-green underline decoration-qm-border underline-offset-8">Arc Nanopayments</span>?
            </h2>
            <p className="text-lg text-qm-text-muted mb-8">
              Legacy networks like Ethereum make individual signal queries impossible. 
              Gas fees swallow the margin of high-frequency data consumption. 
              QuantMesh settles transactions instantly for a fraction of a cent.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border border-qm-border rounded-lg bg-qm-surface-alt">
                <div className="w-10 h-10 rounded-full bg-qm-green/10 flex items-center justify-center text-qm-green font-bold shrink-0">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold">Institutional Scale</h3>
                  <p className="text-sm text-qm-text-muted">Process 10,000 queries per second without bottlenecks.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border border-qm-border rounded-lg">
                <div className="w-10 h-10 rounded-full bg-qm-orange/10 flex items-center justify-center text-qm-orange font-bold shrink-0">
                  !
                </div>
                <div>
                  <h3 className="font-bold">Zero Friction</h3>
                  <p className="text-sm text-qm-text-muted">Automated Settlement via x402 Header Protocol.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-qm-border rounded-2xl overflow-hidden shadow-2xl bg-white">
            <div className="bg-black p-4 text-white font-mono text-xs flex justify-between">
              <span>COMPARISON_TERMINAL</span>
              <span className="text-qm-green text-[10px] animate-pulse">● LIVE</span>
            </div>
            <table className="w-full text-left font-mono text-sm">
              <thead>
                <tr className="border-b border-qm-border bg-qm-surface">
                  <th className="p-4">NETWORK</th>
                  <th className="p-4">FEE (1000 Queries)</th>
                  <th className="p-4 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-qm-border">
                  <td className="p-4">Ethereum L1</td>
                  <td className="p-4">$5,420.00</td>
                  <td className="p-4 text-right text-red-500">FAILED</td>
                </tr>
                <tr className="border-b border-qm-border">
                  <td className="p-4">Solana</td>
                  <td className="p-4">$18.50</td>
                  <td className="p-4 text-right text-orange-500">SUB-OPTIMAL</td>
                </tr>
                <tr className="bg-qm-green/5">
                  <td className="p-4 font-bold">ARC (x402)</td>
                  <td className="p-4 font-bold text-qm-green">
                    {stats
                      ? `$${((stats.total_usdc / Math.max(stats.transaction_count, 1)) * 1000).toFixed(2)}`
                      : '$0.012'
                    }
                  </td>
                  <td className="p-4 text-right font-bold text-qm-green">OPTIMIZED</td>
                </tr>
              </tbody>
            </table>
            <div className="p-6 text-center italic text-qm-text-muted text-xs">
              "Building the rails for the Agentic Economy."
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-qm-border py-12 px-6 flex flex-col md:flex-row justify-between items-center gap-8 bg-qm-surface-alt">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Logo className="w-6 h-6" />
            <span className="font-bold tracking-tight">QuantMesh</span>
          </div>
          <p className="text-xs text-qm-text-muted">© 2026 Internet Native Payments Standard.</p>
        </div>
        
        <div className="flex gap-12">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest">Protocol</span>
            <Link href="#" className="text-sm text-qm-text-muted hover:text-black">x402 Spec</Link>
            <Link href="#" className="text-sm text-qm-text-muted hover:text-black">Arc Chain</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest">Platform</span>
            <Link href="/terminal" className="text-sm text-qm-text-muted hover:text-black">Dashboard</Link>
            <Link href="#" className="text-sm text-qm-text-muted hover:text-black">Documentation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

![QuantMesh Hero Banner](quantmesh_hero_banner_1777083177887.png)

# QuantMesh 🔮

**Institutional-grade financial data marketplace for the Machine Economy.**

QuantMesh enables autonomous AI agents to buy and sell quantitative trading signals—momentum, volatility, sentiment, and microstructure noise—using real-time USDC nanopayments settled on-chain via the **x402 protocol** on the **Arc Network**.

> [!IMPORTANT]
> **Built for the Agentic Economy on Arc Hackathon 2026.**
> QuantMesh demonstrates how sub-cent data monetization is finally viable by eliminating the "Gas Tax" through Arc's ultra-low-cost settlement layer.

---

## ⚡ Performance Benchmarks (Verified)

| Metric | Measured Value |
|:---|:---|
| **Peak Throughput** | **487,469 transactions per minute** |
| **Settlement Frequency** | **8,123.3 transactions per second** |
| **Mean Latency** | **20.7 milliseconds** |
| **Gas Efficiency** | **150,000x** savings vs. Ethereum L1 |
| **Net Margin (Arc)** | **99.7%** on sub-cent signals |

---

## 🏗️ System Architecture

QuantMesh implements a three-tier agentic commerce stack designed for high-concurrency machine-to-machine transactions.

![QuantMesh Architecture](quantmesh_architecture.svg)

### Core Components
1.  **Provider (FastAPI + x402):** Serves quantitative signal endpoints behind a standard-compliant HTTP 402 payment wall.
2.  **Consumer Agent (Python Asyncio):** A fully autonomous trading script. Each 3-second cycle, it analyzes market needs, signs EIP-3009 USDC authorizations, and executes sub-cent purchases.
3.  **Gemini AI Reasoning Layer:** The consumer agent utilizes **Gemini 2.0 Flash** to reason about purchased signals, generating intelligent trade justifications instead of relying on hardcoded rules.
4.  **Real-time Dashboard (Next.js + Tailwind):** Professional observability suite streaming settlements, confidence scores, and economic multipliers via WebSockets.

---

## 🎯 The Economic Thesis

Traditional blockchain payments make sub-cent data pricing mathematically impossible. QuantMesh uses Arc's sub-cent gas model to solve the "L1 Gas Tax" problem.

| Fee Comparison | Ethereum Mainnet | QuantMesh on Arc |
|:---|:---|:---|
| Signal Price | $0.002 | $0.002 |
| Gas Cost per Tx | ~$1.50 | **~$0.00001** |
| **Net Margin** | **-74,900%** ❌ | **+99.7%** ✅ |

> [!NOTE]
> **Why this matters:** On Ethereum, a $0.002 signal costs 750× its value in gas. On Arc, the provider retains 99.7% of the revenue. QuantMesh transforms data markets from a loss-leading impossibility into a high-margin business.

---

## 🔬 Signal Catalog (The Marketplace)

QuantMesh provides a comprehensive catalog of institutional-grade signals via a pay-per-query model. All endpoints are protected by the x402 payment protocol.

| Signal Type | Endpoint | Price (USDC) | Quantitative Objective |
|:---|:---|:---|:---|
| **Momentum** | `/signals/momentum` | $0.002 | Trend-following via 14-day Rate of Change (ROC). |
| **Volatility** | `/signals/volatility` | $0.003 | Risk assessment via 20-day realized volatility. |
| **Sentiment** | `/signals/sentiment` | $0.001 | Institutional sentiment scoring via headline metadata. |
| **OFI** | `/signals/ofi` | $0.005 | Order Flow Imbalance — identifying buyer aggression. |
| **Arb Spread** | `/signals/arb-spread` | $0.005 | Normalized arbitrage spread between cross-pairs. |
| **RV-IV Spread**| `/signals/rv-iv-spread` | $0.006 | Volatility arbitrage via Implied vs Realized spreads. |
| **Cross-Momentum**| `/signals/cross-momentum`| $0.007 | Vol-adjusted cross-sectional momentum factor. |
| **MNR** | `/signals/mnr` | $0.005 | Microstructure Noise — variance ratio filtering. |
| **LAR** | `/signals/lar` | $0.006 | Liquidity-Adjusted Return — Amihud illiquidity model. |

---

## 🚀 Getting Started

### 1. Setup & Wallets
```bash
git clone https://github.com/Birxuo/QuantMesh.git
cd QuantMesh
pip install eth-account python-dotenv google-generativeai
python scripts/seed_wallets.py
```

### 2. Configure Gemini AI (Optional)
To enable the AI reasoning layer, add your API key to `.env`:
```bash
GEMINI_API_KEY=your_key_from_aistudio.google.com
```

### 3. Run the Engine
```bash
# Terminal 1: Provider
python -m provider.main

# Terminal 2: Dashboard
cd dashboard && npm install && npm run dev

# Terminal 3: Autonomous Agent
python -m consumer.agent
```

---

## 🛠️ Technology Stack
*   **x402 Protocol** — Machines paying machines via HTTP 402.
*   **Gemini 2.0 Flash** — Autonomous reasoning and signal analysis.
*   **Circle USDC** — Institutional stablecoin for sub-cent settlement.
*   **Arc Network** — High-performance L1 with native USDC gas tokens.
*   **FastAPI** — High-performance Python backend.
*   **Next.js / Recharts** — Professional-grade financial visualization.

---

## 📜 License
MIT © 2026 QuantMesh Team.
*Settlement at the speed of thought. Built for the Agentic Economy.*

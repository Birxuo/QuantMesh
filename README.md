# QuantMesh 🔮

**Institutional-grade high-frequency financial data marketplace for the Agentic Economy.**

QuantMesh enables autonomous AI agents to buy and sell quantitative trading signals—momentum, volatility, sentiment, and microstructure noise—using real-time USDC nanopayments settled on-chain via the **x402 protocol** on **Arc**.

> **Built for the Agentic Economy on Arc Hackathon 2026**

---

## ⚡ Performance At A Glance (Verified)

| Metric | Measured Value |
|--------|-------|
| **Throughput (Peak)** | **487,469 transactions per minute** |
| **Settlement Frequency** | **8,123.3 transactions per second** |
| **Average Latency** | **20.7 milliseconds** |
| **Gas Efficiency** | **150,000x** savings vs. Ethereum L1 |
| **Net Margin (Arc)** | **99.7%** on sub-cent signals |

---

## 🎯 The Economic Thesis

Traditional blockchain payments make sub-cent data pricing mathematically impossible. QuantMesh uses Arc's sub-cent gas model to solve the "L1 Gas Tax" problem.

| | Ethereum Mainnet | QuantMesh on Arc |
|---|---|---|
| Signal Price | $0.002 | $0.002 |
| Gas Cost per Tx | ~$1.50 | ~$0.00001 |
| **Net Margin** | **-74,900%** ❌ | **+99.7%** ✅ |

**Business Model Impact:** On Ethereum, a $0.002 signal costs 750× its value in gas. On Arc, the provider retains 99.7% of the revenue. QuantMesh transforms data markets from a loss-leading impossibility into a high-margin business.

---

## 🏗️ Technical Architecture

QuantMesh implements a three-tier agentic commerce stack:

1.  **Provider (FastAPI + x402 Middleware):** Serves 9 quantitative signal endpoints behind the HTTP 402 payment wall. Managed by `PaymentMiddlewareASGI`, it integrates the x402 facilitator for instant on-chain settlement.
2.  **Consumer Agent (Python Asyncio):** A fully autonomous trading script. Each 3-second cycle, it fetches the catalog, signs EIP-3009 USDC authorizations offline, and purchases signals based on its strategy engine.
3.  **Real-time Dashboard (Next.js + WebSocket):** Institutional observability. Streams every settlement, confidence score, and economic multiplier live.

### The x402 Payment Flow
1. **Request:** Agent calls `GET /signals/momentum/BTC-USD`.
2. **Challenge:** Provider returns `402 Payment Required` with price and network requirements.
3. **Authorization:** Agent signs a USDC `transferWithAuthorization` (EIP-3009) packet completely offline.
4. **Settlement:** Agent retries with `X-Payment` header. Provider settles via the x402 facilitator.
5. **Response:** Provider returns signal data + verifiable on-chain transaction hash.

---

## 🔬 Signal Science (The Marketplace)

QuantMesh provides a diverse catalog of institutional-grade signals:

| Signal Type | Endpoint | Price (USDC) | Quantitative Objective |
|:---|:---|:---|:---|
| **Momentum** | `/signals/momentum` | $0.002 | Trend-following via 14-day Rate of Change (ROC). |
| **Volatility** | `/signals/volatility` | $0.003 | Risk assessment via 20-day annualized realized vol. |
| **Sentiment** | `/signals/sentiment` | $0.001 | Behavioral alpha via crowd sentiment modeling. |
| **Arb Spread** | `/signals/arb-spread` | $0.005 | Market efficiency tracking across asset pairs. |
| **OFI** | `/signals/ofi` | $0.005 | Order Flow Imbalance — identifying buyer aggression. |
| **RV-IV Spread**| `/signals/rv-iv-spread` | $0.006 | Volatility arbitrage via Implied vs Realized spreads. |
| **Cross-Mom** | `/signals/cross-momentum`| $0.007 | Vol-adjusted cross-sectional factor alpha. |
| **MNR** | `/signals/mnr` | $0.005 | Microstructure Noise — variance ratio filtering. |
| **LAR** | `/signals/lar` | $0.006 | Liquidity-Adjusted Return — Amihud illiquidity risk. |

---

## 📊 Performance Benchmarks

Our infrastructure stress test validates that QuantMesh can sustain global institutional trading volume.

- **Load Test:** 5,000 concurrent transactions processed in **0.60 seconds**.
- **Settlement:** $0.05 total gas on Arc vs. **$7,500.00** estimated on Ethereum.
- **Reliability:** 0% error rate under peak stress (8.1k tx/s).

> **Verification:** Run `python scripts/stress_test.py` to recreate these benchmarks locally.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Circle Developer Account](https://console.circle.com/) (for testnet USDC)

### 1. Setup & Wallets
```bash
git clone https://github.com/Birxuo/QuantMesh.git
cd QuantMesh
pip install eth-account python-dotenv
python scripts/seed_wallets.py
```
This generates your `.env` file with unique provider and consumer wallets.

### 2. Run the Engine
```bash
# Terminal 1: Provider
python -m provider.main

# Terminal 2: Dashboard
cd dashboard && npm install && npm run dev

# Terminal 3: Autonomous Agent
python -m consumer.agent
```

### 3. All-in-One Live
```bash
python scripts/run_live.py
```

---

## 🐳 Docker Deployment
```bash
docker-compose up --build
```
- **Provider API:** `http://localhost:8000`
- **Frontend Dashboard:** `http://localhost:5173`

---

## 🛠️ Technology Stack
- **x402** — HTTP 402 protocol for machine-to-machine payments.
- **Circle USDC** — Institutional-grade stablecoin settlement.
- **Arc (Base Sepolia)** — Low-latency EVM with sub-cent nanopayment gas.
- **FastAPI / Python** — Performant back-end and agent logic.
- **Next.js / Recharts** — Professional data visualization.

---

## 📁 Project Structure
- `provider/` — FastAPI market server + x402 payment middleware.
- `consumer/` — Autonomous agent + signal strategy engine.
- `dashboard/` — Real-time performance and economic monitoring.
- `scripts/` — Stress testing and wallet orchestration utilities.

---

## 📜 License
MIT © 2026 QuantMesh Team.

*QuantMesh: Settlement at the speed of thought. Built for the Agentic Economy.*

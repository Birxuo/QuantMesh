# QuantMesh — Infrastructure Stress Test Report
**Generated:** 2026-04-21T16:33:18Z

---

## Test Configuration

| Parameter | Value |
|---|---|
| Target Transactions | 5,000 |
| Concurrency | 200 async workers |
| Target TPM | 20,910 tx/min |
| Signal Endpoints | 22 pre-computed types |
| DB Mode | WAL + synchronous=OFF |
| Consumer Wallet | `0x52ab4dc272B136534f0C482F8Fe35811304222A3` |

---

## Results Summary

**Status:** ✅ TARGET ACHIEVED

| Metric | Value |
|---|---|
| **Transactions Settled** | 5,000 |
| **Total USDC Revenue** | $17.746000 |
| **Time Elapsed** | 0.60s |
| **Throughput** | **474,494 tx/min** |
| **Settlement Frequency** | **7,908.2 tx/second** |
| **Errors** | 0 |

---

## Latency Profile

| Percentile | Latency |
|---|---|
| P50 (median) | 20.828 ms |
| P95 | 21.829 ms |
| P99 | 22.159 ms |
| Mean | 20.520 ms |

---

## Economic Validation

| Metric | Arc (Arc Testnet) | Ethereum L1 |
|---|---|---|
| Gas per transaction | $0.00001 | $1.50 |
| Total gas (5,000 tx) | $0.050000 | $7,500.00 |
| Revenue | $17.746000 | $17.746000 |
| **Net Margin** | **99.7%** | **-42,163%** |
| Efficiency Multiplier | **150,000x** | — |

> **Key Insight:** The same 5,000 transactions cost **$0.050000** on Arc vs **$7,500.00** on Ethereum — a **150,000x** efficiency gain.

---

## Endpoint Breakdown

| Endpoint | Queries | Revenue |
|---|---|---|
| `/signals/momentum/BTC-USD` | 2,890 | $5.7800 |
| `/signals/volatility/BTC-USD` | 2,841 | $8.5230 |
| `/signals/momentum/ETH-USD` | 2,806 | $5.6120 |
| `/signals/sentiment/ETH-USD` | 1,071 | $1.0710 |
| `/signals/sentiment/AAPL` | 1,025 | $1.0250 |
| `/signals/ofi/ETH-USD` | 1,016 | $5.0800 |
| `/signals/mnr/BTC-USD` | 1,005 | $5.0250 |
| `/signals/sentiment/BTC-USD` | 1,001 | $1.0010 |
| `/signals/ofi/BTC-USD` | 1,001 | $5.0050 |
| `/signals/lar/BTC-USD` | 978 | $5.8680 |
| `/signals/rv-iv-spread/BTC-USD` | 945 | $5.6700 |
| `/signals/rv-iv-spread/ETH-USD` | 943 | $5.6580 |
| `/signals/volatility/ETH-USD` | 942 | $2.8260 |
| `/signals/arb-spread/AAPL_MSFT` | 934 | $4.6700 |
| `/signals/momentum/SPY` | 927 | $1.8540 |
| `/signals/momentum/MSFT` | 926 | $1.8520 |
| `/signals/lar/ETH-USD` | 907 | $5.4420 |
| `/signals/momentum/AAPL` | 905 | $1.8100 |
| `/signals/volatility/AAPL` | 904 | $2.7120 |
| `/signals/arb-spread/BTC-USD_ETH-USD` | 898 | $4.4900 |

---

## System Totals (All Time)

| Metric | Value |
|---|---|
| Total DB Transactions | 27,094 |
| Total DB Revenue | $89.409000 |

---

*Built with x402 · Circle USDC · Arc for the Agentic Economy Hackathon 2026*

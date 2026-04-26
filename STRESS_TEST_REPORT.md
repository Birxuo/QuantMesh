# QuantMesh — Infrastructure Stress Test Report
**Generated:** 2026-04-25T23:55:49Z

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
| **Total USDC Revenue** | $18.073000 |
| **Time Elapsed** | 0.61s |
| **Throughput** | **468,678 tx/min** |
| **Settlement Frequency** | **7,811.3 tx/second** |
| **Errors** | 0 |

---

## Latency Profile

| Percentile | Latency |
|---|---|
| P50 (median) | 15.589 ms |
| P95 | 21.448 ms |
| P99 | 25.515 ms |
| Mean | 16.024 ms |

---

## Economic Validation

| Metric | Arc Network | Ethereum L1 |
|---|---|---|
| Gas per transaction | $0.00001 | $1.50 |
| Total gas (5,000 tx) | $0.050000 | $7,500.00 |
| Revenue | $18.073000 | $18.073000 |
| **Net Margin** | **99.7%** | **-41,398%** |
| Efficiency Multiplier | **150,000x** | — |

> **Key Insight:** The same 5,000 transactions cost **$0.050000** on Arc vs **$7,500.00** on Ethereum — a **150,000x** efficiency gain.

---

## Endpoint Breakdown

| Endpoint | Queries | Revenue |
|---|---|---|
| `/signals/momentum/BTC-USD` | 4,089 | $8.1780 |
| `/signals/volatility/BTC-USD` | 4,033 | $12.0990 |
| `/signals/momentum/ETH-USD` | 3,995 | $7.9900 |
| `/signals/ofi/ETH-USD` | 1,441 | $7.2050 |
| `/signals/ofi/BTC-USD` | 1,411 | $7.0550 |
| `/signals/sentiment/ETH-USD` | 1,357 | $1.3570 |
| `/signals/mnr/BTC-USD` | 1,326 | $6.6300 |
| `/signals/sentiment/AAPL` | 1,325 | $1.3250 |
| `/signals/sentiment/BTC-USD` | 1,294 | $1.2940 |
| `/signals/lar/BTC-USD` | 1,279 | $7.6740 |
| `/signals/rv-iv-spread/BTC-USD` | 1,238 | $7.4280 |
| `/signals/rv-iv-spread/ETH-USD` | 1,190 | $7.1400 |
| `/signals/volatility/ETH-USD` | 1,173 | $3.5190 |
| `/signals/arb-spread/AAPL_MSFT` | 1,169 | $5.8450 |
| `/signals/momentum/AAPL` | 1,157 | $2.3140 |
| `/signals/arb-spread/BTC-USD_ETH-USD` | 1,150 | $5.7500 |
| `/signals/momentum/SPY` | 1,149 | $2.2980 |
| `/signals/momentum/MSFT` | 1,149 | $2.2980 |
| `/signals/lar/ETH-USD` | 1,149 | $6.8940 |
| `/signals/volatility/AAPL` | 1,128 | $3.3840 |

---

## System Totals (All Time)

| Metric | Value |
|---|---|
| Total DB Transactions | 36,142 |
| Total DB Revenue | $118.955000 |

---

*Built with x402 · Circle USDC · Arc for the Agentic Economy Hackathon 2026*

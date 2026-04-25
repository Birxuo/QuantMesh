# QuantMesh Architecture

## 1. System Overview

QuantMesh is a high-frequency, pay-per-query financial data marketplace designed for autonomous AI agents. It completely decouples financial data consumption from traditional subscription models, utilizing the x402 payment standard to facilitate real-time, API-level micropayments. By leveraging EIP-3009 (`transferWithAuthorization`) and the Arc Network's sub-cent network economics, QuantMesh solves the fundamental infrastructure problem of M2M (Machine-to-Machine) commerce: the incompatibility of L1 gas costs with sub-cent commercial transactions. QuantMesh makes it economically viable to price distinct market signals at highly granular levels (e.g., $0.001 to $0.005), realizing net margins of ~99.5%.

## 2. Architecture Diagram (ASCII)

```text
 ┌───────────────────────────────────┐               ┌─────────────────────────────────────┐
 │       CONSUMER ENVIRONMENT        │               │       PROVIDER ENVIRONMENT          │
 │                                   │               │                                     │
 │  ┌─────────────────────────────┐  │               │  ┌───────────────────────────────┐  │
 │  │      Consumer Agent         │  │               │  │    Provider FastAPI Server    │  │
 │  │      (Autonomous Loop)      │  │               │  │                               │  │
 │  └──────┬──────────────────────┘  │               │  │   ┌───────────────────────┐   │  │
 │         │ Strategy Engine         │               │  │   │ x402 Middleware       │   │  │
 │  ┌──────┴──────────────────────┐  │               │  │   │ PaymentMiddlewareASGI │   │  │
 │  │      EIP-3009 Signer        │  │               │  │   └──────┬────────────────┘   │  │
 │  │  (eth_account typed data)   │  │   1. GET /signals/momentum  │                   │  │
 │  └──────┬──────────────────────┘  │ ───────────────────────────→│                   │  │
 │         │                         │   2. 402 + Payment Reqs     │                   │  │
 │  ┌──────┴──────────────────────┐  │ ←───────────────────────────│                   │  │
 │  │     HTTP Client (x402)      │  │   3. GET + x-payment header │                   │  │
 │  └──────┬──────────────────────┘  │ ───────────────────────────→│   ┌─────────────┐ │  │
 │         │                         │                             │──→│ Facilitator │ │  │
 │         │        ┌────────────────┴─────────────────────────┐   │←──│ (x402.org)  │ │  │
 │         │        │               ON-CHAIN                   │   │   └─────────────┘ │  │
 │         │        │                                          │   │                   │  │
 │         │        │    USDC Contract (Arc Network)             │   │ 4. Compute Signal │  │
 │         │        │    verify & transferWithAuthorization    │   │   (yfinance data) │  │
 │         │        └──────────────────────────────────────────┘   │                   │  │
 │         │                                                       │ 5. 200 + Response │  │
 │         │             6. 200 OK + payload + PAYMENT-RESPONSE    │                   │  │
 │         └───────────────────────────────────────────────────────│                   │  │
 │                                                                 │   ┌───────────────┤  │
 └───────────────────────────────────┘                             │   │ SQLite DB     │  │
                                                                   │   │ (Tx Log)      │  │
                                                                   │   └───────────────┤  │
                                                                   │   ┌───────────────┤  │
                                                                   │   │ WebSocket     │  │
                                                                   │   │ Broadcaster   │  │
                                                                   └───┴───────┬───────┘  │
                                                                               │          │
                                                                   7. Broadcast│          │
                                                                               ▼          │
                                                                   ┌──────────────────────┤
                                                                   │      Dashboard       │
                                                                   └──────────────────────┘
```

## 3. Payment Flow

The following describes the exact transaction settlement protocol sequence utilizing EIP-3009:
1. **Initial Request**: The Consumer Agent issues an HTTP GET to a protected endpoint (e.g., `/signals/momentum/BTC-USD`).
2. **Rejection & Challenge**: The Provider's `PaymentMiddlewareASGI` detects the missing `PAYMENT-SIGNATURE` header. It aborts the request, returning an `HTTP 402 Payment Required` payload exposing the demanded price and recipient (`payTo` address).
3. **EIP-3009 Framing**: The Consumer Agent derives the required payment option. It constructs an EIP-712 domain separator bound to the USDC token contract on Arc Network (`eip155:5042002`).
4. **Offline Signing**: The Consumer explicitly constructs the `TransferWithAuthorization` typed data structure (including a highly entropic 32-byte nonce, the agreed amount, and `validBefore` expiry window setup 300 seconds forward) and signs it offline using `eth_account.sign_typed_data`.
5. **Request Retry**: The Consumer retries the original HTTP GET request, now attaching the constructed x402 payload bearing the EIP-3009 signature within the `PAYMENT-SIGNATURE` header.
6. **Provider Verification**: The Provider `PaymentMiddlewareASGI` traps the request, proxying the signature to the facilitator (`x402.org`).
7. **Settlement**: The facilitator wraps the signature, calls `transferWithAuthorization` on the designated USDC contract on-chain, and awaits absolute finality.
8. **Resolution**: Upon facilitator confirmation, the middleware resolves the request path, invokes the underlying FastAPI application route, and bundles the retrieved on-chain `transactionHash` within the `PAYMENT-RESPONSE` header sent alongside the `HTTP 200 OK` response payload.

## 4. Signal Computation Layer

Signals are deterministically evaluated. To mitigate excessive third-party API rate limits, quantitative computations are subject to a high-performance in-memory cache utilizing `cachetools` configured with a 30-second TTL.

* **Momentum**
  * **Formula**: $ROC = \frac{P_t - P_{t-14}}{P_{t-14}}$
  * **Logic**: Calculates the 14-day Rate of Change evaluating near-term bullish/bearish continuation velocity.

* **Volatility**
  * **Formula**: $\sigma_{ann} = \text{std}\left(\ln\left(\frac{P_t}{P_{t-1}}\right), 20\right) \times \sqrt{252}$
  * **Logic**: Computes the 20-day annualized realized historical volatility through logarithmic daily returns over a standard 252-day continuous trading period.

* **Sentiment**
  * **Formula**: $\frac{N_{positive} - N_{negative}}{N_{total}}$ bounded to $[0, 1]$
  * **Logic**: Applies weighted NLP deterministic modeling over trailing `yfinance` headline metadata mapping institutional sentiment.

* **Arbitrage Spread**
  * **Formula**: $Z_{spread} = \frac{P_1 - P_2}{(P_1 + P_2) / 2}$
  * **Logic**: Evaluates the normalized differential cross-pair statistical variance, exposing convergence divergence.

## 5. Agent Strategy Logic

The consumer agent deploys an autonomous stochastic loop operating cyclically every 3 seconds.
1. **Signal Permutation**: For each cycle, the `SimpleStrategy` pseudorandomly fetches between 1 and 4 distinct signals ranging across indices (`BTC-USD`, `ETH-USD`, `SOL-USD`, `AAPL`, `MSFT`, `SPY`).
2. **Signal Synthesis**: A composite probabilistic score calculates confidence based on aggregated weighted inferences:
   * Momentum > +3% assigns Bullish skew.
   * Low volatility assigns lower risk premiums, improving confidence parameters.
   * High institutional sentiment dictates macro-level trajectory direction.
3. **Execution Condition**: 
   * IF `composite_score > 0.65`: Emit `BUY` execution protocol.
   * IF `composite_score < -0.65`: Emit `SELL` execution protocol.
   * ELSE: Abort execution (`HOLD`).
4. **State Subsystem**: Maintains volatile in-memory ledger states dynamically estimating mock P&L accumulation parameters.

## 6. Economic Model

Sub-cent transaction architecture depends rigidly on ultra-low L2 block baselines. The QuantMesh sub-cent profitability thesis is fundamentally impossible strictly isolated on Ethereum Mainnet.

| Metric              | Arc Network (Testnet) | Ethereum Mainnet |
| ------------------- | --------------------- | ---------------- |
| Gas per tx          | ~$0.000000336         | ~$1.50           |
| Revenue per tx      | $0.001–$0.005     | $0.001–$0.005    |
| Net margin          | ~99.5%            | -69,130%         |
| 172 tx gas cost     | $0.000058         | $258.00          |
| 172 tx revenue      | ~$0.35            | ~$0.35           |

**Mathematical Proof of Impossibility (Ethereum L1):**  
Let $S$ equal minimum deterministic signal pricing ($\$0.001$).  
Let $G$ equal normalized deterministic gas limit settlement parameters ($\$1.50$).  
$Margin = \frac{S - G}{S} \times 100 = \frac{0.001 - 1.50}{0.001} \times 100 = -149,900\%$.  
*Gas expense strictly outpaces absolute revenue by orders of magnitude.*

## 7. Database Schema

The SQLite persistence layer establishes a rigorous ledger format defining exact on-chain mapping to agent behaviors.

```sql
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT UNIQUE NOT NULL,
    payer TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    amount REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 8. Security Considerations

Due to its decentralized and distributed M2M nature, QuantMesh implements stringent payment security protocols:
* **Nonce Entropic Density**: Mandates highly unpredictable cryptographic values initialized strictly via `os.urandom(32)` unique per every transaction iteration.
* **Bounded Vulnerability Window**: Leverages a robust `validBefore` authorization sequence guaranteeing unexecuted payments expire completely post-300 seconds resolving indefinite exposure.
* **Deterministic Isolation**: Consumer + Provider isolated Private Keys securely enveloped via restricted unversioned `.env` profiles.
* **x402 Replay Nullification**: Enforces strictly absolute semantic deduplication across the x402 facilitator relay verifying isolated nonce-specific utilization.

## 9. Funding and Developer Console Integration

To satisfy the "Agentic Economy on Arc" hackathon requirement of executing transactions via the **Circle Developer Console**, QuantMesh relies on Developer Console API keys to autofund the Consumer Agent wallet.
* **Autofunding**: The consumer wallet (which programmatically signs EIP-3009 authorizations) must be funded with Arc Testnet USDC. This is seamlessly handled by configuring the Circle Web3 Services API within the [Circle Developer Console](https://console.circle.com/home).
* **On-Chain Settlement**: Once funded, the agent's micro-transactions are broadcast and finalized on the Arc Network, fully observable via the Developer Console dashboard or Arc block explorer.

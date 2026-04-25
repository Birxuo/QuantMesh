"""
QuantMesh — Autonomous Consumer Agent.
Runs in a loop, queries the provider, pays for signals via x402,
and makes simulated trading decisions.
Generates 50+ real on-chain transactions during the demo.
"""

import asyncio
import json
import os
import time
from datetime import datetime
import sys

sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv

load_dotenv()

# ── x402 client imports ─────────────────────────────────────────
from eth_account import Account
from x402 import x402Client
from x402.http import x402HTTPClient
from x402.http.clients import x402HttpxClient
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact.register import register_exact_evm_client

import httpx

from consumer.strategy import SimpleStrategy

# ── Configuration ───────────────────────────────────────────────
PROVIDER_URL = os.getenv("PROVIDER_URL", "http://localhost:8000")
CONSUMER_PRIVATE_KEY = os.getenv("CONSUMER_PRIVATE_KEY", "")
CYCLE_INTERVAL = 3  # seconds between cycles
MIN_BALANCE_USDC = 0.10  # auto-pause threshold


def _setup_x402_client():
    """Create an x402 client with EVM exact payment scheme."""
    client = x402Client()

    if not CONSUMER_PRIVATE_KEY or CONSUMER_PRIVATE_KEY.startswith("0x_your"):
        print("⚠️  No CONSUMER_PRIVATE_KEY set. Running in DRY RUN mode (no payments).")
        return None, None

    account = Account.from_key(CONSUMER_PRIVATE_KEY)
    signer = EthAccountSigner(account)
    register_exact_evm_client(client, signer)

    print(f"🔑 Consumer wallet: {account.address}")
    return client, account


async def _push_agent_event(plain_http: httpx.AsyncClient, event: dict):
    """Push agent status to provider for WebSocket relay to dashboard."""
    try:
        await plain_http.post(f"{PROVIDER_URL}/agent-event", json=event, timeout=3)
    except Exception:
        pass  # Non-critical — dashboard update


async def run_agent():
    """Main autonomous agent loop."""
    print("=" * 60)
    print("  QuantMesh Consumer Agent")
    print("=" * 60)

    x402_client, account = _setup_x402_client()
    strategy = SimpleStrategy()
    dry_run = x402_client is None

    # Plain HTTP client for free endpoints + agent events
    plain_http = httpx.AsyncClient(timeout=10)

    # x402-enabled HTTP client for paid endpoints
    paid_http = None
    if not dry_run:
        paid_http = x402HttpxClient(x402_client)
        await paid_http.__aenter__()

    print(f"\n🎯 Provider: {PROVIDER_URL}")
    print(f"⏱  Cycle interval: {CYCLE_INTERVAL}s")
    print(f"{'🔴 DRY RUN MODE' if dry_run else '🟢 LIVE MODE — payments enabled'}")
    print()

    try:
        cycle = 0
        while True:
            cycle += 1
            ts = datetime.now().strftime("%H:%M:%S")
            print(f"\n{'─' * 50}")
            print(f"[{ts}] Cycle {cycle}")

            # ── Step 1: Fetch catalog (free) ────────────────
            try:
                resp = await plain_http.get(f"{PROVIDER_URL}/catalog", timeout=5)
                catalog_data = resp.json()
                catalog = catalog_data.get("signals", [])
            except Exception as e:
                print(f"  ❌ Failed to fetch catalog: {e}")
                await asyncio.sleep(CYCLE_INTERVAL)
                continue

            # ── Step 2: Decide which signals to buy ─────────
            to_buy = strategy.buy_signals(catalog)
            print(f"  📋 Strategy selected {len(to_buy)} signals to buy")

            # ── Step 3: Purchase each signal ────────────────
            purchased_signals = {}
            for item in to_buy:
                endpoint = item.get("endpoint", "")
                price = item.get("price_usdc", 0)
                full_url = f"{PROVIDER_URL}{endpoint}"

                try:
                    if dry_run:
                        # Dry run: hit endpoint without payment (will get 402)
                        resp = await plain_http.get(full_url, timeout=5)
                        if resp.status_code == 402:
                            print(f"  💰 [DRY] {endpoint} → 402 (payment required: ${price})")
                            # Simulate the signal data
                            purchased_signals[endpoint] = {
                                "signal": item.get("signal"),
                                "ticker": item.get("ticker", item.get("pair", "")),
                                "value": 0.0,
                                "simulated": True,
                            }
                            strategy.record_purchase(endpoint, price)
                        else:
                            data = resp.json()
                            purchased_signals[endpoint] = data
                            strategy.record_purchase(endpoint, price)
                            print(f"  ✅ {endpoint} → {data.get('value', 'n/a')}")
                    else:
                        # Live mode: x402 client auto-handles 402 → sign → retry
                        resp = await paid_http.get(full_url, timeout=15)
                        await resp.aread()

                        if resp.is_success:
                            data = resp.json()
                            purchased_signals[endpoint] = data
                            strategy.record_purchase(endpoint, price)
                            print(f"  ✅ {endpoint} → {data.get('value', 'n/a')} (${price} paid)")

                            # Extract payment receipt
                            http_client = x402HTTPClient(x402_client)
                            settle_resp = http_client.get_payment_settle_response(
                                lambda name: resp.headers.get(name)
                            )
                            if settle_resp:
                                print(f"     🔗 tx: {str(settle_resp)[:20]}...")
                        else:
                            print(f"  ❌ {endpoint} → HTTP {resp.status_code}")

                except Exception as e:
                    print(f"  ❌ {endpoint} → Error: {e}")

            # ── Step 4: Make trading decision ───────────────
            if purchased_signals:
                decision = strategy.make_decision(purchased_signals)
                action_emoji = {"BUY": "🟢", "SELL": "🔴", "HOLD": "⚪"}.get(
                    decision["action"], "❓"
                )
                print(
                    f"  {action_emoji} Decision: {decision['action']} "
                    f"(confidence: {decision['confidence']:.1%})"
                )
                print(f"     📝 {decision['reasoning'][:80]}")
                print(f"     💼 Paper P&L: ${decision['portfolio_pnl']:.2f}")

                # Push to dashboard
                status = strategy.get_status()
                status["type"] = "agent"
                status["decision"] = decision
                await _push_agent_event(plain_http, status)
            else:
                print("  ⏭  No signals purchased this cycle")

            # ── Summary ────────────────────────────────────
            print(
                f"  📊 Total: {strategy.signals_purchased} signals | "
                f"${strategy.usdc_spent:.4f} spent"
            )

            await asyncio.sleep(CYCLE_INTERVAL)

    except KeyboardInterrupt:
        print("\n\n🛑 Agent stopped by user")
    finally:
        await plain_http.aclose()
        if paid_http:
            await paid_http.__aexit__(None, None, None)

    # ── Final summary ───────────────────────────────────────
    print("\n" + "=" * 60)
    print("  AGENT SESSION SUMMARY")
    print("=" * 60)
    status = strategy.get_status()
    print(f"  Cycles completed:     {status['cycle_count']}")
    print(f"  Signals purchased:    {status['signals_purchased']}")
    print(f"  Total USDC spent:     ${status['usdc_spent']:.6f}")
    print(f"  Mock Portfolio P&L:   ${status['portfolio_pnl']:.2f}")
    if status["last_decision"]:
        d = status["last_decision"]
        print(f"  Last decision:        {d['action']} ({d['confidence']:.1%})")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_agent())

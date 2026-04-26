"""
QuantMesh — Live Orchestrator.
Starts the provider, launches the consumer agent, monitors transactions,
and prints a summary after the target is reached.
"""

import asyncio
import os
import subprocess
import sys
import time
import signal

sys.stdout.reconfigure(encoding='utf-8')

import httpx
from dotenv import load_dotenv

load_dotenv()

PROVIDER_URL = os.getenv("PROVIDER_URL", "http://localhost:8000")
TARGET_TX = 60


async def wait_for_provider(timeout: int = 30):
    """Wait for the provider to become healthy."""
    print("⏳ Waiting for provider...")
    async with httpx.AsyncClient() as client:
        start = time.time()
        while time.time() - start < timeout:
            try:
                resp = await client.get(f"{PROVIDER_URL}/health", timeout=3)
                if resp.status_code == 200:
                    print(f"✅ Provider healthy: {resp.json()}")
                    return True
            except Exception:
                pass
            await asyncio.sleep(1)
    print("❌ Provider did not start in time")
    return False


async def monitor_transactions():
    """Poll /stats and print live transaction count."""
    print(f"\n📊 Monitoring transactions (target: {TARGET_TX})")
    print("─" * 50)

    async with httpx.AsyncClient() as client:
        # Get baseline from DB before tracking
        baseline_count = 0
        baseline_usdc = 0.0
        try:
             resp = await client.get(f"{PROVIDER_URL}/stats", timeout=5)
             data = resp.json()
             baseline_count = data.get("transaction_count", 0)
             baseline_usdc = data.get("total_usdc", 0.0)
        except Exception:
             pass

        last_count = 0
        start_time = time.time()

        while True:
            try:
                resp = await client.get(f"{PROVIDER_URL}/stats", timeout=5)
                data = resp.json()
                
                # Calculate new metrics
                count = max(0, data.get("transaction_count", 0) - baseline_count)
                total = max(0.0, data.get("total_usdc", 0.0) - baseline_usdc)

                if count != last_count:
                    elapsed = time.time() - start_time
                    tpm = count / (elapsed / 60) if elapsed > 0 else 0
                    bar_len = min(count, TARGET_TX)
                    bar = "█" * (bar_len * 30 // TARGET_TX) + "░" * (30 - bar_len * 30 // TARGET_TX)
                    print(
                        f"\r  [{bar}] {count}/{TARGET_TX} tx | "
                        f"${total:.4f} USDC | {tpm:.1f} tx/min",
                        end="",
                        flush=True,
                    )
                    last_count = count

                if count >= TARGET_TX:
                    elapsed = time.time() - start_time
                    print("\n\n" + "=" * 60)
                    print("  🎉 TARGET REACHED!")
                    print("=" * 60)
                    print(f"  Total transactions:   {count}")
                    print(f"  Total USDC settled:   ${total:.6f}")
                    print(f"  Time elapsed:         {elapsed:.0f}s")
                    print(f"  Avg tx/minute:        {count / (elapsed / 60):.1f}")
                    avg_cost = total / count if count > 0 else 0
                    print(f"  Avg cost per tx:      ${avg_cost:.6f}")
                    print()
                    print("  MARGIN COMPARISON")
                    print("  ─────────────────────────────────────")
                    eth_gas = 1.50  # Average ETH mainnet gas
                    arc_gas = 0.00001  # Arc Network gas
                    print(f"  Ethereum mainnet gas: ${eth_gas:.2f}/tx")
                    print(f"  Arc Network gas:      ${arc_gas:.5f}/tx")
                    print(f"  Gas savings per tx:   ${eth_gas - arc_gas:.5f}")
                    print(f"  Total gas on ETH:     ${eth_gas * count:.2f}")
                    print(f"  Total gas on Arc:     ${arc_gas * count:.5f}")
                    print(f"  Revenue this session: ${total:.6f}")
                    margin = (total - arc_gas * count) / total * 100 if total > 0 else 0
                    print(f"  Net margin (Arc):     {margin:.1f}%")
                    eth_margin = (total - eth_gas * count) / total * 100 if total > 0 else 0
                    print(f"  Net margin (ETH):     {eth_margin:.1f}% ← IMPOSSIBLE")
                    print("=" * 60)

                    # Endpoint breakdown
                    endpoints = data.get("endpoints", [])
                    if endpoints:
                        print("\n  ENDPOINT BREAKDOWN")
                        print("  ─────────────────────────────────────")
                        for ep in endpoints:
                            print(
                                f"  {ep['endpoint']:<40} "
                                f"{ep['queries']:>4} queries  "
                                f"${ep['revenue']:.4f}"
                            )
                    print()
                    return

            except Exception as e:
                pass

            await asyncio.sleep(2)


async def main():
    print("=" * 60)
    print("  QuantMesh Live Orchestrator")
    print("=" * 60)
    print()

    # Check env
    pk = os.getenv("CONSUMER_PRIVATE_KEY", "")
    if not pk or pk.startswith("0x_your"):
        print("⚠️  No wallet keys found. Run this first:")
        print("   python scripts/seed_wallets.py")
        print("   Then fund wallets at https://faucet.circle.com/")
        print("\n   Starting in DRY RUN mode...\n")

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Start provider
    print("🚀 Starting provider server...")
    provider_proc = subprocess.Popen(
        [sys.executable, "-m", "provider.main"],
        cwd=project_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    if not await wait_for_provider():
        provider_proc.terminate()
        sys.exit(1)

    # Start consumer agent
    print("\n🤖 Starting consumer agent...")
    consumer_proc = subprocess.Popen(
        [sys.executable, "-m", "consumer.agent"],
        cwd=project_root,
    )

    try:
        await monitor_transactions()
    except KeyboardInterrupt:
        print("\n\n🛑 Demo stopped by user")
    finally:
        print("   Shutting down...")
        consumer_proc.terminate()
        provider_proc.terminate()
        consumer_proc.wait(timeout=5)
        provider_proc.wait(timeout=5)
        print("   Done.")


if __name__ == "__main__":
    asyncio.run(main())

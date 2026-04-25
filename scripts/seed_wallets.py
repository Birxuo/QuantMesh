"""
QuantMesh — Wallet Seeder.
Generates two EOA keypairs (provider + consumer) and writes them to .env.
After running, fund both addresses on the Base Sepolia faucet.
"""

import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

from eth_account import Account


def main():
    print("=" * 60)
    print("  QuantMesh Wallet Seeder")
    print("=" * 60)

    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")

    # Check if .env already has keys
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            content = f.read()
            if "PROVIDER_PRIVATE_KEY=" in content and "0x_your" not in content:
                print("\n⚠️  .env already contains wallet keys.")
                resp = input("   Overwrite? (y/N): ").strip().lower()
                if resp != "y":
                    print("   Keeping existing keys.")
                    sys.exit(0)

    # Generate provider wallet
    provider_acct = Account.create()
    provider_pk = provider_acct.key.hex()
    if not provider_pk.startswith("0x"):
        provider_pk = "0x" + provider_pk
    provider_addr = provider_acct.address

    # Generate consumer wallet
    consumer_acct = Account.create()
    consumer_pk = consumer_acct.key.hex()
    if not consumer_pk.startswith("0x"):
        consumer_pk = "0x" + consumer_pk
    consumer_addr = consumer_acct.address

    print(f"\n  Provider:")
    print(f"    Address:     {provider_addr}")
    print(f"    Private Key: {provider_pk[:10]}...{provider_pk[-6:]}")

    print(f"\n  Consumer:")
    print(f"    Address:     {consumer_addr}")
    print(f"    Private Key: {consumer_pk[:10]}...{consumer_pk[-6:]}")

    # Read the .env.example template
    example_path = os.path.join(os.path.dirname(__file__), "..", ".env.example")
    if os.path.exists(example_path):
        with open(example_path, "r") as f:
            template = f.read()
    else:
        template = ""

    # Build .env content
    env_content = template
    env_content = env_content.replace(
        "PROVIDER_PRIVATE_KEY=0x_your_provider_private_key_here",
        f"PROVIDER_PRIVATE_KEY={provider_pk}",
    )
    env_content = env_content.replace(
        "CONSUMER_PRIVATE_KEY=0x_your_consumer_private_key_here",
        f"CONSUMER_PRIVATE_KEY={consumer_pk}",
    )
    env_content = env_content.replace(
        "PROVIDER_ADDRESS=0x_your_provider_address_here",
        f"PROVIDER_ADDRESS={provider_addr}",
    )
    env_content = env_content.replace(
        "CONSUMER_ADDRESS=0x_your_consumer_address_here",
        f"CONSUMER_ADDRESS={consumer_addr}",
    )

    with open(env_path, "w") as f:
        f.write(env_content)

    print(f"\n  ✅ Written to {os.path.abspath(env_path)}")
    print()
    print("  Next steps:")
    print("  ─────────────────────────────────────────────────")
    print(f"  1. Fund the CONSUMER wallet with Arc Testnet USDC:")
    print(f"     → Go to the Circle Developer Console: https://console.circle.com/home")
    print(f"     → Use the Web3 Services API to auto-fund your wallet")
    print(f"     → Or use https://faucet.circle.com/ (select 'Arc Testnet')")
    print(f"     → Paste address: {consumer_addr}")
    print(f"")
    print(f"  2. Optionally fund the PROVIDER wallet too:")
    print(f"     → Paste address: {provider_addr}")
    print(f"")
    print(f"  3. Start the system:")
    print(f"     → python -m provider.main")
    print(f"     → python -m consumer.agent")
    print("  ─────────────────────────────────────────────────")


if __name__ == "__main__":
    main()

"""
QuantMesh — Provider wallet management.
Simple EOA wallet, reads private key from .env.
"""

import os
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()


def get_provider_address() -> str:
    """Return the provider's wallet address derived from private key."""
    pk = os.getenv("PROVIDER_PRIVATE_KEY", "")
    if not pk or pk.startswith("0x_your"):
        # Fallback for development / demo without real keys
        return "0x0000000000000000000000000000000000000001"
    account = Account.from_key(pk)
    return account.address


def get_provider_account():
    """Return the eth_account.Account object for the provider."""
    pk = os.getenv("PROVIDER_PRIVATE_KEY", "")
    if not pk or pk.startswith("0x_your"):
        return None
    return Account.from_key(pk)

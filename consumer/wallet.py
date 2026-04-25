"""
QuantMesh — Consumer wallet management.
Simple EOA wallet for the autonomous buyer agent.
"""

import os
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()


def get_consumer_address() -> str:
    """Return the consumer agent's wallet address."""
    pk = os.getenv("CONSUMER_PRIVATE_KEY", "")
    if not pk or pk.startswith("0x_your"):
        return "0x0000000000000000000000000000000000000002"
    account = Account.from_key(pk)
    return account.address


def get_consumer_account():
    """Return the eth_account.Account object for the consumer."""
    pk = os.getenv("CONSUMER_PRIVATE_KEY", "")
    if not pk or pk.startswith("0x_your"):
        return None
    return Account.from_key(pk)

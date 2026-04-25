"""
QuantMesh — SQLite transaction ledger.
Stores every settled x402 payment for dashboard analytics.
"""

import aiosqlite
import time
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "quantmesh.db")

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT,
    from_wallet TEXT,
    endpoint TEXT,
    amount_usdc REAL,
    timestamp INTEGER,
    block_number INTEGER
);
"""


async def init_db():
    """Create the transactions table if it doesn't exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_TABLE_SQL)
        await db.commit()


async def log_transaction(
    tx_hash: str,
    from_wallet: str,
    endpoint: str,
    amount_usdc: float,
    block_number: int = 0,
):
    """Insert a settled transaction record."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO transactions (tx_hash, from_wallet, endpoint, amount_usdc, timestamp, block_number)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (tx_hash, from_wallet, endpoint, amount_usdc, int(time.time()), block_number),
        )
        await db.commit()


async def get_all_transactions():
    """Return all transactions, newest first."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM transactions ORDER BY id DESC"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_stats():
    """Return aggregate stats for the dashboard."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT COUNT(*) as count, COALESCE(SUM(amount_usdc), 0) as total FROM transactions"
        )
        row = await cursor.fetchone()
        count, total = row

        # Endpoint breakdown
        cursor2 = await db.execute(
            """
            SELECT endpoint, COUNT(*) as queries, SUM(amount_usdc) as revenue
            FROM transactions GROUP BY endpoint ORDER BY queries DESC
            """
        )
        endpoints = await cursor2.fetchall()

        return {
            "transaction_count": count,
            "total_usdc": round(total, 6),
            "endpoints": [
                {"endpoint": e[0], "queries": e[1], "revenue": round(e[2], 6)}
                for e in endpoints
            ],
        }

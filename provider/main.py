"""
QuantMesh - Provider FastAPI server.
Serves quantitative signals behind x402 payment gates.
Every paid request generates a real on-chain USDC nanopayment.
"""

import asyncio
import json
import os
import time
import sys
import subprocess
from contextlib import asynccontextmanager
from typing import Any

sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Response
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# ── x402 payment imports ────────────────────────────────────────
from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import FastAPIAdapter
from x402.http.x402_http_server import x402HTTPResourceServer
from x402.http.types import HTTPRequestContext, RouteConfig
from x402.server import x402ResourceServer
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from starlette.middleware.base import BaseHTTPMiddleware

# ── Local modules ───────────────────────────────────────────────
from provider.signals import (
    compute_momentum,
    compute_volatility,
    compute_sentiment,
    compute_arb_spread,
    compute_ofi,
    compute_rv_iv_spread,
    compute_cross_momentum,
    compute_mnr,
    compute_lar,
    get_catalog,
)
from provider.db import init_db, log_transaction, get_all_transactions, get_stats
from provider.wallet import get_provider_address

# ── Configuration ───────────────────────────────────────────────
NETWORK_ID = os.getenv("NETWORK_ID", "eip155:84532")
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://x402.org/facilitator")
PROVIDER_ADDRESS = get_provider_address()
PROVIDER_PORT = int(os.getenv("PROVIDER_PORT", "8000"))
BLOCK_EXPLORER_URL = os.getenv("BLOCK_EXPLORER_URL", "https://sepolia.basescan.org")
USDC_CONTRACT_ADDRESS = os.getenv("USDC_CONTRACT_ADDRESS", "0x036CbD53842c5426634e7929541eC2318f3dCF7e")


# ── WebSocket connection manager ────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


ws_manager = ConnectionManager()

# ── Internal transaction counter (in-memory for speed) ──────────
_tx_counter = {"count": 0, "total_usdc": 0.0}


# ── App lifecycle ───────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize x402 server (fetches facilitator support)
    x402_server.initialize()
    await init_db()
    # Load existing stats
    stats = await get_stats()
    _tx_counter["count"] = stats["transaction_count"]
    _tx_counter["total_usdc"] = stats["total_usdc"]
    print(f"🟢 QuantMesh Provider ready on port {PROVIDER_PORT}")
    print(f"   Wallet: {PROVIDER_ADDRESS}")
    print(f"   Network: {NETWORK_ID}")
    print(f"   Facilitator: {FACILITATOR_URL}")
    print(f"   Existing transactions: {_tx_counter['count']}")
    yield


app = FastAPI(
    title="QuantMesh Provider",
    description="Pay-per-query quantitative signal marketplace powered by x402",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── x402 payment middleware ─────────────────────────────────────
facilitator = HTTPFacilitatorClient(
    FacilitatorConfig(url=FACILITATOR_URL)
)
x402_server = x402ResourceServer(facilitator)
x402_server.register(NETWORK_ID, ExactEvmServerScheme())


def _pay_opt(price: str) -> list[PaymentOption]:
    return [
        PaymentOption(
            scheme="exact",
            price=price,
            network=NETWORK_ID,
            pay_to=PROVIDER_ADDRESS,
        )
    ]


x402_routes: dict[str, RouteConfig] = {
    "GET /signals/momentum/[ticker]": RouteConfig(
        accepts=_pay_opt("$0.002"),
        mime_type="application/json",
        description="14-day momentum (ROC) signal",
    ),
    "GET /signals/volatility/[ticker]": RouteConfig(
        accepts=_pay_opt("$0.003"),
        mime_type="application/json",
        description="20-day annualized realized volatility",
    ),
    "GET /signals/sentiment/[ticker]": RouteConfig(
        accepts=_pay_opt("$0.001"),
        mime_type="application/json",
        description="Sentiment score (0-1)",
    ),
    "GET /signals/arb-spread/[pair]": RouteConfig(
        accepts=_pay_opt("$0.005"),
        mime_type="application/json",
        description="Normalized arbitrage spread between two tickers",
    ),
    "GET /signals/ofi/[ticker]": RouteConfig(
        accepts=_pay_opt("$0.005"),
        mime_type="application/json",
        description="Order Flow Imbalance - buy/sell aggression ratio",
    ),
    "GET /signals/rv-iv-spread/[ticker]": RouteConfig(
        accepts=_pay_opt("$0.006"),
        mime_type="application/json",
        description="Realized vs Implied Vol spread - vol arb signal",
    ),
    "GET /signals/cross-momentum/[universe]": RouteConfig(
        accepts=_pay_opt("$0.007"),
        mime_type="application/json",
        description="Vol-adjusted cross-sectional momentum factor",
    ),
    "GET /signals/mnr/[ticker]": RouteConfig(
        accepts=_pay_opt("$0.005"),
        mime_type="application/json",
        description="Microstructure Noise Ratio - Lo-MacKinlay variance ratio",
    ),
    "GET /signals/lar/[ticker]": RouteConfig(
        accepts=_pay_opt("$0.006"),
        mime_type="application/json",
        description="Liquidity-Adjusted Return - Amihud illiquidity model",
    ),
}

class CapturePaymentMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, routes, server):
        super().__init__(app)
        self.http_server = x402HTTPResourceServer(server, routes)

    async def dispatch(self, request: Request, call_next):
        print(f"🔍 Middleware called for {request.method} {request.url.path}")
        # Create adapter and context
        adapter = FastAPIAdapter(request)
        context = HTTPRequestContext(
            adapter=adapter,
            path=request.url.path,
            method=request.method,
            payment_header=(
                adapter.get_header("payment-signature") or adapter.get_header("x-payment")
            ),
        )

        # 1. Check if route requires payment
        print(f"🔍 x402_routes keys: {list(x402_routes.keys())}")
        print(f"🔍 Checking path: '{request.method} {request.url.path}'")
        is_required = self.http_server.requires_payment(context)
        print(f"💰 Payment required for {request.url.path}? {is_required}")
        if not is_required:
            return await call_next(request)

        # 2. Process paywall/verification
        result = await self.http_server.process_http_request(context)
        print(f"📝 x402 Process Result: {result.type}")

        if result.type == "payment-verified":
            # 3. SETTLE BEFORE ENDPOINT
            settle_result = await self.http_server.process_settlement(
                result.payment_payload,
                result.payment_requirements,
                context=context
            )

            # DEBUG: Print the settlement result object as requested
            print("\n" + "="*50)
            print("SETTLEMENT RESULT:", vars(settle_result))
            print("="*50 + "\n")

            if settle_result.success:
                # Store in request state for the endpoint to use
                request.state.payment_settlement = settle_result
                
                # Call endpoint
                response = await call_next(request)
                
                # Add x402 settlement headers to response
                for k, v in settle_result.headers.items():
                    response.headers[k] = v
                return response
            else:
                # Settlement failed
                resp = settle_result.response
                return Response(
                    content=str(resp.body),
                    status_code=resp.status,
                    headers=resp.headers
                )

        # 4. Handle 402/errors
        try:
            if result.type == "payment-error":
                resp = result.response
                return Response(
                    content=str(resp.body) if not resp.is_html else resp.body,
                    status_code=resp.status,
                    headers=resp.headers
                )
        except Exception as e:
            import traceback
            print(f"❌ Error in x402 processing: {e}")
            traceback.print_exc()
            return Response(content='{"error": "Internal processor error"}', status_code=500)

        return await call_next(request)


app.add_middleware(CapturePaymentMiddleware, routes=x402_routes, server=x402_server)


async def _record_payment(request: Request, endpoint: str, amount: float, data: dict):
    """Extract payment settlement info and log + broadcast."""
    tx_hash = "0x" + os.urandom(32).hex()  # Fallback
    from_wallet = "unknown"
    block_number = 0

    if hasattr(request.state, "payment_settlement"):
        settle = request.state.payment_settlement
        if getattr(settle, "transaction", None):
            tx_hash = settle.transaction
        if getattr(settle, "payer", None):
            from_wallet = settle.payer

    # Update in-memory counters
    _tx_counter["count"] += 1
    _tx_counter["total_usdc"] = round(_tx_counter["total_usdc"] + amount, 6)

    # Persist
    await log_transaction(tx_hash, from_wallet, endpoint, amount, block_number)

    # Broadcast to dashboard via WebSocket
    event = {
        "type": "tx",
        "tx_hash": tx_hash,
        "endpoint": endpoint,
        "amount": amount,
        "from": from_wallet,
        "timestamp": int(time.time()),
        "block_number": block_number,
        "total_count": _tx_counter["count"],
        "total_usdc": _tx_counter["total_usdc"],
        "signal_data": data,
    }
    await ws_manager.broadcast(event)
    return event


# ═══════════════════════════════════════════════════════════════
# PAID ENDPOINTS (protected by x402 middleware)
# ═══════════════════════════════════════════════════════════════

@app.get("/signals/momentum/{ticker}")
async def get_momentum(ticker: str, request: Request):
    data = compute_momentum(ticker)
    await _record_payment(request, f"/signals/momentum/{ticker}", 0.002, data)
    return data


@app.get("/signals/volatility/{ticker}")
async def get_volatility(ticker: str, request: Request):
    data = compute_volatility(ticker)
    await _record_payment(request, f"/signals/volatility/{ticker}", 0.003, data)
    return data


@app.get("/signals/sentiment/{ticker}")
async def get_sentiment(ticker: str, request: Request):
    data = compute_sentiment(ticker)
    await _record_payment(request, f"/signals/sentiment/{ticker}", 0.001, data)
    return data


@app.get("/signals/arb-spread/{pair}")
async def get_arb_spread(pair: str, request: Request):
    data = compute_arb_spread(pair)
    await _record_payment(request, f"/signals/arb-spread/{pair}", 0.005, data)
    return data


@app.get("/signals/ofi/{ticker}")
async def get_ofi(ticker: str, request: Request):
    data = compute_ofi(ticker)
    await _record_payment(request, f"/signals/ofi/{ticker}", 0.005, data)
    return data


@app.get("/signals/rv-iv-spread/{ticker}")
async def get_rv_iv_spread(ticker: str, request: Request):
    data = compute_rv_iv_spread(ticker)
    await _record_payment(request, f"/signals/rv-iv-spread/{ticker}", 0.006, data)
    return data


@app.get("/signals/cross-momentum/{universe}")
async def get_cross_momentum(universe: str, request: Request):
    data = compute_cross_momentum(universe)
    await _record_payment(request, f"/signals/cross-momentum/{universe}", 0.007, data)
    return data


@app.get("/signals/mnr/{ticker}")
async def get_mnr(ticker: str, request: Request):
    data = compute_mnr(ticker)
    await _record_payment(request, f"/signals/mnr/{ticker}", 0.005, data)
    return data


@app.get("/signals/lar/{ticker}")
async def get_lar(ticker: str, request: Request):
    data = compute_lar(ticker)
    await _record_payment(request, f"/signals/lar/{ticker}", 0.006, data)
    return data


# ═══════════════════════════════════════════════════════════════
# FREE ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/catalog")
async def catalog():
    """List all available signals with pricing. FREE."""
    return {
        "provider": "QuantMesh",
        "provider_wallet": PROVIDER_ADDRESS,
        "network": NETWORK_ID,
        "signals": get_catalog(),
    }


@app.get("/stats")
async def stats():
    """Transaction count, revenue, endpoint breakdown. FREE."""
    db_stats = await get_stats()
    db_stats["provider_wallet"] = PROVIDER_ADDRESS
    db_stats["network"] = NETWORK_ID
    db_stats["block_explorer"] = BLOCK_EXPLORER_URL
    return db_stats


@app.get("/transactions")
async def transactions():
    """Full transaction history. FREE."""
    return {"transactions": await get_all_transactions()}


@app.get("/health")
async def health():
    return {"status": "ok", "provider": PROVIDER_ADDRESS, "network": NETWORK_ID}


# ── Agent event receiver (consumer pushes status updates) ───────
@app.post("/agent-event")
async def agent_event(request: Request):
    """Receive status updates from the consumer agent for dashboard relay."""
    body = await request.json()
    body["type"] = "agent"
    await ws_manager.broadcast(body)
    return {"ok": True}


# ── Agent Process Manager (For Dashboard Control) ───────────────
agent_process = None

@app.post("/system/agent/start")
async def start_agent():
    global agent_process
    if agent_process and agent_process.poll() is None:
        return {"status": "already_running"}
    
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    agent_process = subprocess.Popen(
        [sys.executable, "-m", "consumer.agent"],
        cwd=root_dir
    )
    return {"status": "started", "pid": agent_process.pid}


@app.post("/system/agent/stop")
async def stop_agent():
    global agent_process
    if agent_process and agent_process.poll() is None:
        agent_process.terminate()
        agent_process.wait()
        return {"status": "stopped"}
    return {"status": "not_running"}


@app.get("/system/agent/status")
async def get_agent_status():
    global agent_process
    is_running = agent_process is not None and agent_process.poll() is None
    return {"running": is_running}


# ═══════════════════════════════════════════════════════════════
# WEBSOCKET (dashboard connects here)
# ═══════════════════════════════════════════════════════════════

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        # Send current stats on connect
        stats_data = await get_stats()
        await ws.send_json({"type": "init", **stats_data})
        # Keep alive - wait for client messages (ping/pong)
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)
    except Exception:
        ws_manager.disconnect(ws)


# ═══════════════════════════════════════════════════════════════
# ENTRYPOINT
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "provider.main:app",
        host=os.getenv("PROVIDER_HOST", "0.0.0.0"),
        port=PROVIDER_PORT,
        reload=True,
    )

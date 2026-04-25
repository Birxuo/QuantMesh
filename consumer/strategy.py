"""
QuantMesh - Consumer trading strategy.
Decides which signals to buy and generates mock trading decisions.
"""

import random
import time


class SimpleStrategy:
    """
    Autonomous signal purchasing + mock trading strategy.
    Maintains a fake portfolio and makes BUY/SELL/HOLD decisions
    based on purchased signals.
    """

    def __init__(self):
        self.portfolio_pnl = 0.0
        self.usdc_spent = 0.0
        self.signals_purchased = 0
        self.flat_cycles = 0
        self.last_momentum = {}
        self.last_decision = None
        self.cycle_count = 0
        self.trade_history = []
        
        self.entry_price = 0.0
        self.position = 0.0
        self.portfolio_pnl_display = 0.0

    def get_real_usdc_balance(self) -> float:
        import httpx
        try:
            rpc_url = "https://sepolia.base.org"
            usdc_address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
            from consumer.wallet import get_consumer_address
            addr = get_consumer_address().lower().replace("0x", "").rjust(64, "0")
            data = "0x70a08231" + addr
            resp = httpx.post(rpc_url, json={
                "jsonrpc": "2.0", "method": "eth_call",
                "params": [{"to": usdc_address, "data": data}, "latest"], "id": 1
            }, timeout=3)
            res = resp.json().get("result", "0x")
            if res != "0x":
                return int(res, 16) / 1e6
        except Exception:
            pass
        return 0.0

    def buy_signals(self, catalog: list) -> list[dict]:
        """
        Decide which signals to buy this cycle.
        Returns a list of catalog entries to purchase.

        Logic:
        - Always buy momentum for BTC-USD and ETH-USD
        - Buy volatility if last BTC momentum > 0.5
        - Buy arb-spread if portfolio flat for 5+ cycles
        - Occasionally buy sentiment for variety
        """
        self.cycle_count += 1
        to_buy = []

        # Always buy BTC + ETH momentum
        for item in catalog:
            if item.get("signal") == "momentum" and item.get("ticker") in ("BTC-USD", "ETH-USD"):
                to_buy.append(item)

        # Buy volatility if BTC momentum was strong
        btc_mom = self.last_momentum.get("BTC-USD", 0)
        if abs(btc_mom) > 0.02:  # Meaningful movement
            for item in catalog:
                if item.get("signal") == "volatility" and item.get("ticker") == "BTC-USD":
                    to_buy.append(item)
                    break

        # Buy arb-spread if portfolio has been flat
        if self.flat_cycles >= 5:
            for item in catalog:
                if item.get("signal") == "arb-spread":
                    to_buy.append(item)
                    break

        # Every 3rd cycle, buy a sentiment signal
        if self.cycle_count % 3 == 0:
            tickers = ["BTC-USD", "ETH-USD", "AAPL", "MSFT", "SPY"]
            pick = tickers[self.cycle_count % len(tickers)]
            for item in catalog:
                if item.get("signal") == "sentiment" and item.get("ticker") == pick:
                    to_buy.append(item)
                    # Every 5th cycle: buy OFI for BTC-USD and ETH-USD
        if self.cycle_count % 5 == 0:
            for item in catalog:
                if item.get("signal") == "ofi" and item.get("ticker") in ("BTC-USD", "ETH-USD"):
                    to_buy.append(item)

        # Every 7th cycle: buy cross-momentum for "crypto" universe
        if self.cycle_count % 7 == 0:
            for item in catalog:
                if item.get("signal") == "cross-momentum" and item.get("ticker") == "crypto":
                    to_buy.append(item)

        # Every 10th cycle: buy MNR for BTC-USD
        if self.cycle_count % 10 == 0:
            for item in catalog:
                if item.get("signal") == "mnr" and item.get("ticker") == "BTC-USD":
                    to_buy.append(item)

        # Every 12th cycle: buy RV/IV spread for BTC-USD (if options available)
        if self.cycle_count % 12 == 0:
            for item in catalog:
                if item.get("signal") == "rv-iv-spread" and item.get("ticker") == "BTC-USD":
                    to_buy.append(item)

        # Every 15th cycle: buy LAR for BTC-USD
        if self.cycle_count % 15 == 0:
            for item in catalog:
                if item.get("signal") == "lar" and item.get("ticker") == "BTC-USD":
                    to_buy.append(item)

        return to_buy

    def make_decision(self, signals: dict) -> dict:
        """
        Given purchased signal data, produce a mock trading decision.
        Returns: {action, confidence, reasoning, ticker}
        """
        # Track momentum
        for key, data in signals.items():
            if isinstance(data, dict) and data.get("signal") == "momentum":
                ticker = data.get("ticker", "")
                self.last_momentum[ticker] = data.get("value", 0)

        # Decision logic
        btc_mom = self.last_momentum.get("BTC-USD", 0)
        eth_mom = self.last_momentum.get("ETH-USD", 0)
        avg_mom = (btc_mom + eth_mom) / 2

        # Check for volatility data
        vol_data = None
        for key, data in signals.items():
            if isinstance(data, dict) and data.get("signal") == "volatility":
                vol_data = data

        # Check for sentiment
        sentiment_val = 0.5
        for key, data in signals.items():
            if isinstance(data, dict) and data.get("signal") == "sentiment":
                sentiment_val = data.get("value", 0.5)

        # Generate decision
        if avg_mom > 0.03:
            action = "BUY"
            confidence = min(0.95, 0.6 + avg_mom * 2)
            reasoning = f"Strong upward momentum (ROC: {avg_mom:.4f}). Market showing bullish continuation."
        elif avg_mom < -0.03:
            action = "SELL"
            confidence = min(0.90, 0.5 + abs(avg_mom) * 2)
            reasoning = f"Negative momentum detected (ROC: {avg_mom:.4f}). Reducing exposure."
        else:
            action = "HOLD"
            confidence = 0.5 + random.uniform(-0.1, 0.1)
            reasoning = f"Momentum neutral (ROC: {avg_mom:.4f}). Maintaining current position."
            self.flat_cycles += 1

        if action != "HOLD":
            self.flat_cycles = 0

        # Apply sentiment modifier
        if sentiment_val > 0.7 and action == "HOLD":
            action = "BUY"
            confidence = 0.55
            reasoning += f" Sentiment bullish ({sentiment_val:.2f})."

        # Apply vol modifier
        if vol_data and vol_data.get("value", 0) > 0.8:
            confidence *= 0.8  # Reduce confidence in high-vol environments
            reasoning += " High volatility - reducing conviction."

        # Real P&L tracking based on actual BTC prices
        current_price = 0.0
        for key, data in signals.items():
            if isinstance(data, dict) and data.get("signal") == "momentum" and data.get("ticker") == "BTC-USD":
                current_price = data.get("current_price", 0.0)
                
        if current_price > 0:
            if action == "BUY" and self.position == 0.0:
                self.entry_price = current_price
                self.position = 1.0
            elif action == "SELL" and self.position > 0.0:
                self.portfolio_pnl += (current_price - self.entry_price)
                self.position = 0.0
            
            unrealized = (current_price - self.entry_price) if self.position > 0 else 0.0
            self.portfolio_pnl_display = round(self.portfolio_pnl + unrealized, 2)

        decision = {
            "action": action,
            "confidence": round(confidence, 4),
            "reasoning": reasoning,
            "portfolio_pnl": self.portfolio_pnl_display,
            "signals_purchased": self.signals_purchased,
            "cycle": self.cycle_count,
            "timestamp": int(time.time()),
        }

        self.last_decision = decision
        self.trade_history.append(decision)

        return decision

    def record_purchase(self, endpoint: str, cost: float):
        """Track signal purchase cost."""
        self.signals_purchased += 1
        self.usdc_spent = round(self.usdc_spent + cost, 6)

    def get_status(self) -> dict:
        """Return current agent status for dashboard."""
        return {
            "signals_purchased": self.signals_purchased,
            "usdc_spent": self.usdc_spent,
            "usdc_balance": self.get_real_usdc_balance(),
            "portfolio_pnl": self.portfolio_pnl_display,
            "cycle_count": self.cycle_count,
            "flat_cycles": self.flat_cycles,
            "last_decision": self.last_decision,
        }

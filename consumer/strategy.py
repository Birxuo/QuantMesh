"""
QuantMesh - Consumer trading strategy.
Decides which signals to buy and generates mock trading decisions.
"""

import random
import time
import json
import os
import google.generativeai as genai


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


class PortfolioState:
    def __init__(self):
        self.mock_pnl = 0.0
        self.signals_purchased = 0
        self.usdc_spent = 0.0
        self.cycle_count = 0
        self.last_decisions = []


class TradeDecision(dict):
    def __init__(self, action, ticker, confidence, reasoning, signals_used, portfolio_pnl, cycle, signals_purchased):
        super().__init__(
            action=action,
            ticker=ticker,
            confidence=confidence,
            reasoning=reasoning,
            signals_used=signals_used,
            portfolio_pnl=portfolio_pnl,
            cycle=cycle,
            signals_purchased=signals_purchased,
            timestamp=int(time.time()),
        )


class GeminiStrategy:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-2.0-flash")
        self.portfolio = PortfolioState()
        self.simple = SimpleStrategy()  # For fallback and purchasing logic

    def buy_signals(self, catalog: list) -> list[dict]:
        # Keep purchasing logic from SimpleStrategy
        return self.simple.buy_signals(catalog)

    def record_purchase(self, endpoint: str, cost: float):
        self.portfolio.signals_purchased += 1
        self.portfolio.usdc_spent = round(self.portfolio.usdc_spent + cost, 6)
        # Keep simple strategy in sync for fallback
        self.simple.record_purchase(endpoint, cost)

    def make_decision(self, signals: dict) -> TradeDecision:
        self.portfolio.cycle_count += 1
        self.simple.cycle_count = self.portfolio.cycle_count

        # Build context for Gemini
        signal_summary = []
        for endpoint, data in signals.items():
            if not isinstance(data, dict):
                continue
            signal_summary.append({
                "endpoint": endpoint,
                "paid_usdc": data.get("_payment", {}).get("amount_paid_usdc", 0),
                "data": {k: v for k, v in data.items()
                         if k not in ["_payment", "cached"]}
            })

        prompt = f"""You are an autonomous AI trading agent that just 
paid real USDC on the Arc Network blockchain to purchase these 
quantitative market signals:

{json.dumps(signal_summary, indent=2)}

Portfolio state:
- Mock P&L: ${self.portfolio.mock_pnl:.2f}
- Cycle: {self.portfolio.cycle_count}
- Total signals purchased this session: {self.portfolio.signals_purchased}

Based on these signals, make a trading decision.

Respond ONLY with a JSON object, no other text:
{{
  "action": "BUY" or "SELL" or "HOLD",
  "ticker": "BTC-USD" or "ETH-USD" or "AAPL" or "MSFT",
  "confidence": 0.0 to 1.0,
  "reasoning": "2-3 sentence explanation citing specific signal values",
  "key_signal": "which signal was most important for this decision"
}}"""

        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            # Strip markdown code blocks if present
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            
            result = json.loads(text.strip())

            action = result.get("action", "HOLD")
            confidence = float(result.get("confidence", 0.5))
            ticker = result.get("ticker", "BTC-USD")
            reasoning = result.get("reasoning", "Gemini analysis")

            # Update portfolio P&L (simplified mock logic)
            # In a real system, this would track the ticker price.
            # We'll use a small randomization or fixed delta for the demo.
            pnl_delta = (confidence - 0.5) * 5 if action != "HOLD" else 0
            self.portfolio.mock_pnl += pnl_delta

            decision = TradeDecision(
                action=action,
                ticker=ticker,
                confidence=round(confidence, 4),
                reasoning=f"[GEMINI] {reasoning}",
                signals_used=list(signals.keys()),
                portfolio_pnl=round(self.portfolio.mock_pnl, 2),
                cycle=self.portfolio.cycle_count,
                signals_purchased=self.portfolio.signals_purchased
            )

            self.portfolio.last_decisions.append({
                "action": action,
                "confidence": confidence,
                "pnl_delta": pnl_delta,
                "timestamp": decision["timestamp"],
                "gemini_key_signal": result.get("key_signal", "")
            })

            self.simple.last_decision = decision
            return decision

        except Exception as e:
            print(f"  ⚠️  Gemini failed ({e}), using simple strategy fallback")
            return self._simple_fallback(signals)

    def _simple_fallback(self, signals: dict) -> TradeDecision:
        simple_dec = self.simple.make_decision(signals)
        return TradeDecision(
            action=simple_dec["action"],
            ticker=simple_dec.get("ticker", "BTC-USD"),
            confidence=simple_dec["confidence"],
            reasoning=f"[FALLBACK] {simple_dec['reasoning']}",
            signals_used=list(signals.keys()),
            portfolio_pnl=simple_dec["portfolio_pnl"],
            cycle=self.portfolio.cycle_count,
            signals_purchased=self.portfolio.signals_purchased
        )

    def get_status(self) -> dict:
        """Return current agent status for dashboard."""
        # Use simple strategy for base stats but override with Gemini state
        status = self.simple.get_status()
        status.update({
            "signals_purchased": self.portfolio.signals_purchased,
            "usdc_spent": self.portfolio.usdc_spent,
            "portfolio_pnl": round(self.portfolio.mock_pnl, 2),
            "cycle_count": self.portfolio.cycle_count,
        })
        return status

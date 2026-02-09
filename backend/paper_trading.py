# backend/paper_trading.py

from backend.stock_data import fetch_stock_data
from backend.trade_signal import get_trade_signal

INITIAL_CASH = 100000  # virtual capital


def run_paper_trading(symbol: str, days: int = 5):
    """
    Simulates paper trading using RL-based trade signals
    and returns portfolio performance + equity curve.
    """

    # Fetch historical stock data
    data = fetch_stock_data(symbol, period="1mo")

    if data is None or len(data) == 0:
        raise RuntimeError("No historical data found")

    # Ensure we never request more rows than available
    days = min(days, len(data))
    recent_data = data.tail(days)

    cash = INITIAL_CASH
    shares = 0
    trades = []
    equity_curve = []

    step = 0

    for _, row in recent_data.iterrows():
        step += 1
        price = float(row["Close"])

        # Get RL trade signal
        signal_data = get_trade_signal(symbol)
        action = signal_data.get("signal", "HOLD")

        # Safe date handling
        trade_date = (
            str(row.name.date())
            if hasattr(row.name, "date")
            else str(row.name)
        )

        # Execute simulated trade
        if action == "BUY" and cash >= price:
            shares += 1
            cash -= price
            trades.append({
                "date": trade_date,
                "action": "BUY",
                "price": round(price, 2)
            })

        elif action == "SELL" and shares > 0:
            shares -= 1
            cash += price
            trades.append({
                "date": trade_date,
                "action": "SELL",
                "price": round(price, 2)
            })

        # Track portfolio value after each step
        portfolio_value = cash + shares * price
        equity_curve.append({
            "step": step,
            "equity": round(portfolio_value, 2)
        })

    return {
        "symbol": symbol,
        "initial_cash": INITIAL_CASH,
        "final_cash": round(cash, 2),
        "shares_held": shares,
        "portfolio_value": round(portfolio_value, 2),
        "trades": trades,
        "equity_curve": equity_curve
    }

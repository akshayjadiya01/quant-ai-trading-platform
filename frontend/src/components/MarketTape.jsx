import React from "react";
import "./MarketTape.css";

export default function MarketTape({ items = [], symbol = "AAPL", price = 0 }) {
  const displayItems = items.length ? items : [
    { symbol, price, change: 0.24 },
    { symbol: "MSFT", price: price * 1.02, change: -0.12 },
    { symbol: "GOOG", price: price * 1.15, change: 0.52 },
    { symbol: "TSLA", price: price * 0.6, change: -1.45 },
    { symbol: "AMZN", price: price * 0.9, change: 0.33 },
  ];

  return (
    <div className="market-tape" role="marquee">
      <div className="tape-inner">
        {displayItems.map((it, idx) => (
          <div className={`tape-item ${it.change >= 0 ? 'positive' : 'negative'}`} key={idx}>
            <span className="tape-symbol">{it.symbol}</span>
            <span className="tape-price">${it.price.toFixed(2)}</span>
            <span className="tape-change">{it.change >= 0 ? '▲' : '▼'} {Math.abs(it.change).toFixed(2)}%</span>
          </div>
        ))}
        {/* duplicate for smooth loop */}
        {displayItems.map((it, idx) => (
          <div className={`tape-item ${it.change >= 0 ? 'positive' : 'negative'}`} key={`dup-${idx}`}>
            <span className="tape-symbol">{it.symbol}</span>
            <span className="tape-price">${it.price.toFixed(2)}</span>
            <span className="tape-change">{it.change >= 0 ? '▲' : '▼'} {Math.abs(it.change).toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

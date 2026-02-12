import React from "react";
import "./OrderBook.css";

export default function OrderBook({ symbol = "AAPL", price = 0 }) {
  // generate small mock book around price
  const steps = 8;
  const bids = Array.from({ length: steps }).map((_, i) => ({
    price: +(price - (i + 1) * (price * 0.002)).toFixed(2),
    size: Math.floor(100 + Math.random() * 900)
  }));
  const asks = Array.from({ length: steps }).map((_, i) => ({
    price: +(price + (i + 1) * (price * 0.002)).toFixed(2),
    size: Math.floor(100 + Math.random() * 900)
  }));

  return (
    <div className="orderbook">
      <div className="orderbook-header">
        <strong>{symbol}</strong>
        <span className="mid-price">${price.toFixed(2)}</span>
      </div>
      <div className="orderbook-grid">
        <div className="asks">
          <div className="col-header">Asks</div>
          {asks.map((a, idx) => (
            <div className="row ask" key={`ask-${idx}`}>
              <span className="price">{a.price.toFixed(2)}</span>
              <span className="size muted">{a.size}</span>
            </div>
          ))}
        </div>
        <div className="bids">
          <div className="col-header">Bids</div>
          {bids.map((b, idx) => (
            <div className="row bid" key={`bid-${idx}`}>
              <span className="price">{b.price.toFixed(2)}</span>
              <span className="size muted">{b.size}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

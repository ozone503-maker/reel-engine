import React from "react";

export function SymbolTile({ symbol, small = false }) {
  return (
    <div className={`symbol-tile ${symbol.type} ${small ? "small" : ""}`} style={{ "--symbol-color": symbol.color }}>
      {symbol.image ? <img src={symbol.image} alt={symbol.name} /> : <span className="symbol-emoji">{symbol.emoji}</span>}
      <span className="symbol-name">{symbol.name}</span>
      {symbol.role && <span className="symbol-role">{symbol.role}</span>}
    </div>
  );
}

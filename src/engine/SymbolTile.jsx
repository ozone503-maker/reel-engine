import React from "react";

export function SymbolTile({ symbol, small = false }) {
  return (
    <div className={`symbol-tile ${symbol.type} ${small ? "small" : ""}`} style={{ "--symbol-color": symbol.color }} {...(!symbol.image ? { "aria-label": symbol.name } : {})}>
      {symbol.image ? <img src={symbol.image} alt={symbol.name} /> : <span className="symbol-emoji" aria-hidden="true">{symbol.emoji}</span>}
    </div>
  );
}

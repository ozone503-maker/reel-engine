import React, { useMemo, useState } from "react";
import { SymbolTile } from "./SymbolTile.jsx";
import { evaluateDemo } from "./evaluate.js";

export function ReelGame({ theme }) {
  const symbols = theme.symbols;
  const randomSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];
  const makeGrid = () => Array.from({ length: 5 }, () => Array.from({ length: 4 }, randomSymbol));

  const [grid, setGrid] = useState(makeGrid);
  const [spins, setSpins] = useState(3);
  const [bonusSpins, setBonusSpins] = useState(0);
  const [credits, setCredits] = useState(0);
  const [message, setMessage] = useState("YOUR NEXT SPIN STARTS HERE");
  const [spinning, setSpinning] = useState(false);
  const [spinStrips, setSpinStrips] = useState(null);
  const [lastWins, setLastWins] = useState([]);
  const [totalSpins, setTotalSpins] = useState(0);
  const wins = useMemo(() => lastWins, [lastWins]);

  function spin() {
    if (spinning || (spins + bonusSpins) <= 0) return;
    setSpinning(true);
    if (bonusSpins > 0) setBonusSpins((n) => n - 1);
    else setSpins((n) => n - 1);
    setMessage("THE REELS ARE IN MOTION…");

    // Build long strips that end with the final 4 symbols.
    // Animation will scroll so those final symbols land in the viewport.
    const finalGrid = makeGrid();
    const leadCount = 36;
    const strips = finalGrid.map((finalReel) => {
      const lead = Array.from({ length: leadCount }, randomSymbol);
      return [...lead, ...finalReel];
    });
    setSpinStrips(strips);

    window.setTimeout(() => {
      const results = evaluateDemo(finalGrid, symbols);
      const payout = results.reduce((sum, win) => sum + win.reward, 0);
      setGrid(finalGrid);
      setSpinStrips(null);
      setLastWins(results);
      setCredits((n) => n + payout);
      setTotalSpins((n) => n + 1);
      setMessage(payout ? `NICE! ${payout} ${theme.currency} DEMO CREDITS` : "NO MATCH THIS TIME — SPIN AGAIN!");
      setSpinning(false);
    }, 3400);
  }

  function earnDemoSpin() {
    setBonusSpins((n) => n + 1);
    setMessage("BONUS SPIN ADDED — DEMO ONLY");
  }

  const characters = symbols.filter((s) => s.type === "character");
  const botanicals = symbols.filter((s) => s.type === "botanical");

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark"><span className="paw">✿</span></div>
      </header>

      <section className="hero">
        <h1>{theme.heroTitle || theme.name}</h1>
        <div className="hero-tagline">play to win a jar of<br/><strong>FRUITY PUPPY</strong><br/>spin to win kudokens</div>
      </section>

      <section className="machine-panel">
        <div className={`reel-frame ${spinning ? "is-spinning" : ""}`}>
          <div className="reel-grid" aria-label="Five reels, four rows">
            {grid.map((reel, reelIndex) => (
              <div className="reel-column" key={reelIndex}>
                <div
                  className={`reel-strip ${spinning ? "landing" : ""}`}
                  style={{
                    animationDelay: `${reelIndex * 80}ms`,
                    "--lead": "36",
                  }}
                >
                  {(spinning && spinStrips ? spinStrips[reelIndex] : reel).map((symbol, rowIndex) => (
                    <SymbolTile key={`${reelIndex}-${rowIndex}-${symbol.id}`} symbol={symbol} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="reel-glow" />
        </div>
        <div className="machine-footnote">Win: 3+ matching symbols left-to-right, any row. One payout per symbol.</div>

        <div className="message-bar">{message}</div>
        <div className="control-row">
          <button className="spin-button" onClick={spin} disabled={spinning || spins + bonusSpins <= 0}>
            <span>{spinning ? "SPINNING…" : "SPIN"}</span><small>{spins + bonusSpins} SPINS AVAILABLE</small>
          </button>
          <div className="wallet-card"><span>DEMO {theme.currency} CREDITS</span><strong>{credits.toLocaleString()}</strong></div>
        </div>
        <div className="stats-row">
          <div><span>DAILY SPINS</span><strong>{spins}</strong></div>
          <div><span>BONUS SPINS</span><strong>{bonusSpins}</strong></div>
          <div><span>TOTAL SPINS</span><strong>{totalSpins}</strong></div>
        </div>
        <button className="earn-button" onClick={earnDemoSpin}>＋ ADD TEST BONUS SPIN</button>
        {wins.length > 0 && <div className="win-list"><strong>LAST SPIN WINS</strong>{wins.map((w) => <div key={w.symbol.id}>{w.symbol.name} · {w.count} reels <b>+{w.reward} demo {theme.currency}</b></div>)}</div>}
      </section>

      <section className="symbol-library">
        <div className="library-heading"><div><span className="section-kicker">THE SYMBOL COLLECTION</span><h2>Meet the lineup</h2></div><span className="count-label">{symbols.length} SYMBOLS</span></div>
        <h3>THE CHARACTERS</h3>
        <div className="symbol-roster">{characters.map((symbol) => <SymbolTile key={symbol.id} symbol={symbol} small />)}</div>
        <h3>THE BOTANICALS</h3>
        <div className="symbol-roster">{botanicals.map((symbol) => <SymbolTile key={symbol.id} symbol={symbol} small />)}</div>
      </section>

      <footer><span>REEL ENGINE</span><span>THEME: {theme.name} · BUILD 0.1</span></footer>
    </main>
  );
}

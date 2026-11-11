import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

/**
 * Theme data is deliberately separate from the reel engine.
 * Replace placeholder artwork by setting image on any symbol.
 * This first build is a local visual prototype: rewards are simulated,
 * not issued or transferred on-chain.
 */
const theme = {
  name: "FRUITY PUPPY",
  subtitle: "KUDOKEN REELS",
  accent: "#ff4fb8",
  accent2: "#45c9ff",
  currency: "KDU",
  characters: [
    { id: "ipo", name: "Ipo", emoji: "🐶", color: "#ff55b9", type: "character", role: "WILD" },
    { id: "char-2", name: "Character 02", emoji: "🦎", color: "#ffbd54", type: "character", role: "BONUS" },
    { id: "char-3", name: "Character 03", emoji: "🐸", color: "#49c7ff", type: "character", role: "BONUS" },
    { id: "char-4", name: "Character 04", emoji: "🤖", color: "#ff626f", type: "character", role: "BONUS" },
    { id: "char-5", name: "Character 05", emoji: "👾", color: "#ff8545", type: "character", role: "BONUS" },
    { id: "char-6", name: "Character 06", emoji: "🐸", color: "#b36bff", type: "character", role: "BONUS" }
  ],
  botanicals: [
    { id: "lilikoi", name: "Lilikoi", emoji: "🟡", color: "#e8b94e", type: "botanical" },
    { id: "papaya", name: "Papaya", emoji: "🥭", color: "#ff914d", type: "botanical" },
    { id: "cranberry-hibiscus", name: "Cranberry Hibiscus", emoji: "🌺", color: "#ef526b", type: "botanical" },
    { id: "ice-cream-bean", name: "Ice Cream Bean", emoji: "🤍", color: "#e8e0ce", type: "botanical" },
    { id: "spearmint", name: "Spearmint", emoji: "🌿", color: "#51c68a", type: "botanical" },
    { id: "aloe-vera", name: "Aloe Vera", emoji: "🪴", color: "#54c8bd", type: "botanical" }
  ]
};

const symbols = [...theme.characters, ...theme.botanicals];
const randomSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];
const makeGrid = () => Array.from({ length: 5 }, () => Array.from({ length: 4 }, randomSymbol));

function evaluateWays(grid) {
  // 1,024 ways: every row position on each of five reels is a possible path.
  // A win is 3+ identical symbols on consecutive reels from the left.
  const counts = new Map();
  for (let startRow = 0; startRow < 4; startRow++) {
    const first = grid[0][startRow];
    let run = 1;
    for (let reel = 1; reel < 5; reel++) {
      if (grid[reel].some((s) => s.id === first.id)) run++;
      else break;
    }
    if (run >= 3) counts.set(first.id, Math.max(counts.get(first.id) || 0, run));
  }
  const wins = [...counts.entries()].map(([id, count]) => {
    const symbol = symbols.find((s) => s.id === id);
    const base = symbol.type === "character" ? 12 : 5;
    return { symbol, count, reward: base * (count - 2) };
  });
  return wins;
}

function SymbolTile({ symbol, small = false }) {
  return (
    <div className={`symbol-tile ${symbol.type} ${small ? "small" : ""}`} style={{ "--symbol-color": symbol.color }}>
      {symbol.image ? <img src={symbol.image} alt={symbol.name} /> : <span className="symbol-emoji">{symbol.emoji}</span>}
      <span className="symbol-name">{symbol.name}</span>
      {symbol.role && <span className="symbol-role">{symbol.role}</span>}
    </div>
  );
}

function App() {
  const [grid, setGrid] = useState(makeGrid);
  const [spins, setSpins] = useState(3);
  const [bonusSpins, setBonusSpins] = useState(0);
  const [credits, setCredits] = useState(0);
  const [message, setMessage] = useState("YOUR NEXT SPIN STARTS HERE");
  const [spinning, setSpinning] = useState(false);
  const [lastWins, setLastWins] = useState([]);
  const [totalSpins, setTotalSpins] = useState(0);
  const wins = useMemo(() => lastWins, [lastWins]);

  function spin() {
    if (spinning || (spins + bonusSpins) <= 0) return;
    setSpinning(true);
    if (bonusSpins > 0) setBonusSpins((n) => n - 1);
    else setSpins((n) => n - 1);
    setMessage("THE REELS ARE IN MOTION…");
    window.setTimeout(() => {
      const next = makeGrid();
      const results = evaluateWays(next);
      const payout = results.reduce((sum, win) => sum + win.reward, 0);
      setGrid(next);
      setLastWins(results);
      setCredits((n) => n + payout);
      setTotalSpins((n) => n + 1);
      setMessage(payout ? `NICE! ${payout} KDU DEMO CREDITS` : "NO MATCH THIS TIME — SPIN AGAIN!");
      setSpinning(false);
    }, 650);
  }

  function earnDemoSpin() {
    setBonusSpins((n) => n + 1);
    setMessage("BONUS SPIN ADDED — DEMO ONLY");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark"><span className="paw">✿</span><div><strong>{theme.name}</strong><small>{theme.subtitle}</small></div></div>
        <div className="status-pill"><span className="live-dot" /> PROTOTYPE MODE</div>
      </header>

      <section className="hero">
        <div className="eyebrow">A NEW KIND OF FRUIT-FUELED ARCADE</div>
        <h1>KUDOKEN <span>REELS</span></h1>
        <p>Six botanicals. Six characters. One very good spin.</p>
      </section>

      <section className="machine-panel">
        <div className="machine-heading">
          <div><span className="section-kicker">THE MAIN EVENT</span><h2>FRUIT FRENZY</h2></div>
          <div className="ways-badge"><strong>1,024</strong><span>WAYS TO WIN*</span></div>
        </div>
        <div className={`reel-frame ${spinning ? "is-spinning" : ""}`}>
          <div className="reel-grid" aria-label="Five reels, four rows">
            {grid.map((reel, reelIndex) => (
              <div className="reel-column" key={reelIndex}>
                {reel.map((symbol, rowIndex) => <SymbolTile key={`${reelIndex}-${rowIndex}`} symbol={symbol} />)}
              </div>
            ))}
          </div>
          <div className="reel-glow" />
        </div>
        <div className="machine-footnote">*Prototype display: 5 reels × 4 rows. Final ways evaluation and paytable will be formally specified before real rewards.</div>

        <div className="message-bar">{message}</div>
        <div className="control-row">
          <button className="spin-button" onClick={spin} disabled={spinning || spins + bonusSpins <= 0}>
            <span>{spinning ? "SPINNING…" : "SPIN"}</span><small>{spins + bonusSpins} SPINS AVAILABLE</small>
          </button>
          <div className="wallet-card"><span>DEMO KDU CREDITS</span><strong>{credits.toLocaleString()}</strong></div>
        </div>
        <div className="stats-row">
          <div><span>DAILY SPINS</span><strong>{spins}</strong></div>
          <div><span>BONUS SPINS</span><strong>{bonusSpins}</strong></div>
          <div><span>TOTAL SPINS</span><strong>{totalSpins}</strong></div>
        </div>
        <button className="earn-button" onClick={earnDemoSpin}>＋ ADD TEST BONUS SPIN</button>
        {wins.length > 0 && <div className="win-list"><strong>LAST SPIN WINS</strong>{wins.map((w) => <div key={w.symbol.id}>{w.symbol.name} · {w.count} reels <b>+{w.reward} demo KDU</b></div>)}</div>}
      </section>

      <section className="symbol-library">
        <div className="library-heading"><div><span className="section-kicker">THE SYMBOL COLLECTION</span><h2>Meet the lineup</h2></div><span className="count-label">12 SYMBOLS</span></div>
        <h3>THE CHARACTERS</h3>
        <div className="symbol-roster">{theme.characters.map((symbol) => <SymbolTile key={symbol.id} symbol={symbol} small />)}</div>
        <h3>THE BOTANICALS</h3>
        <div className="symbol-roster">{theme.botanicals.map((symbol) => <SymbolTile key={symbol.id} symbol={symbol} small />)}</div>
        <p className="placeholder-note">Botanical artwork is temporary placeholder art. Replace each symbol's image field with the supplied fruit photography when ready. Character portrait slots are ready for the six approved headshots.</p>
      </section>

      <footer><span>REEL ENGINE</span><span>THEME: FRUITY PUPPY · BUILD 0.1</span></footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

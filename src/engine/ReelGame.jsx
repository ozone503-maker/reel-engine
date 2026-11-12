import React, { useMemo, useState } from "react";
import { SymbolTile } from "./SymbolTile.jsx";
import { evaluateDemo, PAYTABLE } from "./evaluate.js";

export function ReelGame({ theme }) {
  const symbols = theme.symbols;
  const regulars = symbols.filter((s) => s.type === "character" || s.type === "botanical");
  const pickHot = () => [...regulars].sort(() => Math.random() - 0.5).slice(0, 5);
  const randomSymbol = (hot) => {
    if (Math.random() < 0.006) {
      const jar = symbols.find((s) => s.id === "jar");
      if (jar) return jar;
    }
    if (Math.random() < 0.03) {
      const wild = symbols.find((s) => s.type === "wild");
      if (wild) return wild;
    }
    if (Math.random() < 0.75 && hot?.length) return hot[Math.floor(Math.random() * hot.length)];
    return regulars[Math.floor(Math.random() * regulars.length)];
  };
  const makeGrid = () => Array.from({ length: 5 }, () => Array.from({ length: 4 }, randomSymbol));

  const [grid, setGrid] = useState(makeGrid);
  const [spins, setSpins] = useState(5);
  const [bonusSpins, setBonusSpins] = useState(0);
  const [credits, setCredits] = useState(0);
  const [message, setMessage] = useState("YOUR NEXT SPIN STARTS HERE");
  const [winVideo, setWinVideo] = useState(null);
  const [showIntro, setShowIntro] = useState(false);
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
    const hot = pickHot();
    const finalGrid = Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => randomSymbol(hot)));
    const leadCount = 36;
    const strips = finalGrid.map((finalReel) => {
      const lead = Array.from({ length: leadCount }, () => randomSymbol(hot));
      return [...lead, ...finalReel];
    });
    setSpinStrips(strips);

    window.setTimeout(() => {
      const result = evaluateDemo(finalGrid, symbols);
      const wins = result.wins || [];
      const payout = wins.reduce((sum, win) => sum + win.reward, 0);
      const free = result.freeSpinsAwarded || 0;
      const freeJar = result.freeJar || false;
      setGrid(finalGrid);
      setSpinStrips(null);
      setLastWins(wins);
      const hasWildInWin = wins.some((w) => w.positions?.some((p) => {
        const cell = finalGrid?.[p.reel]?.[p.row];
        return cell?.role === "WILD" || cell?.type === "wild";
      }));
      const videoFor = {
        ruch: ["/assets/videos/ruch-win.mp4", 6000],
        fonk: ["/assets/videos/fonk-win.mp4", 8000],
        dinny: ["/assets/videos/dinny-win.mp4", 6000],
        nonna: ["/assets/videos/nonna-win.mp4", 8000],
        erv: ["/assets/videos/erv-win.mp4", 8000],
        ipo: ["/assets/videos/ipo-win.mp4", 10000],
        "cranberry-hibiscus": ["/assets/videos/cranberry-hibiscus-win.mp4", 10000],
        papaya: ["/assets/videos/papaya-win.mp4", 10000],
        lilikoi: ["/assets/videos/lilikoi-win.mp4", 10000],
        "aloe-vera": ["/assets/videos/aloe-vera-win.mp4", 10000],
        spearmint: ["/assets/videos/spearmint-win.mp4", 10000],
        "ice-cream-bean": ["/assets/videos/ice-cream-bean-win.mp4", 10000],
      };
      const charWin = wins.find((w) => videoFor[w.symbol?.id]);
      const charVideo = charWin ? videoFor[charWin.symbol.id] : null;
      if (hasWildInWin && charVideo) {
        setWinVideo("/assets/videos/wild-win.mp4");
        setTimeout(() => {
          setWinVideo(charVideo[0]);
          setTimeout(() => setWinVideo(null), charVideo[1]);
        }, 10000);
      } else if (hasWildInWin) {
        setWinVideo("/assets/videos/wild-win.mp4");
        setTimeout(() => setWinVideo(null), 10000);
      } else if (result.freeSpinsAwarded > 0) {
        setWinVideo("/assets/videos/freespins-win.mp4");
        setTimeout(() => setWinVideo(null), 10000);
      } else if (charVideo) {
        setWinVideo(charVideo[0]);
        setTimeout(() => setWinVideo(null), charVideo[1]);
      } else if (wins.length === 0 && !result.freeSpinsAwarded && Math.random() < 0.3) {
        setWinVideo("/assets/videos/dontbesad-win.mp4");
        setTimeout(() => setWinVideo(null), 7500);
      }
      setCredits((n) => n + payout);
      if (free > 0) setBonusSpins((n) => n + free);
      setTotalSpins((n) => n + 1);
      let msg = payout ? `NICE! ${payout} ${theme.currency} DEMO CREDITS` : "NO MATCH THIS TIME — SPIN AGAIN!";
      if (free > 0) msg += `  +${free} FREE SPINS!`;
      if (freeJar) msg = "🎉 FREE JAR OF FRUITY PUPPY! 🎉";
      setMessage(msg);
      setSpinning(false);
    }, 3100);
  }

  function earnDemoSpin() {
    setBonusSpins((n) => n + 1);
    setMessage("BONUS SPIN ADDED — DEMO ONLY");
  }

  const characters = symbols.filter((s) => s.type === "character");
  const botanicals = symbols.filter((s) => s.type === "botanical");

  return (
    <>
      {showIntro && (
        <div className="win-video-overlay" onClick={() => setShowIntro(false)} style={{cursor:"pointer"}}>
          <video src="/assets/videos/intro.mp4" autoPlay playsInline onEnded={() => setShowIntro(false)} onError={() => setShowIntro(false)} />
        </div>
      )}
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark"><span className="paw">✿</span></div>
      </header>


      <section className="hero">
        <div className="hero-tagline">play to win a jar of <strong>FRUITY PUPPY</strong></div>
      </section>

            <section className="character-banner" aria-label="Fruity Puppy character lineup">
        <div className="marquee-stage">
          <div className="character-lineup">
            <img src="/assets/symbols/characters/ruch.jpg" alt="Ruch" />
            <img src="/assets/symbols/characters/erv.jpg" alt="Erv" />
            <img src="/assets/symbols/characters/ipo.jpg" alt="Ipo" />
            <img src="/assets/symbols/characters/nonna.jpg" alt="Nonna" />
            <img src="/assets/symbols/characters/fonk.jpg" alt="Fonk" />
            <img src="/assets/symbols/characters/dinny.jpg" alt="Dinny" />
          </div>
        </div>
        <div className="brand-lockup">
          <div className="logo-text">FRUITY PUPPY</div>
          <div className="brand-subtitle">spin to win kudokens</div>
        </div>
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
                  {(spinning && spinStrips ? spinStrips[reelIndex] : reel).map((symbol, rowIndex) => {
                    const isWinning = !spinning && wins.some((w) => w.positions?.some((p) => p.reel === reelIndex && p.row === rowIndex));
                    const isJar = symbol.id === "jar";
                    return <SymbolTile key={`${reelIndex}-${rowIndex}-${symbol.id}`} symbol={symbol} winning={isWinning} isJar={isJar} />;
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="reel-glow" />
        </div>
        <div className="machine-footnote">Win: 3, 4, or 5 in a row — horizontal or vertical.</div>

        
        {winVideo && (
          <div className="win-video-overlay" onClick={() => setWinVideo(null)}>
            <video src={winVideo} autoPlay playsInline onPlaying={(e) => e.target.parentElement.classList.add("ready")} />
          </div>
        )}
        <div className="message-bar">{message}</div>
        <div className="control-bar">
          <div className="bar-credits"><span>DEMO CREDITS</span><strong>{credits.toLocaleString()}</strong></div>
          <button className="spin-button" onClick={spin} disabled={spinning || spins + bonusSpins <= 0}>
            <span>▶</span><small>{spinning ? "..." : "SPIN"}</small>
          </button>
          <div className="bar-win"><span>SPINS</span><strong>{spins + bonusSpins}</strong></div>
        </div>
        {wins.length > 0 && <div className="win-list"><strong>LAST SPIN WINS</strong>{wins.map((w) => <div key={w.symbol.id}>{w.symbol.name} · {w.count} {w.direction} <b>+{w.reward} demo {theme.currency}</b></div>)}</div>}
      </section>

      <section className="paytable">
        <div className="library-heading"><div><span className="section-kicker">PAYTABLE</span><h2>How much each symbol pays</h2></div></div>
        <div className="paytable-grid">
          {symbols.filter(s => s.type !== "wild" && s.type !== "scatter").map((symbol) => {
            const pay = PAYTABLE[symbol.id] || { 3: 5, 4: 12, 5: 30 };
            return (
              <div className="paytable-row" key={symbol.id}>
                <SymbolTile symbol={symbol} small />
                <div className="paytable-values">
                  <span>3 <b>{pay[3]}</b></span>
                  <span>4 <b>{pay[4]}</b></span>
                  <span>5 <b>{pay[5]}</b></span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="paytable-note">Wins are horizontal only. 3, 4, or 5 matching symbols in a straight row. Storm Shadow is WILD. Free Spin symbols award free spins.</div>
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
    </>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createGameAudio } from "./audio.js";
import { SymbolTile } from "./SymbolTile.jsx";
import { evaluateDemo, PAYTABLE, runCascades } from "./evaluate.js";

export function ReelGame({ theme }) {
  const symbols = theme.symbols;
  const regulars = symbols.filter((s) => s.type === "character" || s.type === "botanical");
  const pickHot = () => [...regulars].sort(() => Math.random() - 0.5).slice(0, 5);
  const ODDS = { jar: 0.0045, freespin: 0.055, kdu: 0.03, wild: 0.03, hot: 0.55 };
  const randomSymbol = (hot) => {
    for (const id of ["jar", "freespin", "kdu"]) {
      if (Math.random() < ODDS[id]) {
        const sym = symbols.find((s) => s.id === id);
        if (sym) return sym;
      }
    }
    if (Math.random() < ODDS.wild) {
      const wild = symbols.find((s) => s.type === "wild");
      if (wild) return wild;
    }
    if (Math.random() < ODDS.hot && hot?.length) return hot[Math.floor(Math.random() * hot.length)];
    return regulars[Math.floor(Math.random() * regulars.length)];
  };
  const makeGrid = () => Array.from({ length: 5 }, () => Array.from({ length: 4 }, randomSymbol));

  const audioRef = useRef(null);
  const spinTimeoutRef = useRef(null);
  const countUpRef = useRef(null);
  const cascadeTimeoutRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);
  const [grid, setGrid] = useState(makeGrid);
  const [spins, setSpins] = useState(5);
  const [bonusSpins, setBonusSpins] = useState(0);
  const [credits, setCredits] = useState(0);
  const [displayedCredits, setDisplayedCredits] = useState(0);
  const [message, setMessage] = useState("YOUR NEXT SPIN STARTS HERE");
  const [winVideo, setWinVideo] = useState(null);
  const [showIntro, setShowIntro] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinStrips, setSpinStrips] = useState(null);
  const [lastWins, setLastWins] = useState([]);
  const [totalSpins, setTotalSpins] = useState(0);
  const [turbo, setTurbo] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [stopOnFeature, setStopOnFeature] = useState(true);
  const [anticipation, setAnticipation] = useState(false);
  const [winTier, setWinTier] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [cascadeStep, setCascadeStep] = useState(0);
  const [cascadeMultiplier, setCascadeMultiplier] = useState(1);
  const wins = useMemo(() => lastWins, [lastWins]);

  useEffect(() => () => {
    audioRef.current?.destroy();
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    if (countUpRef.current) cancelAnimationFrame(countUpRef.current);
    if (cascadeTimeoutRef.current) clearTimeout(cascadeTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (displayedCredits === credits) return;
    const start = displayedCredits;
    const end = credits;
    const duration = Math.min(1200, Math.max(400, Math.abs(end - start) * 8));
    const startTime = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedCredits(Math.round(start + (end - start) * eased));
      if (t < 1) countUpRef.current = requestAnimationFrame(tick);
    }
    countUpRef.current = requestAnimationFrame(tick);
    return () => countUpRef.current && cancelAnimationFrame(countUpRef.current);
  }, [credits]);

  async function toggleSound() {
    if (!audioRef.current) audioRef.current = createGameAudio();
    if (soundOn) {
      audioRef.current.stop();
      setSoundOn(false);
    } else {
      await audioRef.current.start();
      setSoundOn(true);
    }
  }

  function getWinTier(payout) {
    if (payout >= 200) return "mega";
    if (payout >= 60) return "big";
    if (payout > 0) return "small";
    return null;
  }

  function finishSpin(finalGrid, result) {
    // Run cascades on the landed grid
    const hot = pickHot();
    const cascadeResult = runCascades(
      finalGrid,
      symbols,
      () => randomSymbol(hot),
      5
    );

    const steps = cascadeResult.steps;
    let stepIndex = 0;

    function showStep() {
      if (stepIndex >= steps.length) {
        // All cascades done
        const totalPayout = cascadeResult.totalPayout;
        const free = cascadeResult.freeSpinsAwarded || 0;
        const freeJar = cascadeResult.freeJar || false;
        setGrid(cascadeResult.finalGrid);
        setLastWins(steps[steps.length - 1]?.wins || []);
        setCascadeStep(0);
        setCascadeMultiplier(1);
        const tier = getWinTier(totalPayout);
        setWinTier(tier);
        if (tier === "big" || tier === "mega") {
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), tier === "mega" ? 900 : 500);
        }
        setCredits((n) => n + totalPayout);
        if (free > 0) setBonusSpins((n) => n + free);
        setTotalSpins((n) => n + 1);
        let msg = totalPayout ? `NICE! ${totalPayout} ${theme.currency} DEMO CREDITS` : "NO MATCH THIS TIME — SPIN AGAIN!";
        if (free > 0) msg += `  +${free} FREE SPINS!`;
        if (freeJar) msg = "🎉 FREE JAR OF FRUITY PUPPY! 🎉";
        if (tier === "mega") msg = `🔥 MEGA WIN! ${totalPayout} ${theme.currency}! 🔥`;
        else if (tier === "big") msg = `💥 BIG WIN! ${totalPayout} ${theme.currency}! 💥`;
        if (steps.length > 1) msg += ` (${steps.length - 1} cascade${steps.length > 2 ? "s" : ""})`;
        setMessage(msg);
        if (soundOn) {
          if (totalPayout > 0) audioRef.current?.win();
          else audioRef.current?.miss();
          if (free > 0 || freeJar) audioRef.current?.bonus();
        }
        setSpinning(false);
        setAnticipation(false);
        if (autoSpin && (free === 0 || !stopOnFeature) && !freeJar) {
          setTimeout(() => { if (autoSpin) spin(); }, turbo ? 400 : 900);
        } else if (autoSpin && (free > 0 || freeJar) && stopOnFeature) {
          setAutoSpin(false);
        }
        return;
      }

      const step = steps[stepIndex];
      setGrid(step.grid);
      setLastWins(step.wins);
      setCascadeStep(stepIndex);
      setCascadeMultiplier(step.multiplier);
      if (step.wins.length > 0 && stepIndex > 0) {
        setMessage(`CASCADE x${step.multiplier}!`);
      }
      stepIndex++;
      const delay = turbo ? 350 : 700;
      cascadeTimeoutRef.current = setTimeout(showStep, delay);
    }

    // Start with the first step (initial land)
    showStep();
  }

  function spin() {
    if (spinning || (spins + bonusSpins) <= 0) return;
    if (soundOn) audioRef.current?.spin();
    setSpinning(true);
    setWinTier(null);
    setScreenShake(false);
    setCascadeStep(0);
    setCascadeMultiplier(1);
    if (bonusSpins > 0) setBonusSpins((n) => n - 1);
    else setSpins((n) => n - 1);
    setMessage("THE REELS ARE IN MOTION…");

    const hot = pickHot();
    const finalGrid = Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => randomSymbol(hot)));
    let earlyScatters = 0;
    for (let r = 0; r < 3; r++) {
      for (const cell of finalGrid[r]) {
        if (cell?.role === "FREESPIN" || cell?.type === "scatter") earlyScatters++;
      }
    }
    const willAnticipate = earlyScatters >= 2;
    setAnticipation(willAnticipate);

    const leadCount = 36;
    const strips = finalGrid.map((finalReel) => {
      const lead = Array.from({ length: leadCount }, () => randomSymbol(hot));
      return [...lead, ...finalReel];
    });
    setSpinStrips(strips);

    const baseDuration = turbo ? 1200 : 3400;
    const duration = willAnticipate ? baseDuration + 1800 : baseDuration;
    spinTimeoutRef.current = window.setTimeout(() => {
      const result = evaluateDemo(finalGrid, symbols);
      finishSpin(finalGrid, result);
    }, duration);
  }

  function slamStop() {
    if (!spinning || !spinTimeoutRef.current) return;
    clearTimeout(spinTimeoutRef.current);
    spinTimeoutRef.current = null;
    if (spinStrips) {
      const finalGrid = spinStrips.map((strip) => strip.slice(-4));
      const result = evaluateDemo(finalGrid, symbols);
      finishSpin(finalGrid, result);
    }
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
    <main className={`app-shell ${screenShake ? "screen-shake" : ""} ${winTier ? `win-${winTier}` : ""}`}>
      <header className="topbar">
        <div className="brand-mark"><span className="paw">✿</span></div>
        <button className="sound-toggle" type="button" onClick={toggleSound} aria-pressed={soundOn}>
          <span>{soundOn ? "♫ SOUND ON" : "♫ SOUND OFF"}</span>
        </button>
      </header>

      <section className="hero">
        <div className="hero-tagline">play to win a jar of <strong>FRUITY PUPPY</strong></div>
      </section>

      <section className="machine-panel">
        <div className={`reel-frame ${spinning ? "is-spinning" : ""} ${anticipation ? "is-anticipating" : ""} ${turbo ? "is-turbo" : ""}`}>
          <div className="reel-grid" aria-label="Five reels, four rows">
            {grid.map((reel, reelIndex) => (
              <div className="reel-column" key={reelIndex}>
                <div
                  className={`reel-strip ${spinning ? "landing" : ""} ${anticipation && reelIndex >= 3 ? "anticipate" : ""}`}
                  style={{
                    animationDelay: `${reelIndex * (turbo ? 30 : 80)}ms`,
                    "--lead": "36",
                    "--spin-duration": turbo ? "1.1s" : "3s",
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
          {anticipation && spinning && <div className="anticipation-banner">ANTICIPATION…</div>}
          {cascadeStep > 0 && <div className="cascade-banner">CASCADE x{cascadeMultiplier}</div>}
        </div>
        <div className="machine-footnote">Win: 3, 4, or 5 in a row — horizontal or vertical. Cascades raise the multiplier.</div>

        {winVideo && (
          <div className="win-video-overlay" onClick={() => setWinVideo(null)}>
            <video src={winVideo} autoPlay playsInline onPlaying={(e) => e.target.parentElement.classList.add("ready")} onEnded={() => setWinVideo(null)} />
          </div>
        )}
        {winTier && (
          <div className={`win-tier-banner tier-${winTier}`}>
            {winTier === "mega" ? "MEGA WIN" : winTier === "big" ? "BIG WIN" : "WIN"}
          </div>
        )}
        <div className="message-bar">{message}</div>
        <div className="control-row">
          <button
            className="spin-button"
            onClick={spinning ? slamStop : spin}
            disabled={!spinning && (spins + bonusSpins) <= 0}
          >
            <span>{spinning ? "STOP" : "SPIN"}</span>
            <small>{spins + bonusSpins} SPINS AVAILABLE</small>
          </button>
          <div className="wallet-card"><span>DEMO {theme.currency} CREDITS</span><strong>{displayedCredits.toLocaleString()}</strong></div>
        </div>
        <div className="mode-row">
          <button className={`mode-btn ${turbo ? "active" : ""}`} onClick={() => setTurbo((t) => !t)} type="button">
            ⚡ TURBO
          </button>
          <button className={`mode-btn ${autoSpin ? "active" : ""}`} onClick={() => setAutoSpin((a) => !a)} type="button">
            ▶ AUTO
          </button>
          <label className="stop-on-feature">
            <input type="checkbox" checked={stopOnFeature} onChange={(e) => setStopOnFeature(e.target.checked)} />
            Stop on feature
          </label>
        </div>
        <div className="stats-row">
          <div><span>DAILY SPINS</span><strong>{spins}</strong></div>
          <div><span>BONUS SPINS</span><strong>{bonusSpins}</strong></div>
          <div><span>TOTAL SPINS</span><strong>{totalSpins}</strong></div>
        </div>
        <button className="earn-button" onClick={earnDemoSpin}>＋ ADD TEST BONUS SPIN</button>
        {wins.length > 0 && <div className="win-list"><strong>LAST SPIN WINS</strong>{wins.map((w, i) => <div key={`${w.symbol.id}-${i}`}>{w.symbol.name} · {w.count} {w.direction} <b>+{w.reward} demo {theme.currency}</b></div>)}</div>}
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
        <div className="paytable-note">3, 4, or 5 matching symbols in a straight row or column. Storm Shadow is WILD. 4 Free Spin symbols anywhere award 6 free spins, 5 or more award 10. 3 Jars anywhere wins a jar of Fruity Puppy. Winning symbols cascade and the multiplier rises.</div>
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

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createGameAudio } from "./audio.js";
import { SymbolTile } from "./SymbolTile.jsx";
import { evaluateDemo, PAYTABLE } from "./evaluate.js";

function VideoOverlay({ src, durationMs = 12000, onClose }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const watchdog = window.setTimeout(onClose, durationMs + 3500);
    return () => window.clearTimeout(watchdog);
  }, [src, durationMs, onClose]);
  return (
    <div className={ready ? "win-video-overlay is-ready" : "win-video-overlay"} aria-hidden={!ready}>
      <video src={src} autoPlay playsInline preload="auto"
        onCanPlay={() => setReady(true)} onPlaying={() => setReady(true)}
        onEnded={onClose} onError={onClose} />
    </div>
  );
}
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

  const audioRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);
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
  const [plate, setPlate] = useState(null);
  const wins = useMemo(() => lastWins, [lastWins]);

  useEffect(() => () => audioRef.current?.destroy(), []);

  useEffect(() => {
    if (!plate) return;
    const onKey = (e) => { if (e.key === "Escape") setPlate(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plate]);

  async function toggleSound() {
    if (!audioRef.current) audioRef.current = createGameAudio();
    if (soundOn) {
      audioRef.current.stop();
      setSoundOn(false);
    } else {
      await audioRef.current.start();
      audioRef.current.click();
      setSoundOn(true);
    }
  }

  async function spin() {
    if (spinning || (spins + bonusSpins) <= 0) return;
    // SPIN is a direct browser gesture: unlock audio and start the soundtrack.
    let playAudio = soundOn;
    if (!audioRef.current) audioRef.current = createGameAudio();
    if (!playAudio) {
      await audioRef.current.start();
      audioRef.current.click();
      playAudio = true;
      setSoundOn(true);
    }
    if (playAudio) audioRef.current?.spin();
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
      if (hasWildInWin) {
        setWinVideo({ src: "/assets/videos/wild-win.mp4", durationMs: 9000 });
      } else if (result.freeSpinsAwarded > 0) {
        setWinVideo({ src: "/assets/videos/freespins-win.mp4", durationMs: 11000 });
      } else if (charVideo) {
        setWinVideo({ src: charVideo[0], durationMs: charVideo[1] });
      } else if (wins.length === 0 && !result.freeSpinsAwarded && Math.random() < 0.3) {
        setWinVideo({ src: "/assets/videos/dontbesad-win.mp4", durationMs: 9000 });
      }
      setCredits((n) => n + payout);
      if (free > 0) setBonusSpins((n) => n + free);
      setTotalSpins((n) => n + 1);
      let msg = payout ? `NICE! ${payout} ${theme.currency} DEMO CREDITS` : "NO MATCH THIS TIME — SPIN AGAIN!";
      if (free > 0) msg += `  +${free} FREE SPINS!`;
      if (freeJar) msg = "🎉 FREE JAR OF FRUITY PUPPY! 🎉";
      setMessage(msg);
      if (playAudio) {
        if (freeJar) audioRef.current?.jar();
        else if (payout > 0) audioRef.current?.win(payout >= 100 ? "big" : "small");
        else audioRef.current?.miss();
        if (hasWildInWin) audioRef.current?.wild();
        if (free > 0) audioRef.current?.freeSpins();
        // Let the strongest winning symbol get its own brief musical identity.
        // One signature cue per result keeps the mix exciting instead of noisy.
        if (!freeJar && wins.length > 0) {
          const signatureWin = [...wins].sort((a, b) => b.reward - a.reward)[0];
          audioRef.current?.symbolCue(signatureWin.symbol?.id);
        } else if (!freeJar && free > 0) {
          audioRef.current?.symbolCue("freespin");
        }
      }
      setSpinning(false);
    }, 3400);
  }

  function earnDemoSpin() {
    setBonusSpins((n) => n + 1);
    if (soundOn) audioRef.current?.bonus();
    setMessage("BONUS SPIN ADDED — DEMO ONLY");
  }

  const characters = symbols.filter((s) => s.type === "character");
  const botanicals = symbols.filter((s) => s.type === "botanical");
  const isWin = !spinning && wins.length > 0;

  const paytablePanel = (
    <section className="paytable" id="paytable-panel">
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
                <span>5 <b>{symbol.id === "jar" ? "FREE JAR" : pay[5]}</b></span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="paytable-note">Wins are horizontal or vertical. 3, 4, or 5 matching symbols in a straight row or column. Storm Shadow is WILD. Free Spin symbols award free spins.</div>
    </section>
  );

  const lineupPanel = (
    <section className="symbol-library" id="lineup-panel">
      <div className="library-heading"><div><span className="section-kicker">THE SYMBOL COLLECTION</span><h2>Meet the lineup</h2></div><span className="count-label">{characters.length + botanicals.length} SYMBOLS</span></div>
      <h3>THE CHARACTERS</h3>
      <div className="symbol-roster">{characters.map((symbol) => <SymbolTile key={symbol.id} symbol={symbol} small />)}</div>
      <h3>THE BOTANICALS</h3>
      <div className="symbol-roster">{botanicals.map((symbol) => <SymbolTile key={symbol.id} symbol={symbol} small />)}</div>
    </section>
  );

  // ---- View-only helpers for the always-visible paytable (reads PAYTABLE + theme; no game logic) ----
  const payGroups = (() => {
    const groups = [];
    symbols.filter((s) => s.type !== "scatter").forEach((s) => {
      const pay = PAYTABLE[s.id] || { 3: 5, 4: 12, 5: 30 };
      const key = `${pay[3]}-${pay[4]}-${pay[5]}`;
      const g = groups.find((x) => x.key === key && x.symbols[0].type !== "wild" && s.type !== "wild" && x.symbols[0].id !== "jar" && s.id !== "jar" && x.symbols[0].type !== "token" && s.type !== "token");
      if (g) g.symbols.push(s);
      else groups.push({ key, pay, symbols: [s] });
    });
    return groups.sort((a, b) => b.pay[4] - a.pay[4]);
  })();
  const wildSymbol = symbols.find((s) => s.type === "wild");
  const freeSpinSymbol = symbols.find((s) => s.type === "scatter");
  const payFive = (g) => (g.symbols[0].id === "jar" ? "Jar" : g.pay[5]);
  const groupName = (g) => {
    if (g.symbols.length === 1) return g.symbols[0].name;
    if (g.symbols.every((s) => s.type === "character")) return "Ruch, Erv, Nonna, Fonk, Dinny";
    return g.symbols.map((s) => s.name).join(", ");
  };

  return (
    <>
      {showIntro && <VideoOverlay src="/assets/videos/intro.mp4" durationMs={12000} onClose={() => setShowIntro(false)} />}
      {winVideo && <VideoOverlay src={winVideo.src} durationMs={winVideo.durationMs} onClose={() => setWinVideo(null)} />}
    <main className={`fp ${isWin ? "is-win" : ""} ${spinning ? "is-spinning" : ""}`}>
      <div className="fp-scene" aria-hidden="true" />
      <div className="fp-cab">
        <header className="fp-top">
          <div className="fp-rays" aria-hidden="true" />
          <div className="fp-glow" aria-hidden="true" />
          <svg className="fp-art" viewBox="0 0 390 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
            <path className="hill h1" d="M-10 260 L-10 170 C 60 130 130 150 190 190 C 230 215 260 240 300 260 Z" />
            <path className="hill h2" d="M-10 260 L-10 214 C 50 196 110 206 160 230 C 180 240 196 250 210 260 Z" />
            <circle className="dot d1" cx="28" cy="150" r="5" />
            <circle className="dot d2" cx="150" cy="168" r="3.5" />
            <circle className="dot d3" cx="176" cy="40" r="4" />
          </svg>
          <img className="fp-ipo" src="/assets/cabinet/ipo-cap.webp" alt="Ipo" />
          <h1 className="fp-logo"><span>Fruity</span> <span>Puppy</span></h1>
        </header>

        <section className="fp-screen">
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
          </div>
          <div className="message-bar" aria-live="polite">{message}</div>
        </section>

        <footer className="fp-deck">
          <div className="fp-meter" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ "--i": i }} />)}
          </div>
          <div className="fp-row">
            <div className="fp-stat fp-left"><strong>{spins + bonusSpins}</strong><span>Spins</span></div>
            <button className="spin-button" onClick={spin} disabled={spinning || spins + bonusSpins <= 0}>
              <span>{spinning ? "Spinning" : "Spin"}</span>
            </button>
            <div className="fp-stat fp-right"><strong>{credits.toLocaleString()}</strong><span>{theme.currency} Won</span></div>
          </div>
        </footer>

        <section className="fp-pay" aria-labelledby="fp-pay-title">
          <h2 id="fp-pay-title" className="fp-pay-title">How to win</h2>
          <p className="fp-pay-rule">Match 3, 4 or 5 across, or 3 or 4 down. {wildSymbol?.name} is wild.{freeSpinSymbol && <span className="fp-rule-fs"> 4 {freeSpinSymbol.name} symbols anywhere = 6 spins, 5 = 10.</span>}</p>
          <div className="fp-pay-head" aria-hidden="true"><span /><span>3</span><span>4</span><span>5</span></div>
          <ul className="fp-pay-list">
            {payGroups.map((g) => (
              <li className={`fp-pay-row ${g.symbols[0].type}`} key={g.key + g.symbols[0].id}>
                <span className="fp-pay-icons">{g.symbols.map((s) => <img key={s.id} src={s.image} alt="" />)}</span>
                <span className="fp-pay-name">{groupName(g)}</span>
                <b>{g.pay[3]}</b><b>{g.pay[4]}</b><b className={g.symbols[0].id === "jar" ? "is-jar" : ""}>{payFive(g)}</b>
              </li>
            ))}
            {freeSpinSymbol && (
              <li className="fp-pay-row scatter">
                <span className="fp-pay-icons"><img src={freeSpinSymbol.image} alt="" /></span>
                <span className="fp-pay-name">{freeSpinSymbol.name} anywhere</span>
                <b className="fp-pay-wide">4 = 6 spins, 5 = 10 spins</b>
              </li>
            )}
          </ul>
          <p className="fp-pay-foot">Payouts are demo {theme.currency}. 5 jars in a row wins a free jar of Fruity Puppy.</p>
        </section>
      </div>
    </main>
    </>
  );
}

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
      <div className="fp-scene" aria-hidden="true">
        <i className="fp-bg-cab c1" /><i className="fp-bg-cab c2" /><i className="fp-bg-cab c3" /><i className="fp-bg-cab c4" />
        <i className="fp-floor" />
      </div>
      <div className="fp-cab">
        <header className="fp-top">
          <svg className="fp-art" viewBox="0 0 780 230" preserveAspectRatio="xMinYMax slice" aria-hidden="true">
            <defs>
              <linearGradient id="fpSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff9fd0" /><stop offset=".62" stopColor="#ff6fb8" /><stop offset="1" stopColor="#ff58a8" /></linearGradient>
              <pattern id="fpStripe" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="11" height="22" fill="rgba(255,255,255,.10)" /></pattern>
              <g id="fpLilikoi">
                <circle r="26" fill="#f6c63f" stroke="#7a4a12" strokeWidth="3" />
                <circle r="20" fill="#ffe7a0" />
                <circle r="17" fill="#ffb02e" />
                <g fill="#3b2208"><circle cx="-7" cy="-6" r="2.6" /><circle cx="5" cy="-9" r="2.6" /><circle cx="9" cy="3" r="2.6" /><circle cx="-2" cy="4" r="2.6" /><circle cx="-10" cy="6" r="2.6" /><circle cx="3" cy="11" r="2.6" /><circle cx="-4" cy="-13" r="2.2" /></g>
                <path d="M-14 -12 C -8 -18 0 -19 6 -17" stroke="#fff6c8" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8" />
              </g>
              <g id="fpPapaya">
                <path d="M0 -34 C 16 -34 22 -18 22 -2 C 22 20 12 36 0 36 C -12 36 -22 20 -22 -2 C -22 -18 -16 -34 0 -34 Z" fill="#9bd14a" stroke="#3f7a1e" strokeWidth="3" />
                <path d="M0 -29 C 12 -29 17 -16 17 -2 C 17 17 9 31 0 31 C -9 31 -17 17 -17 -2 C -17 -16 -12 -29 0 -29 Z" fill="#ff8a3d" />
                <path d="M0 -12 C 7 -12 9 -2 9 6 C 9 16 5 22 0 22 C -5 22 -9 16 -9 6 C -9 -2 -7 -12 0 -12 Z" fill="#ffb37a" />
                <g fill="#2a1408"><circle cx="-3" cy="0" r="2.4" /><circle cx="3" cy="3" r="2.4" /><circle cx="-2" cy="8" r="2.4" /><circle cx="4" cy="11" r="2.4" /><circle cx="-3" cy="15" r="2.4" /><circle cx="2" cy="-5" r="2.2" /></g>
              </g>
              <g id="fpHibiscus">
                <g fill="#e0336f" stroke="#8c0f3e" strokeWidth="2.5">
                  <path d="M0 0 C -14 -10 -14 -32 0 -34 C 14 -32 14 -10 0 0 Z" />
                  <path d="M0 0 C -14 -10 -14 -32 0 -34 C 14 -32 14 -10 0 0 Z" transform="rotate(72)" />
                  <path d="M0 0 C -14 -10 -14 -32 0 -34 C 14 -32 14 -10 0 0 Z" transform="rotate(144)" />
                  <path d="M0 0 C -14 -10 -14 -32 0 -34 C 14 -32 14 -10 0 0 Z" transform="rotate(216)" />
                  <path d="M0 0 C -14 -10 -14 -32 0 -34 C 14 -32 14 -10 0 0 Z" transform="rotate(288)" />
                </g>
                <circle r="8" fill="#8c0f3e" />
                <path d="M0 0 L 10 -20" stroke="#ffe36a" strokeWidth="3" strokeLinecap="round" />
                <circle cx="10" cy="-21" r="3.5" fill="#ffe36a" />
              </g>
              <g id="fpBean">
                <path d="M-40 6 C -30 -14 24 -16 42 -6 C 30 10 -24 18 -40 6 Z" fill="#7cc04a" stroke="#2f6e1c" strokeWidth="3" />
                <g fill="#ffffff" stroke="#d9d4c4" strokeWidth="1.5"><ellipse cx="-22" cy="1" rx="8" ry="6" /><ellipse cx="-7" cy="-1" rx="8" ry="6.5" /><ellipse cx="8" cy="-2" rx="8" ry="6.5" /><ellipse cx="23" cy="-3" rx="7" ry="5.5" /></g>
              </g>
              <g id="fpMint">
                <path d="M0 34 L 0 -26" stroke="#2f7a3a" strokeWidth="3.5" strokeLinecap="round" />
                <g fill="#4cc463" stroke="#2f7a3a" strokeWidth="2.5">
                  <path d="M0 -24 C -8 -36 8 -44 10 -34 C 12 -26 6 -22 0 -24 Z" />
                  <path d="M0 -8 C -22 -10 -26 -28 -12 -28 C -4 -26 -2 -16 0 -8 Z" />
                  <path d="M0 -8 C 22 -10 26 -28 12 -28 C 4 -26 2 -16 0 -8 Z" />
                  <path d="M0 12 C -24 12 -30 -8 -14 -8 C -4 -6 -2 4 0 12 Z" />
                  <path d="M0 12 C 24 12 30 -8 14 -8 C 4 -6 2 4 0 12 Z" />
                </g>
              </g>
              <g id="fpAloe" fill="#5fc28a" stroke="#226e46" strokeWidth="2.5" strokeLinejoin="round">
                <path d="M-4 30 C -30 0 -46 -10 -52 -14 C -36 -12 -18 0 4 26 Z" />
                <path d="M4 30 C 30 0 46 -10 52 -14 C 36 -12 18 0 -4 26 Z" />
                <path d="M-6 30 C -18 -6 -20 -30 -18 -44 C -10 -30 -2 -6 4 28 Z" />
                <path d="M6 30 C 18 -6 20 -30 18 -44 C 10 -30 2 -6 -4 28 Z" />
                <path d="M-4 30 C -4 -10 -2 -36 0 -50 C 2 -36 4 -10 4 30 Z" />
                <path d="M-6 30 C -26 18 -40 16 -48 16 C -36 24 -20 30 -6 34 Z" />
                <path d="M6 30 C 26 18 40 16 48 16 C 36 24 20 30 6 34 Z" />
              </g>
              <path id="fpSpark" d="M0 -10 C 1.5 -2 2 -1.5 10 0 C 2 1.5 1.5 2 0 10 C -1.5 2 -2 1.5 -10 0 C -2 -1.5 -1.5 -2 0 -10 Z" />
            </defs>
            <rect width="780" height="230" fill="url(#fpSky)" />
            <rect width="780" height="230" fill="url(#fpStripe)" />
            <path className="cloud c-back" d="M-10 230 L-10 170 C 10 150 40 152 52 166 C 66 146 100 148 110 168 C 128 156 150 162 156 178 C 176 168 204 176 206 196 C 226 190 246 200 248 230 Z" />
            <path className="cloud c-front" d="M-10 230 L-10 196 C 8 184 30 186 40 198 C 54 186 80 188 88 204 C 104 196 124 202 128 216 C 140 212 154 218 158 230 Z" />
            <path className="cloud c-back" d="M250 230 C 262 206 290 204 302 216 C 314 200 344 200 356 214 C 370 204 392 206 410 216 C 430 200 460 202 470 218 C 480 210 500 212 506 230 Z" />
            <path className="cloud c-back" d="M532 230 C 540 200 572 196 584 210 C 598 184 640 186 650 206 C 664 190 700 192 708 210 C 724 196 760 196 790 210 L 790 230 Z" />
            <path className="cloud c-front" d="M600 230 C 612 210 640 210 650 222 C 662 206 696 206 704 222 C 716 212 744 212 790 220 L 790 230 Z" />
            <use href="#fpAloe" transform="translate(736 182) scale(.85)" />
            <use href="#fpHibiscus" transform="translate(664 206) rotate(-10) scale(.6)" />
            <use href="#fpBean" transform="translate(744 96) rotate(-62) scale(.62)" />
            <use href="#fpLilikoi" transform="translate(598 210) scale(.62)" />
            <use href="#fpLilikoi" transform="translate(34 204) scale(.82)" />
            <use href="#fpPapaya" transform="translate(110 206) rotate(64) scale(.72)" />
            <use href="#fpMint" transform="translate(186 200) rotate(14) scale(.8)" />
            <use href="#fpHibiscus" transform="translate(262 206) rotate(18) scale(.62)" />
            <use href="#fpBean" transform="translate(340 214) rotate(-8) scale(.7)" />
            <g className="spark"><use href="#fpSpark" transform="translate(196 28) scale(1.1)" /><use href="#fpSpark" transform="translate(150 132) scale(.8)" /><use href="#fpSpark" transform="translate(16 108) scale(.7)" /><use href="#fpSpark" transform="translate(222 108) scale(.6)" /><use href="#fpSpark" transform="translate(92 120) scale(.55)" /><use href="#fpSpark" transform="translate(690 120) scale(1)" /><use href="#fpSpark" transform="translate(760 60) scale(.7)" /><use href="#fpSpark" transform="translate(580 150) scale(.6)" /></g>
            <g className="dots"><circle cx="120" cy="150" r="3" /><circle cx="210" cy="64" r="3.5" /><circle cx="14" cy="22" r="2.5" /><circle cx="600" cy="110" r="3" /><circle cx="710" cy="40" r="3" /></g>
          </svg>
          <img className="fp-ipo" src="/assets/cabinet/ipo-cap.webp" alt="Ipo" />
          <div className="fp-lockup"><p className="fp-tag fp-tag-top">spin to win</p><h1 className="fp-logo"><span>Fruity</span> <span>Puppy</span></h1><p className="fp-tag fp-tag-bot">+ kudokens</p></div>
        </header>

        <div className="fp-body">
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
          <p className="fp-jar-call">If you win a jar, screenshot it and send it to us!</p>
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
      </div>
    </main>
    </>
  );
}

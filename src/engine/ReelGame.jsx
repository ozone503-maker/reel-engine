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

  return (
    <>
      {showIntro && <VideoOverlay src="/assets/videos/intro.mp4" durationMs={12000} onClose={() => setShowIntro(false)} />}
      {winVideo && <VideoOverlay src={winVideo.src} durationMs={winVideo.durationMs} onClose={() => setWinVideo(null)} />}
    <main className={`arcade-room ${isWin ? "is-win" : ""} ${spinning ? "is-spinning" : ""}`}>
      <div className="cab-scene">
        <div className="cab-body">
          <header className="cab-marquee">
            <div className="marquee-channel">
              <div className="marquee-kicker">
                <div className="brand-mark"><span className="paw">✿</span></div>
                <div className="hero-tagline">play to win a jar of</div>
              </div>
              <div className="marquee-logo">
                <span className="logo-word">FRUITY</span>
                <img className="marquee-ipo" src="/assets/cabinet/ipo-face.webp" alt="" />
                <span className="logo-word">PUPPY</span>
              </div>
            </div>
          </header>

          <div className="cab-speaker-bar" aria-hidden="true">
            <span className="speaker" /><span className="speaker" />
          </div>

          <section className="cab-monitor">
            <div className="bezel">
              <div className={`crt ${spinning ? "is-spinning" : ""}`}>
              <div className="crt-game">
                <div className="crt-hud">
                  <div className="wallet-card"><span>DEMO {theme.currency} CREDITS</span><strong>{credits.toLocaleString()}</strong></div>
                  <div className="stats-row">
                    <div><span>DAILY SPINS</span><strong>{spins}</strong></div>
                    <div><span>BONUS SPINS</span><strong>{bonusSpins}</strong></div>
                    <div><span>TOTAL SPINS</span><strong>{totalSpins}</strong></div>
                  </div>
                </div>
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
                <div className="message-bar">{message}</div>
                {wins.length > 0 && <div className="win-list"><strong>LAST SPIN WINS</strong>{wins.map((w) => <div key={w.symbol.id}>{w.symbol.name} · {w.count} {w.direction} <b>+{w.reward} demo {theme.currency}</b></div>)}</div>}
              </div>
              </div>
            </div>
          </section>

          <div className="control-panel">
            <div className="panel-overlay">
              <div className="joystick" aria-hidden="true">
                <span className="joy-base" />
                <span className="joy-shaft" />
                <span className="joy-ball" />
              </div>
              <div className="button-bank">
                <button className="sound-toggle" type="button" onClick={toggleSound} aria-pressed={soundOn}>
                  <span>{soundOn ? "♫ SOUND ON" : "♫ SOUND OFF"}</span>
                </button>
                <button className="spin-button" onClick={spin} disabled={spinning || spins + bonusSpins <= 0}>
                  <span>{spinning ? "SPINNING…" : "SPIN"}</span><small>{spins + bonusSpins} SPINS AVAILABLE</small>
                </button>
                <button className="plate-btn plate-btn-pay" type="button" aria-pressed={plate === "paytable"} onClick={() => setPlate((p) => p === "paytable" ? null : "paytable")}>PAYTABLE</button>
                <button className="plate-btn plate-btn-lineup" type="button" aria-pressed={plate === "lineup"} onClick={() => setPlate((p) => p === "lineup" ? null : "lineup")}>Meet the lineup</button>
                <button className="earn-button" onClick={earnDemoSpin}>＋ ADD TEST BONUS SPIN</button>
              </div>
            </div>
          </div>

          <div className="coin-door">
            <footer><span>REEL ENGINE</span><span>THEME: {theme.name} · BUILD 0.1</span></footer>
          </div>
          <div className="kick-plate" aria-hidden="true" />
        </div>
      </div>

      {plate && (
        <div className="attract-overlay" onClick={() => setPlate(null)}>
          <div
            className="attract-screen"
            role="dialog"
            aria-modal="true"
            aria-labelledby={plate === "paytable" ? "paytable-panel" : "lineup-panel"}
            onClick={(e) => e.stopPropagation()}
          >
            {plate === "paytable" ? paytablePanel : lineupPanel}
          </div>
        </div>
      )}
    </main>
    </>
  );
}

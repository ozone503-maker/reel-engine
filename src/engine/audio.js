// Original Fruity Puppy Tropical Funk Arcade score.
// Web Audio synthesis keeps the soundtrack lightweight and requires no external audio files.
export function createGameAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return { start() {}, stop() {}, spin() {}, win() {}, bonus() {}, miss() {}, destroy() {} };

  let ctx;
  let master;
  let musicGain;
  let scheduler;
  let step = 0;
  let nextTime = 0;
  let isRunning = false;
  let noiseBuffer;

  const bpm = 112;
  const sixteenth = 60 / bpm / 4;
  const chords = [
    [48, 52, 55, 59], // Cmaj7
    [45, 48, 52, 55], // Am7
    [41, 45, 48, 52], // Fmaj7
    [43, 47, 50, 53], // G7
  ];
  const bassRoots = [36, 33, 29, 31];
  const lead = [72, null, 76, 79, null, 76, 74, null, 72, null, 67, 72, null, 74, 76, null];

  function init() {
    if (ctx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.72;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.22;
    musicGain.connect(master);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  function envelope(param, time, peak, duration, release = 0.12) {
    param.cancelScheduledValues(time);
    param.setValueAtTime(0.0001, time);
    param.linearRampToValueAtTime(peak, time + Math.min(0.012, duration * 0.2));
    param.exponentialRampToValueAtTime(0.0001, time + duration + release);
  }

  function tone(freq, time, duration, type, volume, destination = musicGain, detune = 0) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(detune, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  function noise(time, duration, volume, highpass, destination = musicGain) {
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = highpass;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    src.start(time);
    src.stop(time + duration + 0.01);
  }

  function kick(time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(125, time);
    osc.frequency.exponentialRampToValueAtTime(43, time + 0.13);
    gain.gain.setValueAtTime(0.52, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  function chord(time, notes, volume = 0.045) {
    notes.forEach((midi) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      tone(freq, time, 0.16, "triangle", volume, musicGain, -4);
      tone(freq * 2, time + 0.006, 0.11, "sine", volume * 0.22, musicGain, 3);
    });
  }

  function scheduleStep(at, index) {
    const barStep = index % 16;
    const bar = Math.floor(index / 16) % 4;
    if (barStep === 0 || barStep === 8) kick(at);
    if (barStep === 4 || barStep === 12) noise(at, 0.12, 0.12, 1500);
    if (barStep % 2 === 0) noise(at, 0.035, barStep % 4 === 2 ? 0.035 : 0.055, 7000);
    if ([0, 6, 8, 14].includes(barStep)) {
      const root = bassRoots[bar];
      const note = root + (barStep === 6 || barStep === 14 ? 7 : 0);
      tone(440 * Math.pow(2, (note - 69) / 12), at, 0.22, "sawtooth", 0.075);
    }
    if (barStep === 0 || barStep === 6 || barStep === 10 || barStep === 14) {
      chord(at, chords[bar], barStep === 0 ? 0.038 : 0.025);
    }
    const melodyNote = lead[barStep];
    if (melodyNote && (bar !== 3 || barStep < 12)) {
      const freq = 440 * Math.pow(2, (melodyNote - 69) / 12);
      tone(freq, at, 0.19, "sine", 0.052);
      tone(freq * 2.01, at, 0.11, "triangle", 0.012);
    }
    if (barStep === 15) noise(at, 0.08, 0.025, 4500);
  }

  function schedule() {
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(nextTime, step);
      nextTime += sixteenth;
      step = (step + 1) % 64;
    }
  }

  async function start() {
    init();
    if (ctx.state === "suspended") await ctx.resume();
    if (isRunning) return;
    isRunning = true;
    nextTime = ctx.currentTime + 0.06;
    scheduler = window.setInterval(schedule, 25);
  }

  function stop() {
    isRunning = false;
    if (scheduler) window.clearInterval(scheduler);
    scheduler = null;
    if (musicGain && ctx) {
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
    }
  }

  async function resumeMusic() {
    await start();
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0.22, ctx.currentTime, 0.3);
  }

  function cue(notes, duration = 0.16, type = "sine", volume = 0.12) {
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime + 0.015;
    notes.forEach((midi, i) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      tone(freq, now + i * 0.075, duration, type, volume);
    });
  }

  return {
    start: resumeMusic,
    stop,
    spin() {
      cue([60, 67, 72], 0.09, "triangle", 0.08);
    },
    win() {
      cue([72, 76, 79, 84], 0.24, "sine", 0.15);
    },
    bonus() {
      cue([60, 67, 72, 76, 79, 84], 0.32, "triangle", 0.16);
    },
    miss() {
      cue([67, 64], 0.12, "sine", 0.045);
    },
    destroy() {
      stop();
      if (ctx && ctx.state !== "closed") ctx.close();
    },
  };
}

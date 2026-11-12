// Original Fruity Puppy arcade audio: Tropical Funk score plus layered, synthesized game effects.
export function createGameAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return { start() {}, stop() {}, spin() {}, reelStop() {}, win() {}, bonus() {}, miss() {}, click() {}, wild() {}, jar() {}, freeSpins() {}, destroy() {} };

  let ctx, master, musicGain, sfxGain, scheduler, step = 0, nextTime = 0, isRunning = false, noiseBuffer;
  const bpm = 112;
  const sixteenth = 60 / bpm / 4;
  const chords = [[48,52,55,59],[45,48,52,55],[41,45,48,52],[43,47,50,53]];
  const bassRoots = [36,33,29,31];
  const lead = [72,null,76,79,null,76,74,null,72,null,67,72,null,74,76,null];

  function init() {
    if (ctx) return;
    ctx = new AudioCtx();
    master = ctx.createGain(); master.gain.value = 0.78; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.82; sfxGain.connect(master);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i=0;i<data.length;i++) data[i] = Math.random()*2-1;
  }
  const hz = (m) => 440 * Math.pow(2,(m-69)/12);

  function tone(freq, time, duration, type="sine", volume=0.1, dest=sfxGain, endFreq=null) {
    const osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.type=type; osc.frequency.setValueAtTime(freq,time);
    if(endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq,time+duration);
    gain.gain.setValueAtTime(0.0001,time);
    gain.gain.linearRampToValueAtTime(volume,time+Math.min(0.012,duration*0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001,time+duration);
    osc.connect(gain); gain.connect(dest); osc.start(time); osc.stop(time+duration+0.025);
  }
  function noise(time,duration,volume,cutoff=5000,dest=sfxGain) {
    const src=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
    src.buffer=noiseBuffer; filter.type="highpass"; filter.frequency.value=cutoff;
    gain.gain.setValueAtTime(volume,time); gain.gain.exponentialRampToValueAtTime(0.0001,time+duration);
    src.connect(filter); filter.connect(gain); gain.connect(dest); src.start(time); src.stop(time+duration+0.01);
  }
  function kick(time,dest=musicGain,volume=0.45) {
    const osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.type="sine"; osc.frequency.setValueAtTime(130,time); osc.frequency.exponentialRampToValueAtTime(42,time+0.14);
    gain.gain.setValueAtTime(volume,time); gain.gain.exponentialRampToValueAtTime(0.0001,time+0.2);
    osc.connect(gain); gain.connect(dest); osc.start(time); osc.stop(time+0.22);
  }
  function chord(time,notes,volume=0.035) {
    notes.forEach(m=>{tone(hz(m),time,0.16,"triangle",volume,musicGain);tone(hz(m+12),time+0.008,0.12,"sine",volume*0.2,musicGain);});
  }
  function scheduleStep(at,index) {
    const p=index%16, bar=Math.floor(index/16)%4;
    if(p===0||p===8) kick(at,musicGain,0.34);
    if(p===4||p===12) noise(at,0.11,0.075,1400,musicGain);
    if(p%2===0) noise(at,0.03,p%4===2?0.025:0.04,7200,musicGain);
    if([0,6,8,14].includes(p)) tone(hz(bassRoots[bar]+([6,14].includes(p)?7:0)),at,0.22,"sawtooth",0.055,musicGain);
    if([0,6,10,14].includes(p)) chord(at,chords[bar],p===0?0.033:0.021);
    if(lead[p] && (bar!==3||p<12)) {tone(hz(lead[p]),at,0.18,"sine",0.045,musicGain);tone(hz(lead[p]+12),at,0.1,"triangle",0.01,musicGain);}
    if(p===15) noise(at,0.07,0.02,4500,musicGain);
  }
  function schedule() {
    while(nextTime<ctx.currentTime+0.12){scheduleStep(nextTime,step);nextTime+=sixteenth;step=(step+1)%64;}
  }
  async function start() {
    init(); if(ctx.state==="suspended") await ctx.resume();
    if(!isRunning){isRunning=true;nextTime=ctx.currentTime+0.05;scheduler=window.setInterval(schedule,25);}
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0.2,ctx.currentTime,0.35);
  }
  function stop() {
    isRunning=false; if(scheduler) window.clearInterval(scheduler); scheduler=null;
    if(ctx&&musicGain) musicGain.gain.setTargetAtTime(0.0001,ctx.currentTime,0.12);
  }
  function sequence(notes,{spacing=0.075,duration=0.2,volume=0.13,type="sine",dest=sfxGain}={}) {
    if(!ctx||ctx.state!=="running")return;
    const now=ctx.currentTime+0.012;
    notes.forEach((n,i)=>tone(hz(n),now+i*spacing,duration,type,volume,dest));
  }
  function click(){if(!ctx||ctx.state!=="running")return;const t=ctx.currentTime+0.005;tone(1050,t,0.035,"sine",0.055);tone(1550,t+0.012,0.025,"sine",0.025);}
  function spin(){
    if(!ctx||ctx.state!=="running")return;
    const t=ctx.currentTime+0.015;
    noise(t,0.45,0.11,900);
    tone(180,t,0.52,"sawtooth",0.055,sfxGain,620);
    tone(420,t+0.05,0.35,"triangle",0.045,sfxGain,180);
    // Rapid, rising reel chatter, followed by five distinct mechanical landing clicks.
    for(let i=0;i<22;i++){
      const at=t+0.2+i*0.105;
      tone(650+i*24,at,0.025,"square",0.018);
      if(i%2===0) noise(at,0.018,0.018,6500);
    }
    for(let i=0;i<5;i++){
      const at=t+2.55+i*0.13;
      tone(150+i*17,at,0.09,"triangle",0.14,sfxGain,65+i*5);
      noise(at,0.045,0.07,1800);
      tone(900+i*85,at+0.035,0.045,"sine",0.045);
    }
    sequence([60,67,72],{spacing:0.035,duration:0.09,volume:0.07,type:"triangle"});
  }
  function reelStop(index=0){
    if(!ctx||ctx.state!=="running")return;
    const t=ctx.currentTime+0.005;
    tone(155+index*13,t,0.075,"triangle",0.12,sfxGain,70);
    noise(t,0.04,0.06,1600);
    tone(740+index*90,t+0.025,0.055,"sine",0.035);
  }
  function win(level="small"){
    if(!ctx||ctx.state!=="running")return;
    if(level==="jackpot"){sequence([60,64,67,72,76,79,84,88],{spacing:0.11,duration:0.36,volume:0.16});kick(ctx.currentTime+0.02,sfxGain,0.35);noise(ctx.currentTime+0.3,0.7,0.11,4200);}
    else if(level==="big"){sequence([67,72,76,79,84,88],{spacing:0.095,duration:0.28,volume:0.14});noise(ctx.currentTime+0.22,0.35,0.065,5000);}
    else sequence([72,76,79,84],{spacing:0.075,duration:0.22,volume:0.12});
    tone(1100,ctx.currentTime+0.02,0.09,"sine",0.035);
  }
  function bonus(){if(!ctx||ctx.state!=="running")return;sequence([60,67,72,76,79,84,88],{spacing:0.09,duration:0.3,volume:0.15,type:"triangle"});noise(ctx.currentTime+0.18,0.5,0.08,3600);}
  function miss(){if(!ctx||ctx.state!=="running")return;tone(330,ctx.currentTime+0.01,0.13,"sine",0.05);tone(294,ctx.currentTime+0.13,0.18,"triangle",0.045);}
  function wild(){if(!ctx||ctx.state!=="running")return;const t=ctx.currentTime+0.01; tone(180,t,0.35,"sawtooth",0.09,sfxGain,1450);sequence([72,79,84],{spacing:0.045,duration:0.2,volume:0.1,type:"triangle"});}
  function jar(){if(!ctx||ctx.state!=="running")return;const t=ctx.currentTime+0.01;sequence([72,76,79,84,88,91,96],{spacing:0.12,duration:0.42,volume:0.19});noise(t+0.3,0.9,0.13,3000);kick(t+0.08,sfxGain,0.5);tone(1320,t+0.7,0.65,"sine",0.12);}
  function freeSpins(){if(!ctx||ctx.state!=="running")return;sequence([67,72,76,79,84],{spacing:0.08,duration:0.22,volume:0.14});for(let i=0;i<4;i++)tone(1200+i*170,ctx.currentTime+0.2+i*0.11,0.09,"sine",0.045);}

  // Signature cues use only the symbols in the Fruity Puppy theme.
  // Each cue has its own rhythm, register, and synthesis texture.
  function symbolCue(id) {
    if(!ctx||ctx.state!=="running")return;
    const t=ctx.currentTime+0.035;
    const cues = {
      ipo: {notes:[84,79,88],gap:0.105,type:"sine",dur:0.24,vol:0.105},
      ruch: {notes:[67,74,79,74],gap:0.075,type:"triangle",dur:0.13,vol:0.09},
      erv: {notes:[48,55,60],gap:0.14,type:"sawtooth",dur:0.19,vol:0.075},
      nonna: {notes:[60,60,72,67],gap:0.09,type:"square",dur:0.11,vol:0.065},
      fonk: {notes:[72,69,77,84],gap:0.065,type:"sawtooth",dur:0.12,vol:0.07},
      dinny: {notes:[55,62,67,74],gap:0.12,type:"triangle",dur:0.2,vol:0.085},
      lilikoi: {notes:[88,84,91],gap:0.09,type:"sine",dur:0.28,vol:0.085},
      papaya: {notes:[60,67,72],gap:0.12,type:"triangle",dur:0.24,vol:0.09},
      "cranberry-hibiscus": {notes:[76,79,83,88],gap:0.085,type:"sine",dur:0.25,vol:0.085},
      "ice-cream-bean": {notes:[72,84,79],gap:0.16,type:"sine",dur:0.34,vol:0.075},
      spearmint: {notes:[91,96,100],gap:0.075,type:"triangle",dur:0.16,vol:0.075},
      "aloe-vera": {notes:[64,69,76],gap:0.15,type:"sine",dur:0.3,vol:0.075},
      kdu: {notes:[60,72,79,84],gap:0.095,type:"square",dur:0.17,vol:0.08},
      "wild-storm": {notes:[43,55,67,79],gap:0.055,type:"sawtooth",dur:0.15,vol:0.07},
      freespin: {notes:[67,72,79,84,91],gap:0.07,type:"sine",dur:0.22,vol:0.08},
      jar: {notes:[72,76,84,91],gap:0.13,type:"sine",dur:0.32,vol:0.08}
    };
    const cue=cues[id];
    if(!cue)return;
    cue.notes.forEach((note,i)=>{
      const at=t+i*cue.gap;
      tone(hz(note),at,cue.dur,cue.type,cue.vol);
      if(id==="ipo"||id==="lilikoi"||id==="cranberry-hibiscus"||id==="spearmint")
        tone(hz(note+12),at+0.018,cue.dur*0.62,"sine",cue.vol*0.22);
      if(id==="ruch"||id==="dinny") noise(at,0.035,cue.vol*0.22,5200);
    });
    if(id==="papaya"||id==="lilikoi"||id==="cranberry-hibiscus") {
      noise(t+0.025,0.12,0.035,2600);
    }
    if(id==="kdu") {
      tone(1320,t+0.12,0.22,"sine",0.055);
    }
  }
\n  return {start,stop,click,spin,reelStop,win,bonus,miss,wild,jar,freeSpins,symbolCue,destroy(){stop();if(ctx&&ctx.state!=="closed")ctx.close();}};
}

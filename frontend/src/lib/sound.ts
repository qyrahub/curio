// Lightweight game audio via the Web Audio API — no asset files needed.
// SFX always available; a gentle music loop can be toggled. A single mute
// switch controls everything and is remembered for the session.

let ctx: AudioContext | null = null;
let muted = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); }
    catch { return null; }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, dur = 0.12, type: OscillatorType = "sine", vol = 0.18, when = 0) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.03);
}

export const sfx = {
  tap: () => tone(520, 0.07, "triangle", 0.12),
  pop: () => tone(640 + Math.random() * 260, 0.09, "sine", 0.22),
  bounce: () => tone(300 + Math.random() * 130, 0.06, "square", 0.14),
  shoot: () => { tone(880, 0.05, "sawtooth", 0.1); tone(440, 0.06, "square", 0.08, 0.02); },
  good: () => { tone(660, 0.1, "square", 0.13); tone(880, 0.12, "square", 0.13, 0.08); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", 0.16, i * 0.12)),
  lose: () => [392, 294, 220].forEach((f, i) => tone(f, 0.22, "sawtooth", 0.13, i * 0.13)),
  wrong: () => tone(170, 0.2, "sawtooth", 0.13),
  select: () => tone(440, 0.08, "sine", 0.12),
};

const MELODY = [523, 587, 659, 784, 659, 587, 523, 440, 494, 587, 523, 659];
export function startMusic() {
  const c = ac(); if (!c || muted) return;
  stopMusic();
  let i = 0;
  musicTimer = setInterval(() => {
    if (muted) return;
    tone(MELODY[i % MELODY.length], 0.24, "sine", 0.045);
    if (i % 4 === 0) tone(MELODY[i % MELODY.length] / 2, 0.3, "triangle", 0.03);
    i++;
  }, 430);
}
export function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

export function playNote(freq: number, dur = 0.32) { tone(freq, dur, "triangle", 0.2); }

export function isMuted() { return muted; }
export function toggleMute() {
  muted = !muted;
  if (muted) stopMusic();
  return muted;
}

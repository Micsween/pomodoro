// Focus sessions end with a chime recording; breaks end with a short
// synthesized chime (also the fallback if the recording can't play).
// Levels are 0–1.
const focusChime = new Audio(`${import.meta.env.BASE_URL}sounds/chime.mp3`);
focusChime.preload = 'auto';
let audioCtx = null;
let previewing = false;   // only a preview gets stopped when the settings card closes

// Browsers only allow audio after a user gesture, so this is called from Start.
export function ensureAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {
    audioCtx = null;
  }
}

export function playChime(finishedPhase, level) {
  previewing = false;   // a real alarm takes over from a preview
  if (finishedPhase === 'focus') {
    focusChime.currentTime = 0;
    focusChime.volume = level;
    focusChime.play().catch(() => playSynthChime(level));
  } else {
    playSynthChime(level);
  }
}

export function previewChime(level) {
  ensureAudio();
  playChime('focus', level);
  previewing = true;
}

export function stopPreview() {
  if (!previewing) return;
  focusChime.pause();
  previewing = false;
}

// Lets the alarm slider change a chime that's already playing.
export function setChimeVolume(level) {
  focusChime.volume = level;
}

function playSynthChime(level) {
  const peak = 0.25 * level;
  if (!audioCtx || peak <= 0) return;   // an exponential ramp can't reach 0
  const now = audioCtx.currentTime;
  [660, 880, 1320].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = now + i * 0.18;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 1);
  });
}

export const PHASES = {
  focus: { label: 'Focus',       minutes: 25 },
  short: { label: 'Short break', minutes: 5 },
  long:  { label: 'Long break',  minutes: 15 },
};
export const SESSIONS_PER_CYCLE = 4;
export const MAX_DURATION_MS = 24 * 3600000;

// MM:SS, or H:MM:SS once there's an hour or more.
export function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = String(Math.floor(totalSeconds / 60) % 60).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// sessionNumber is which focus session (counting from 1) the phase belongs
// to; every SESSIONS_PER_CYCLE-th one is followed by the long break.
export function nextPhaseAfter(phase, sessionNumber) {
  if (phase !== 'focus') return 'focus';
  return sessionNumber % SESSIONS_PER_CYCLE === 0 ? 'long' : 'short';
}

/* ---------- Drag the dot to set the time ---------- */

// Angle is degrees clockwise from 12 o'clock (0 = full ring), rounded to whole seconds.
export function angleToRemainingMs(angle, totalMs) {
  return Math.round(totalMs * (1 - angle / 360) / 1000) * 1000;
}

// Like angleToRemainingMs, but for drag moves, which can't wrap past 12 o'clock.
export function dragAngleToRemainingMs(angle, previousMs, totalMs) {
  const ms = angleToRemainingMs(angle, totalMs);
  // A jump of more than half the ring means the pointer crossed 12 o'clock;
  // pin to whichever end it came from instead of wrapping around.
  if (Math.abs(ms - previousMs) > totalMs / 2) {
    return previousMs < totalMs / 2 ? 0 : totalMs;
  }
  return ms;
}

/* ---------- Timer state ---------- */

export function initialTimerState() {
  const durations = Object.fromEntries(Object.entries(PHASES).map(([k, p]) => [k, p.minutes * 60000]));
  return {
    phase: 'focus',
    remainingMs: durations.focus,
    endTime: null,        // wall-clock ms when the phase ends; only set while running
    running: false,
    completedFocus: 0,
    awaitingNext: null,   // the phase to start once the ready button is pressed, after one ends
    // Length of each phase in ms; starts from PHASES and can be changed by clicking the time.
    durations,
    finished: null,       // { phase, count } for the most recent phase that ran out
  };
}

function pause(state, now) {
  if (!state.running) return state;
  return { ...state, running: false, endTime: null, remainingMs: Math.max(0, state.endTime - now) };
}

function start(state, now) {
  if (state.running) return state;
  return { ...state, running: true, endTime: now + state.remainingMs };
}

function setPhase(state, phase, now) {
  return { ...pause(state, now), awaitingNext: null, phase, remainingMs: state.durations[phase] };
}

// Remaining time is derived from the wall clock, so throttled background
// tabs can't make the countdown drift.
export function timerReducer(state, action) {
  const { now } = action;
  switch (action.type) {
    case 'start':
      return start(state, now);
    case 'pause':
      return pause(state, now);
    case 'setPhase':
      return setPhase(state, action.phase, now);
    case 'reset':
      return setPhase(state, state.phase, now);
    // A skipped session isn't counted as completed, but it still takes its place in the cycle.
    case 'skip':
      return setPhase(state, nextPhaseAfter(state.phase, state.completedFocus + 1), now);
    case 'startNext':
      return start(setPhase(state, state.awaitingNext, now), now);
    case 'setRemaining':
      return { ...state, remainingMs: Math.min(state.durations[state.phase], Math.max(0, action.ms)) };
    // Applies a typed length to the current phase, so Reset comes back to it too.
    case 'setDuration':
      return { ...state, durations: { ...state.durations, [state.phase]: action.ms }, remainingMs: action.ms };
    case 'tick': {
      if (!state.running) return state;
      const remainingMs = state.endTime - now;
      if (remainingMs > 0) return { ...state, remainingMs };
      // The finished phase stays on screen as a filled circle until the ready
      // button is pressed; only then does the next phase load and start.
      const completedFocus = state.completedFocus + (state.phase === 'focus' ? 1 : 0);
      return {
        ...state,
        running: false,
        endTime: null,
        remainingMs: 0,
        completedFocus,
        awaitingNext: nextPhaseAfter(state.phase, completedFocus),   // already counts this one
        finished: { phase: state.phase, count: (state.finished?.count ?? 0) + 1 },
      };
    }
    default:
      throw new Error(`Unknown timer action: ${action.type}`);
  }
}

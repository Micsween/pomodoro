import { describe, expect, it } from 'vitest';
import {
  angleToRemainingMs, dragAngleToRemainingMs, formatTime, initialTimerState, nextPhaseAfter, timerReducer,
} from './timer.js';

describe('formatTime', () => {
  it('shows MM:SS, rounding partial seconds up', () => {
    expect(formatTime(25 * 60000)).toBe('25:00');
    expect(formatTime(1001)).toBe('00:02');
    expect(formatTime(-500)).toBe('00:00');
  });
  it('adds hours once there is an hour or more', () => {
    expect(formatTime(3600000 + 61000)).toBe('1:01:01');
  });
});

describe('nextPhaseAfter', () => {
  it('follows every 4th focus session with a long break', () => {
    expect([1, 2, 3, 4, 5].map(n => nextPhaseAfter('focus', n))).toEqual(['short', 'short', 'short', 'long', 'short']);
  });
  it('goes back to focus after either break', () => {
    expect(nextPhaseAfter('short', 1)).toBe('focus');
    expect(nextPhaseAfter('long', 4)).toBe('focus');
  });
});

describe('ring angles', () => {
  const total = 60000;
  it('maps clockwise angle from 12 o’clock to time left', () => {
    expect(angleToRemainingMs(0, total)).toBe(60000);
    expect(angleToRemainingMs(90, total)).toBe(45000);
    expect(angleToRemainingMs(180, total)).toBe(30000);
  });
  it('pins instead of wrapping when a drag crosses 12 o’clock', () => {
    expect(dragAngleToRemainingMs(1, 1000, total)).toBe(0);         // nearly empty, dragged clockwise past 12
    expect(dragAngleToRemainingMs(359, 60000, total)).toBe(60000);  // full, dragged anticlockwise past 12
    expect(dragAngleToRemainingMs(100, 45000, total)).toBe(43000);  // an ordinary move
  });
});

describe('timerReducer', () => {
  const at = (state, type, now, extra) => timerReducer(state, { type, now, ...extra });

  it('counts down from the wall clock and pauses with the time left', () => {
    let s = at(initialTimerState(), 'start', 0);
    s = at(s, 'tick', 10000);
    expect(s.remainingMs).toBe(25 * 60000 - 10000);
    s = at(s, 'pause', 20000);
    expect(s).toMatchObject({ running: false, remainingMs: 25 * 60000 - 20000, endTime: null });
  });

  it('finishes a focus phase into the ready state', () => {
    let s = at(initialTimerState(), 'setDuration', 0, { ms: 1000 });
    s = at(s, 'start', 0);
    s = at(s, 'tick', 1000);
    expect(s).toMatchObject({ running: false, remainingMs: 0, completedFocus: 1, awaitingNext: 'short' });
    expect(s.finished).toEqual({ phase: 'focus', count: 1 });
    s = at(s, 'startNext', 5000);
    expect(s).toMatchObject({ phase: 'short', running: true, awaitingNext: null, endTime: 5000 + 5 * 60000 });
  });

  it('remembers a typed length so Reset comes back to it', () => {
    let s = at(initialTimerState(), 'setDuration', 0, { ms: 90000 });
    s = at(s, 'setRemaining', 0, { ms: 10000 });
    s = at(s, 'reset', 0);
    expect(s.remainingMs).toBe(90000);
  });

  it('skips without counting the session', () => {
    let s = at(initialTimerState(), 'skip', 0);
    expect(s).toMatchObject({ phase: 'short', completedFocus: 0 });
    s = { ...s, completedFocus: 3, phase: 'focus' };
    expect(at(s, 'skip', 0).phase).toBe('long');
  });

  it('keeps setRemaining inside the phase length', () => {
    const s = initialTimerState();
    expect(at(s, 'setRemaining', 0, { ms: -5 }).remainingMs).toBe(0);
    expect(at(s, 'setRemaining', 0, { ms: 1e12 }).remainingMs).toBe(25 * 60000);
  });
});

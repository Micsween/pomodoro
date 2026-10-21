import { useCallback, useEffect, useReducer, useRef } from 'react';
import { initialTimerState, timerReducer } from '../lib/timer.js';

// The timer's state plus an act(type, extra) that stamps each action with the
// current time. onFinish(phase) runs once each time a phase runs out.
export function useTimer({ onFinish }) {
  const [state, dispatch] = useReducer(timerReducer, undefined, initialTimerState);
  const act = useCallback((type, extra) => dispatch({ type, now: Date.now(), ...extra }), []);

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => act('tick'), 250);
    return () => clearInterval(id);
  }, [state.running, act]);

  // Kept in a ref so the effect below fires on a finish, not on every new onFinish.
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; });

  useEffect(() => {
    if (state.finished) onFinishRef.current(state.finished.phase);
  }, [state.finished]);

  return [state, act];
}

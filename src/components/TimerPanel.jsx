import { useEffect, useRef } from 'react';
import Ring from './Ring.jsx';
import Settings from './Settings.jsx';
import { useTimer } from '../hooks/useTimer.js';
import { useTimeEditor } from '../hooks/useTimeEditor.js';
import { PHASES, SESSIONS_PER_CYCLE, formatTime } from '../lib/timer.js';
import { ensureAudio } from '../lib/chime.js';

export default function TimerPanel({ onFinish, settings, onSettingChange, pauseVideo, onPauseVideoChange }) {
  const [timer, act] = useTimer({ onFinish });
  const editor = useTimeEditor({ running: timer.running, act });
  const { phase, running, awaitingNext, completedFocus } = timer;
  const text = formatTime(timer.remainingMs);
  const label = PHASES[phase].label;

  // The CSS keys the phase colours and the running/ready looks off the body.
  useEffect(() => {
    document.body.dataset.phase = phase;
    document.body.classList.toggle('running', running);
    document.body.classList.toggle('ready', awaitingNext !== null);
  }, [phase, running, awaitingNext]);

  const startNext = () => {
    ensureAudio();
    act('startNext');
  };

  // Start/Pause, or the ready button while a finished phase is waiting.
  // While a new time is being typed, Start applies it and starts.
  const toggleTimer = () => {
    if (editor.editing) editor.commit(true);
    else if (awaitingNext) startNext();
    else if (running) act('pause');
    else {
      ensureAudio();
      act('start');
    }
  };

  // Space toggles the timer unless something that uses Space has focus.
  const toggleRef = useRef(toggleTimer);
  useEffect(() => { toggleRef.current = toggleTimer; });
  useEffect(() => {
    const onKeyDown = e => {
      if (e.code !== 'Space') return;
      if (e.target.closest('input, textarea, button, video, [contenteditable]')) return;
      e.preventDefault();
      toggleRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const filled = completedFocus % SESSIONS_PER_CYCLE;

  return (
    <section className="panel timer">
      <div className="brand">Pomodoro</div>

      <div className="phases" id="phases">
        {Object.entries(PHASES).map(([key, p]) => (
          <button key={key} data-phase={key} className={key === phase ? 'active' : undefined}
                  onClick={() => act('setPhase', { phase: key })}>
            {p.label}
          </button>
        ))}
      </div>

      <Ring timer={timer} act={act}>
        <div className={`time${text.length > 5 ? ' long' : ''}`} id="time" role="timer" aria-live="off"
             tabIndex={0} title="Click to set the time" hidden={editor.editing}
             onClick={editor.open}
             onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); editor.open(); } }}>
          {text}
        </div>
        <input className="time time-input" id="timeInput" ref={editor.inputRef} type="text" inputMode="numeric"
               hidden={!editor.editing} autoComplete="off" spellCheck="false"
               aria-label="Timer length in hours, minutes and seconds" {...editor.inputProps} />
        <div className="phase-label" id="phaseLabel">{label}</div>
        <button className="btn ready-btn" id="readyBtn" type="button" onClick={startNext}>
          {phase === 'focus' ? 'Break time!' : 'Work time!'}
        </button>
      </Ring>

      <div className="controls">
        <button className="btn" id="resetBtn" title="Reset this phase" onClick={() => act('reset')}>Reset</button>
        {/* Keep focus in the time box when pressing Start mid-edit. Otherwise the box's
            blur would commit and resume the timer first, and the click would then pause it. */}
        <button className="btn primary" id="toggleBtn" onClick={toggleTimer}
                onMouseDown={e => { if (editor.editing) e.preventDefault(); }}>
          {running ? 'Pause' : 'Start'}
        </button>
        <button className="btn" id="skipBtn" title="Skip to the next phase" onClick={() => act('skip')}>Skip</button>
      </div>

      <div className="sessions">
        <div className="dots" id="dots">
          {Array.from({ length: SESSIONS_PER_CYCLE }, (_, i) => (
            <span key={i} className={`dot${i < filled ? ' done' : ''}`}></span>
          ))}
        </div>
        <div id="sessionText">{completedFocus} focus session{completedFocus === 1 ? '' : 's'} completed</div>
      </div>

      <Settings settings={settings} onChange={onSettingChange}
                pauseVideo={pauseVideo} onPauseVideoChange={onPauseVideoChange} />
    </section>
  );
}

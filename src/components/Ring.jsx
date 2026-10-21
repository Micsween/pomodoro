import { useLayoutEffect, useRef } from 'react';
import { angleToRemainingMs, dragAngleToRemainingMs } from '../lib/timer.js';
import { ensureAudio } from '../lib/chime.js';

const RING_CIRCUMFERENCE = 2 * Math.PI * 140;

// The countdown ring. Its dot can be dragged (or the ring clicked) to set the
// time; children are drawn in the middle.
export default function Ring({ timer, act, children }) {
  const { remainingMs, running, endTime } = timer;
  const totalMs = timer.durations[timer.phase];
  const svgRef = useRef(null);
  const progressRef = useRef(null);
  const headRef = useRef(null);
  const dragRef = useRef(null);   // { wasRunning, remainingMs } while the dot is held

  // The emptied part grows clockwise from 12 o'clock: a negative offset slides
  // the dash forward so it starts at the elapsed point, and the dot marks that edge.
  // While running it's redrawn every frame so it glides instead of stepping.
  useLayoutEffect(() => {
    const draw = ms => {
      const elapsed = 1 - Math.max(0, ms) / totalMs;
      progressRef.current.style.strokeDashoffset = -RING_CIRCUMFERENCE * elapsed;
      headRef.current.setAttribute('transform', `rotate(${elapsed * 360} 160 160)`);
    };
    if (!running) {
      draw(remainingMs);
      return;
    }
    let frame;
    const loop = () => {
      draw(endTime - Date.now());
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [running, endTime, remainingMs, totalMs]);

  // Angle of the pointer around the ring's centre, clockwise from 12 o'clock.
  const pointerAngle = e => {
    const box = svgRef.current.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    const deg = Math.atan2(dx, -dy) * 180 / Math.PI;
    return (deg + 360) % 360;
  };

  const setRemaining = ms => {
    dragRef.current.remainingMs = ms;
    act('setRemaining', { ms });
  };

  // Pressing the dot grabs it; pressing elsewhere on the ring jumps the dot
  // there first, and either way you can keep dragging.
  const onPointerDown = e => {
    const onRing = e.target.closest('.ring-hit');
    if (!onRing && !e.target.closest('.ring-handle')) return;
    e.preventDefault();
    svgRef.current.setPointerCapture(e.pointerId);
    const now = Date.now();
    dragRef.current = { wasRunning: running, remainingMs: running ? Math.max(0, endTime - now) : remainingMs };
    act('pause');
    document.body.classList.add('dragging');
    if (onRing) setRemaining(angleToRemainingMs(pointerAngle(e), totalMs));
  };

  const onPointerMove = e => {
    const drag = dragRef.current;
    if (!drag) return;
    const next = dragAngleToRemainingMs(pointerAngle(e), drag.remainingMs, totalMs);
    setRemaining(Math.min(totalMs, Math.max(0, next)));
  };

  const endDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    document.body.classList.remove('dragging');
    if (drag.wasRunning && drag.remainingMs > 0) {
      ensureAudio();
      act('start');
    }
  };

  return (
    <div className="ring-wrap">
      <svg ref={svgRef} viewBox="0 0 320 320" aria-hidden="true"
           onPointerDown={onPointerDown} onPointerMove={onPointerMove}
           onPointerUp={endDrag} onPointerCancel={endDrag}>
        <defs>
          <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx="160" cy="160" r="140" />
        <circle className="ring-progress" id="ring" ref={progressRef} cx="160" cy="160" r="140"
                style={{ strokeDasharray: RING_CIRCUMFERENCE }} />
        <circle className="ring-fill" cx="160" cy="160" r="145" />
        <circle className="ring-hit" cx="160" cy="160" r="140" />
        <g className="ring-handle" id="ringHead" ref={headRef}>
          <circle className="ring-handle-hit" cx="300" cy="160" r="22" />
          <circle className="ring-head" cx="300" cy="160" r="8" />
        </g>
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

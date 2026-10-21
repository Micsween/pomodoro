import { useCallback, useEffect, useRef, useState } from 'react';
import Toggle from './Toggle.jsx';
import { previewChime, setChimeVolume, stopPreview } from '../lib/chime.js';

const GEAR_PATH = 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z';

// A volume slider with its label and percentage. onRelease runs when it's let go.
function VolumeSlider({ id, label, value, onChange, onRelease }) {
  const inputRef = useRef(null);

  // React's onChange fires while dragging; the native change event fires on release.
  useEffect(() => {
    if (!onRelease) return;
    const input = inputRef.current;
    input.addEventListener('change', onRelease);
    return () => input.removeEventListener('change', onRelease);
  }, [onRelease]);

  return (
    <label className="slider-row">
      <span>{label}</span>
      <output id={`${id}Out`}>{value}%</output>
      <input ref={inputRef} type="range" id={id} min="0" max="100" step="1" value={value}
             style={{ '--fill': `${value}%` }}
             onChange={e => onChange(Number(e.target.value))} />
    </label>
  );
}

// The gear in the timer panel's corner and the card it opens.
export default function Settings({ settings, onChange, pauseVideo, onPauseVideoChange }) {
  const [open, setOpen] = useState(false);
  const popRef = useRef(null);
  const btnRef = useRef(null);

  // Closing the card stops a chime that's only being previewed.
  const close = () => {
    stopPreview();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    // Clicking anywhere outside the card closes it.
    const onPointerDown = e => {
      if (popRef.current.contains(e.target) || btnRef.current.contains(e.target)) return;
      close();
    };
    const onKeyDown = e => {
      if (e.key !== 'Escape') return;
      close();
      btnRef.current.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const previewAlarm = useCallback(() => previewChime(settings.alarmVolume / 100), [settings.alarmVolume]);

  return (
    <>
      <div className="settings-pop" id="settingsPop" ref={popRef} hidden={!open}>
        <div className="settings-title">Settings</div>
        {/* Letting go of the alarm slider plays the chime at the new level. */}
        <VolumeSlider id="alarmVolume" label="Alarm volume" value={settings.alarmVolume}
                      onChange={v => { onChange('alarmVolume', v); setChimeVolume(v / 100); }}
                      onRelease={previewAlarm} />
        <VolumeSlider id="videoVolume" label="Video volume" value={settings.videoVolume}
                      onChange={v => onChange('videoVolume', v)} />
        <div className="toggle-row">
          <label className="toggle-label" htmlFor="viewerToggle">Pause video between timers</label>
          <Toggle id="viewerToggle" checked={pauseVideo} onChange={onPauseVideoChange} />
        </div>
      </div>

      <button className="settings-btn" id="settingsBtn" ref={btnRef} type="button" aria-label="Settings"
              aria-expanded={open} aria-controls="settingsPop"
              onClick={() => (open ? close() : setOpen(true))}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d={GEAR_PATH} />
        </svg>
      </button>
    </>
  );
}

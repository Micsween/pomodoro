import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { resolveLink } from '../lib/links.js';
import { readStorage, removeStorage, writeStorage } from '../lib/storage.js';

const STORAGE_KEY = 'focus-studio:last-url';

// The link box and the video area. The parent can call ref.current.pause().
export default function Viewer({ ref, videoVolume }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState({ text: '', error: false });
  const [media, setMedia] = useState(null);   // { kind, src, key } or null for the placeholder
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const ytFrameRef = useRef(null);
  const helloTimerRef = useRef(null);

  /* ---------- Controlling the player ---------- */
  // A YouTube embed with enablejsapi=1 takes commands over postMessage.
  const ytCommand = (func, args = []) => {
    ytFrameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  };

  const volumeRef = useRef(videoVolume);
  const applyVolume = useCallback(() => {
    if (videoRef.current) videoRef.current.volume = volumeRef.current / 100;
    else ytCommand('setVolume', [volumeRef.current]);
  }, []);

  useEffect(() => {
    volumeRef.current = videoVolume;
    applyVolume();
  }, [videoVolume, applyVolume]);

  // Pausing an already-paused video does nothing, so there's no need to track its state.
  useImperativeHandle(ref, () => ({
    pause() {
      if (videoRef.current) videoRef.current.pause();
      else ytCommand('pauseVideo');
    },
  }), []);

  // A freshly loaded player ignores commands until it's ready. Saying "listening"
  // until it answers tells us when it is, so the saved volume can be applied then.
  const awaitReady = frame => {
    let tries = 0;
    clearInterval(helloTimerRef.current);
    helloTimerRef.current = setInterval(() => {
      if (++tries > 40 || !frame.isConnected) return clearInterval(helloTimerRef.current);
      frame.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
    }, 250);
  };

  useEffect(() => {
    const onMessage = e => {
      const frame = ytFrameRef.current;
      if (!frame || e.source !== frame.contentWindow) return;
      let data;
      try { data = JSON.parse(e.data); } catch (err) { return; }
      if (data.event === 'onReady' || data.event === 'initialDelivery') {
        clearInterval(helloTimerRef.current);
        applyVolume();
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(helloTimerRef.current);
    };
  }, [applyVolume]);

  /* ---------- Loading links ---------- */
  const load = useCallback((raw, { remember = true } = {}) => {
    const result = resolveLink(raw, { isFile: location.protocol === 'file:' });
    if (!result) return;
    if (result.error) {
      setStatus({ text: result.error, error: true });
      return;
    }
    // A fresh key remounts the player, even for the same link.
    setMedia({ ...result.media, key: Date.now() });
    setStatus({ text: result.status, error: false });
    if (remember) writeStorage(STORAGE_KEY, result.href);
  }, []);

  useEffect(() => {
    const last = readStorage(STORAGE_KEY);
    if (last) {
      setUrl(last);
      load(last, { remember: false });
    }
  }, [load]);

  const clear = () => {
    setMedia(null);
    setUrl('');
    setStatus({ text: '', error: false });
    removeStorage(STORAGE_KEY);
    inputRef.current.focus();
  };

  return (
    <section className="panel viewer">
      <form className="url-bar" id="urlForm" onSubmit={e => { e.preventDefault(); load(url); }}>
        <input id="urlInput" ref={inputRef} type="text" inputMode="url" autoComplete="off" spellCheck="false"
               placeholder="Paste a YouTube or video link…" value={url}
               onChange={e => setUrl(e.target.value)}
               onPaste={() => {
                 // Pasting into an empty box loads straight away.
                 if (url.trim()) return;
                 setTimeout(() => load(inputRef.current.value), 0);
               }} />
        <button className="btn primary" type="submit">Load</button>
        <button className="btn" type="button" id="clearBtn" onClick={clear}>Clear</button>
      </form>
      <div className={`status${status.error ? ' error' : ''}`} id="status">{status.text}</div>
      <div className="stage" id="stage">
        {!media && (
          <div className="placeholder">
            <div>Paste a YouTube link above to start watching!</div>
          </div>
        )}
        {media?.kind === 'youtube' && (
          <iframe key={media.key} ref={ytFrameRef} src={media.src} data-youtube=""
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
                  onLoad={e => awaitReady(e.currentTarget)} />
        )}
        {/* Unknown sites are sandboxed so they can't navigate this page away. */}
        {media?.kind === 'page' && (
          <iframe key={media.key} src={media.src}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation" />
        )}
        {media?.kind === 'video' && (
          <video key={media.key} src={media.src} controls autoPlay
                 ref={el => {
                   videoRef.current = el;
                   if (el) el.volume = volumeRef.current / 100;
                 }}
                 onError={() => setStatus({
                   text: "That video couldn't be played. The link may be broken or in an unsupported format.",
                   error: true,
                 })} />
        )}
      </div>
    </section>
  );
}

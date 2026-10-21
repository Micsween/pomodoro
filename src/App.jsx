import { useEffect, useRef, useState } from 'react';
import TimerPanel from './components/TimerPanel.jsx';
import Viewer from './components/Viewer.jsx';
import { loadSettings, saveSettings } from './lib/settings.js';
import { playChime } from './lib/chime.js';

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  // Not remembered between visits; it starts off each time.
  const [pauseVideo, setPauseVideo] = useState(false);
  const viewerRef = useRef(null);

  useEffect(() => { saveSettings(settings); }, [settings]);

  // When a timer runs out: chime, and pause the video if that's switched on.
  // The video stays paused until the user plays it again.
  const onFinish = phase => {
    playChime(phase, settings.alarmVolume / 100);
    if (pauseVideo) viewerRef.current?.pause();
  };

  return (
    <main className="app">
      <TimerPanel onFinish={onFinish}
                  settings={settings}
                  onSettingChange={(key, value) => setSettings(s => ({ ...s, [key]: value }))}
                  pauseVideo={pauseVideo}
                  onPauseVideoChange={setPauseVideo} />
      <Viewer ref={viewerRef} videoVolume={settings.videoVolume} />
    </main>
  );
}

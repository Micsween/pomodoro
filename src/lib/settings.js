import { readStorage, writeStorage } from './storage.js';

const SETTINGS_KEY = 'pomodoro:settings';

// Volumes are 0–100 and remembered between visits.
export function loadSettings() {
  const settings = { alarmVolume: 100, videoVolume: 100 };
  try {
    const saved = JSON.parse(readStorage(SETTINGS_KEY)) || {};
    for (const key of Object.keys(settings)) {
      if (Number.isFinite(saved[key])) settings[key] = Math.min(100, Math.max(0, saved[key]));
    }
  } catch (e) { /* corrupt */ }
  return settings;
}

export function saveSettings(settings) {
  writeStorage(SETTINGS_KEY, JSON.stringify(settings));
}

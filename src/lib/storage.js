// localStorage can throw (private windows, blocked storage), so every access is guarded.
export function readStorage(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

export function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
}

export function removeStorage(key) {
  try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
}

// Click the time to type a new length.
// Typing works like a microwave: the box starts at 00:00:00 and each digit
// slides in from the right, so typing 1, 0 gives 00:00:10 and 1, 3, 0, 0
// gives 00:13:00. The caret starts on the right but can be moved: digits
// go in at the caret, pushing the ones on its left leftward (00:00|:00 then
// 5 gives 00:05|:00). Backspace/Delete take a digit out and the ones on its
// left slide back right.
//
// An edit is { digits, after }: digits is always 6 long, after = how many sit
// right of the caret. These functions return a new edit instead of changing one.
import { MAX_DURATION_MS } from './timer.js';

export const MAX_DIGITS = 6;

export function emptyEdit() {
  return { digits: '0'.repeat(MAX_DIGITS), after: 0 };
}

export function formatDigits(d) {
  return `${d.slice(0, 2)}:${d.slice(2, 4)}:${d.slice(4)}`;
}

// Text position of the caret in the formatted box.
export function caretPosition(after) {
  const k = MAX_DIGITS - after;
  return k + (k > 2) + (k > 4);   // skip over the colons
}

// How many digits come before a text position in the box.
export function digitsBefore(text, pos) {
  return text.slice(0, pos).replace(/\D/g, '').length;
}

// Takes out digits [from, to); the ones on their left slide right to fill in.
function removeDigits(digits, from, to) {
  return '0'.repeat(to - from) + digits.slice(0, from) + digits.slice(to);
}

// Puts one digit in at the caret. While there is a spare leading zero on the
// left it gets pushed out; otherwise the digit types over the next one.
// Returns null when the box is full and the digit has nowhere to go.
function insertDigit({ digits, after }, ch) {
  const k = MAX_DIGITS - after;
  if (k > 0 && digits[0] === '0') return { digits: digits.slice(1, k) + ch + digits.slice(k), after };
  if (after > 0) return { digits: digits.slice(0, k) + ch + digits.slice(k + 1), after: after - 1 };
  return null;
}

// Applies one beforeinput event. from/to are the selection in digits;
// text is what was typed or pasted (ignored for deletes).
export function applyInput(edit, { from, to, inputType, text }) {
  let digits = edit.digits;
  let after = MAX_DIGITS - to;
  if (to > from) digits = removeDigits(digits, from, to);   // a selection is cleared first
  if (inputType.startsWith('delete')) {
    if (to === from && inputType.endsWith('Backward')) {
      if (from > 0) digits = removeDigits(digits, from - 1, from);
    } else if (to === from && after > 0) {
      digits = removeDigits(digits, from, from + 1);
      after--;
    }
    return { digits, after };
  }
  let next = { digits, after };
  for (const ch of (text ?? '').replace(/\D/g, '')) {
    const inserted = insertDigit(next, ch);
    if (!inserted) break;
    next = inserted;
  }
  return next;
}

// "000130" → 1 min 30 s. Fields over 59 roll over (e.g. 90 seconds = 1:30).
export function digitsToMs(digits) {
  const seconds = Number(digits.slice(0, 2)) * 3600 + Number(digits.slice(2, 4)) * 60 + Number(digits.slice(4));
  return Math.min(seconds * 1000, MAX_DURATION_MS);
}

import { describe, expect, it } from 'vitest';
import { applyInput, caretPosition, digitsBefore, digitsToMs, emptyEdit, formatDigits } from './timeEdit.js';

// Types text at the caret the way the browser would report it.
function type(edit, text) {
  const k = 6 - edit.after;
  return applyInput(edit, { from: k, to: k, inputType: 'insertText', text });
}

describe('microwave-style time entry', () => {
  it('slides digits in from the right', () => {
    let e = type(emptyEdit(), '1');
    expect(formatDigits(e.digits)).toBe('00:00:01');
    e = type(e, '300');
    expect(formatDigits(e.digits)).toBe('00:13:00');
  });

  it('inserts at a moved caret, pushing digits on its left leftward', () => {
    const e = applyInput({ digits: '000000', after: 2 }, { from: 4, to: 4, inputType: 'insertText', text: '5' });
    expect(formatDigits(e.digits)).toBe('00:05:00');
  });

  it('backspace removes the digit left of the caret and slides the rest right', () => {
    const e = applyInput({ digits: '000130', after: 0 }, { from: 6, to: 6, inputType: 'deleteContentBackward' });
    expect(e.digits).toBe('000013');
  });

  it('delete removes the digit right of the caret', () => {
    const e = applyInput({ digits: '000130', after: 2 }, { from: 4, to: 4, inputType: 'deleteContentForward' });
    expect(e).toEqual({ digits: '000010', after: 1 });
  });

  it('typing over a selection replaces it', () => {
    const e = applyInput({ digits: '123456', after: 0 }, { from: 0, to: 6, inputType: 'insertText', text: '9' });
    expect(e.digits).toBe('000009');
  });

  it('ignores non-digits and stops when full', () => {
    let e = type(emptyEdit(), '1a2:3');
    expect(e.digits).toBe('000123');
    e = type({ digits: '123456', after: 0 }, '7');
    expect(e.digits).toBe('123456');
  });
});

describe('caret and text positions', () => {
  it('skips the colons', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(caretPosition)).toEqual([8, 7, 5, 4, 2, 1, 0]);
  });
  it('counts digits before a text position', () => {
    expect(digitsBefore('00:13:00', 5)).toBe(4);
  });
});

describe('digitsToMs', () => {
  it('reads hh mm ss and rolls over fields above 59', () => {
    expect(digitsToMs('000130')).toBe(90000);
    expect(digitsToMs('000090')).toBe(90000);
  });
  it('caps at 24 hours', () => {
    expect(digitsToMs('999999')).toBe(24 * 3600000);
  });
});

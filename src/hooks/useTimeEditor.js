import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { applyInput, caretPosition, digitsBefore, digitsToMs, emptyEdit, formatDigits } from '../lib/timeEdit.js';
import { ensureAudio } from '../lib/chime.js';

// State and handlers for typing a new length into the time (see lib/timeEdit.js).
// edit is { digits, after, wasRunning } while the box is open, otherwise null.
export function useTimeEditor({ running, act }) {
  const [edit, setEditState] = useState(null);
  const inputRef = useRef(null);
  // Read by the native listeners, and cleared before the box hides so its blur is ignored.
  const editRef = useRef(null);

  const setEdit = useCallback(next => {
    editRef.current = next;
    setEditState(next);
  }, []);

  const shake = () => {
    const input = inputRef.current;
    input.classList.remove('invalid');
    void input.offsetWidth;   // restart the shake animation
    input.classList.add('invalid');
  };

  const open = useCallback(() => {
    if (editRef.current) return;
    setEdit({ ...emptyEdit(), wasRunning: running });
    act('pause');
    inputRef.current.classList.remove('invalid');
  }, [running, act, setEdit]);

  const close = useCallback(resume => {
    setEdit(null);
    if (resume) {
      ensureAudio();
      act('start');
    }
  }, [act, setEdit]);

  // Applies the typed length to the current phase. Resumes the timer if it was
  // running before the edit, unless told otherwise.
  const commit = useCallback((resume = editRef.current?.wasRunning) => {
    const current = editRef.current;
    if (!current) return;
    const ms = digitsToMs(current.digits);
    if (ms < 1000) {
      shake();
      return;
    }
    act('setDuration', { ms });
    close(resume);
  }, [act, close]);

  const cancel = useCallback(() => {
    if (editRef.current) close(editRef.current.wasRunning);
  }, [close]);

  // Focus first, then place the caret (the effects run in this order).
  const editing = edit !== null;
  useLayoutEffect(() => {
    if (editing) inputRef.current.focus();
  }, [editing]);

  // The box's text is never edited directly, only redrawn from the digits.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!edit) return;
    input.value = formatDigits(edit.digits);
    const pos = caretPosition(edit.after);
    input.setSelectionRange(pos, pos);
  }, [edit]);

  // All typing, deleting and pasting goes through beforeinput (on-screen keyboards
  // included). React's onBeforeInput doesn't report deletes, so this is a native listener.
  useEffect(() => {
    const input = inputRef.current;
    const onBeforeInput = e => {
      e.preventDefault();
      const current = editRef.current;
      if (!current) return;
      const next = applyInput(current, {
        from: digitsBefore(input.value, input.selectionStart),
        to: digitsBefore(input.value, input.selectionEnd),
        inputType: e.inputType,
        text: e.data ?? e.dataTransfer?.getData('text'),
      });
      input.classList.remove('invalid');
      setEdit({ ...next, wasRunning: current.wasRunning });
    };
    input.addEventListener('beforeinput', onBeforeInput);
    return () => input.removeEventListener('beforeinput', onBeforeInput);
  }, [setEdit]);

  const inputProps = {
    onKeyDown: e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    },
    // Clicking away keeps a typed time and quietly drops an empty one.
    onBlur: () => {
      const current = editRef.current;
      if (!current) return;
      if (digitsToMs(current.digits) < 1000) cancel();
      else commit();
    },
  };

  return { editing, open, commit, inputRef, inputProps };
}

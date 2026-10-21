// A small on/off switch: an invisible checkbox under a track and a sliding knob
// that shows ✕ when off and ✓ when on.
export default function Toggle({ id, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="track"></span>
      <span className="knob">
        <svg className="icon-off" viewBox="0 0 8 8"><path d="M1 1l6 6M7 1L1 7" /></svg>
        <svg className="icon-on" viewBox="0 0 8 8"><path d="M1 4.2l2 2L7 1.5" /></svg>
      </span>
    </label>
  );
}

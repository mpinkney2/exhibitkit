import {
  BATES_MODE_AS_EXHIBIT_ID,
  BATES_MODE_SEQUENTIAL,
} from '../utils/batesMode';

export default function BatesModeControl({
  mode,
  onChange,
  disabled = false,
  name = 'bates-mode',
}) {
  return (
    <fieldset className="bates-mode" disabled={disabled}>
      <legend>Bates filenames</legend>
      <p>
        Sequential numbering is the default. Presets already build PX-1, PX-2, and the other exhibit IDs, and a Bates control number is kept in the description. Choose the Bates number as the exhibit ID only when that control number should replace the exhibit ID. A number or description you edit in the grid stays as you left it.
      </p>
      <label>
        <input
          type="radio"
          name={name}
          value={BATES_MODE_SEQUENTIAL}
          checked={mode === BATES_MODE_SEQUENTIAL}
          onChange={() => onChange(BATES_MODE_SEQUENTIAL)}
        />
        Number exhibits sequentially (PX-1, PX-2…) and keep the Bates number in the description
      </label>
      <label>
        <input
          type="radio"
          name={name}
          value={BATES_MODE_AS_EXHIBIT_ID}
          checked={mode === BATES_MODE_AS_EXHIBIT_ID}
          onChange={() => onChange(BATES_MODE_AS_EXHIBIT_ID)}
        />
        Use Bates number as exhibit ID
      </label>
    </fieldset>
  );
}

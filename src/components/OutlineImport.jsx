import './OutlineImport.css';

const STATUS_LABEL = {
  matched: 'Matched',
  ambiguous: 'Ambiguous',
  missing: 'Missing',
};

function fileLabel(file) {
  if (!file) return '';
  const official = file.officialExhibitNo ? `${file.officialExhibitNo} — ` : '';
  return `${official}${file.originalName}`;
}

export default function OutlineImport({
  text,
  onTextChange,
  match,
  filesById,
  onMatch,
  onClear,
  onUseStagingNames,
  onChoose,
  disabled = false,
  isPro = false,
  excluded = [],
}) {
  const counts = match?.counts;
  const references = match?.references || [];

  return (
    <section className="outline-panel" aria-label="Outline order">
      <div className="outline-panel-head">
        <div>
          <h2>Outline order</h2>
          <p>
            Paste the exhibits in the order the outline cites them, one per line or separated by commas.
            Matching stays in this browser. A repeated exhibit stays one file and keeps every citation.
          </p>
        </div>
        <div className="outline-actions">
          <button type="button" onClick={onUseStagingNames} disabled={disabled}>
            Use staging names
          </button>
          <button type="button" onClick={onClear} disabled={disabled || (!text && !match)}>
            Clear outline
          </button>
          <button type="button" className="outline-primary" onClick={onMatch} disabled={disabled || !text.trim()}>
            Match outline
          </button>
        </div>
      </div>

      <textarea
        className="outline-paste"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder={'PX-0142\nPX 142 at 3\nDX-0031 p. 12-14\nSmith Depo 45:3-46:10'}
        aria-label="Outline exhibit references"
        disabled={disabled}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && text.trim() && !disabled) {
            event.preventDefault();
            onMatch();
          }
        }}
      />

      <p className="outline-note">
        Staging names use {'{Seq}_{ExhibitNo}_{ShortDesc}'}. Seq is the outline order, padded with the zero-padding setting.
        ExhibitNo stays exactly as written on the file. ShortDesc trims the description at Max title length.
        Add {'{Type}'} for V on video and D on a demonstrative.
        {isPro
          ? ' Case Pass or Pro saves that pattern as a Matter Profile and writes the staged copies.'
          : ' Free includes matching, edits, and the CSV/HTML crosswalk for up to 5 files. A larger folder, Matter Profiles, and ZIP or in-place rename need Case Pass or Pro.'}
      </p>

      {counts && (
        <div className="outline-summary" role="status">
          <span className="outline-count matched">{counts.matched} matched</span>
          <span className="outline-count ambiguous">{counts.ambiguous} ambiguous</span>
          <span className="outline-count missing">{counts.missing} missing</span>
          <span className="outline-count">{counts.files} staged</span>
        </div>
      )}

      {references.length > 0 && (
        <ul className="outline-results">
          {references.map((reference) => {
            const file = reference.fileId ? filesById[reference.fileId] : null;
            const shared = reference.sharedWithOrder;
            return (
              <li key={reference.id} className={`outline-result ${reference.status}`} data-status={reference.status}>
                <span className="outline-status">{STATUS_LABEL[reference.status] || reference.status}</span>
                <div className="outline-result-raw">
                  {reference.outlineOrder ? `${reference.outlineOrder}. ` : ''}
                  {reference.raw}
                  {reference.designation ? ` · ${reference.designation}` : ''}
                </div>
                <div className="outline-result-file">
                  {reference.status === 'ambiguous' ? (
                    <select
                      aria-label={`Choose the file for ${reference.raw}`}
                      value={reference.fileId || ''}
                      disabled={disabled}
                      onChange={(event) => onChoose(reference.id, event.target.value)}
                    >
                      <option value="">Choose a file</option>
                      {reference.candidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {fileLabel(candidate)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {reference.status === 'matched' && shared
                    ? `Same file as #${shared}. Both citations stay on that row.`
                    : null}
                  {reference.status === 'matched' && !shared ? fileLabel(file) : null}
                  {reference.status === 'missing' ? 'No loaded file has this exhibit number.' : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {excluded.length > 0 && (
        <div className="outline-remainder">
          <strong>Not in this outline ({excluded.length})</strong>
          <p className="outline-note">
            These files stay loaded. They are left out of the staged names, rename, ZIP, and crosswalk.
          </p>
          <ul>
            {excluded.map((item) => (
              <li key={item.id || item.originalName}>{item.originalName}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

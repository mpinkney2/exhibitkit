import { useRef } from 'react';
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
  onOutlineFile = () => {},
  drafts = null,
  onDraftEdit = () => {},
  onDraftRemove = () => {},
  onConfirmDrafts = () => {},
  fileMessage = '',
  fileTone = 'info',
  fileBusy = false,
  disabled = false,
  isPro = false,
  excluded = [],
}) {
  const fileInputRef = useRef(null);
  const reviewRows = Array.isArray(drafts) ? drafts : [];
  const canConfirm = reviewRows.some((row) => String(row.cite || '').trim());
  const counts = match?.counts;
  const references = match?.references || [];

  return (
    <section className="outline-panel" aria-label="Outline order">
      <div className="outline-panel-head">
        <div>
          <h2>Outline order</h2>
          <p>
            Paste citations, or upload the attorney&apos;s outline as a Word .docx or a text-based PDF.
            The file is read in this browser and is not uploaded. A repeated exhibit stays one file and keeps every citation.
          </p>
        </div>
        <div className="outline-actions">
          <button type="button" onClick={onUseStagingNames} disabled={disabled}>
            Use staging names
          </button>
          <button type="button" onClick={onClear} disabled={disabled || (!text && !match && !drafts && !fileMessage)}>
            Clear outline
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || fileBusy}
          >
            {fileBusy ? 'Reading outline…' : 'Upload outline'}
          </button>
          <button type="button" className="outline-primary" onClick={onMatch} disabled={disabled || !text.trim()}>
            Match outline
          </button>
          <input
            ref={fileInputRef}
            className="outline-file-input"
            type="file"
            accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            aria-label="Upload a Word or PDF outline"
            disabled={disabled || fileBusy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onOutlineFile(file);
            }}
          />
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

      {fileMessage ? (
        <p className={fileTone === 'error' ? 'outline-file-message' : 'outline-note'} role={fileTone === 'error' ? 'alert' : 'status'}>
          {fileMessage}
        </p>
      ) : null}

      {Array.isArray(drafts) ? (
        <div className="outline-review" aria-label="Review extracted citations">
          <div className="outline-review-head">
            <h3>Review extracted citations</h3>
            <p className="outline-note">
              These cites were read from the outline in order. Edit or remove a row, then match.
              Nothing is renamed until you confirm the rename.
            </p>
          </div>
          {reviewRows.length === 0 ? (
            <p className="outline-note">No citations left in this review.</p>
          ) : (
            <div className="outline-review-scroll">
              <table className="outline-review-table">
                <thead>
                  <tr>
                    <th>Citation</th>
                    <th>Description</th>
                    <th>Designation</th>
                    <th>Context</th>
                    <th><span className="outline-sr">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          aria-label={`Citation ${row.id}`}
                          value={row.cite}
                          disabled={disabled}
                          onChange={(event) => onDraftEdit(row.id, 'cite', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`Description for ${row.cite || row.id}`}
                          value={row.description}
                          disabled={disabled}
                          onChange={(event) => onDraftEdit(row.id, 'description', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`Designation for ${row.cite || row.id}`}
                          value={row.designation}
                          disabled={disabled}
                          onChange={(event) => onDraftEdit(row.id, 'designation', event.target.value)}
                        />
                      </td>
                      <td className="outline-context">{row.context}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => onDraftRemove(row.id)}
                          disabled={disabled}
                          aria-label={`Remove ${row.cite || 'citation'}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="outline-actions">
            <button
              type="button"
              className="outline-primary"
              onClick={onConfirmDrafts}
              disabled={disabled || !canConfirm}
            >
              Match these citations
            </button>
          </div>
        </div>
      ) : null}

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

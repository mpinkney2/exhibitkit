import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import OutlineImport from './OutlineImport';

function renderPanel(props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<OutlineImport {...props} />);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('OutlineImport', () => {
  it('shows matched, ambiguous, and missing rows', () => {
    const view = renderPanel({
      text: 'DX-0031 p. 12-14\nPX-0142\nQX-0007',
      onTextChange: () => {},
      onMatch: () => {},
      onClear: () => {},
      onUseStagingNames: () => {},
      onChoose: () => {},
      filesById: {
        minutes: { originalName: 'DX_0031 Board minutes.pdf', officialExhibitNo: 'DX_0031' },
      },
      match: {
        counts: { matched: 1, ambiguous: 1, missing: 1, files: 1 },
        references: [
          {
            id: 'r1',
            raw: 'DX-0031 p. 12-14',
            designation: '12-14',
            status: 'matched',
            fileId: 'minutes',
            outlineOrder: 1,
            sharedWithOrder: null,
            candidates: [],
          },
          {
            id: 'r2',
            raw: 'PX-0142',
            designation: '',
            status: 'ambiguous',
            fileId: null,
            outlineOrder: null,
            sharedWithOrder: null,
            candidates: [
              { id: 'email', originalName: 'PX-0142 Email.pdf', officialExhibitNo: 'PX-0142' },
              { id: 'alt', originalName: 'PX 142 Alternate.pdf', officialExhibitNo: 'PX 142' },
            ],
          },
          {
            id: 'r3',
            raw: 'QX-0007',
            designation: '',
            status: 'missing',
            fileId: null,
            outlineOrder: null,
            sharedWithOrder: null,
            candidates: [],
          },
        ],
      },
      excluded: [{ id: 'cover', originalName: 'Unrelated cover.pdf' }],
    });

    const text = view.container.textContent;
    expect(text).toContain('1 matched');
    expect(text).toContain('1 ambiguous');
    expect(text).toContain('1 missing');
    expect(view.container.querySelector('[data-status="matched"]').textContent).toContain('DX_0031 Board minutes.pdf');
    expect(view.container.querySelector('[data-status="ambiguous"] select').options).toHaveLength(3);
    expect(view.container.querySelector('[data-status="missing"]').textContent).toContain('No loaded file');
    expect(text).toContain('Not in this outline (1)');
    expect(text).toContain('Unrelated cover.pdf');
    expect(view.container.querySelector('input[type="file"]').getAttribute('accept')).toContain('.docx');
    expect(view.container.querySelector('input[type="file"]').getAttribute('accept')).toContain('.pdf');
    view.unmount();
  });

  it('reviews extracted cites and does not match until the review is confirmed', () => {
    let matched = 0;
    let confirmed = 0;
    let removed = '';
    let edited = null;
    const view = renderPanel({
      text: '',
      onTextChange: () => {},
      onMatch: () => { matched += 1; },
      onClear: () => {},
      onUseStagingNames: () => {},
      onChoose: () => {},
      onConfirmDrafts: () => { confirmed += 1; },
      onDraftRemove: (id) => { removed = id; },
      onDraftEdit: (id, field, value) => { edited = { id, field, value }; },
      filesById: {},
      fileMessage: 'Found 1 citation in this browser. Review them before matching. The file was not uploaded.',
      fileTone: 'info',
      drafts: [{
        id: 'c1',
        cite: 'PX-0142',
        description: 'Pricing email',
        designation: '42:5-43:10',
        context: 'Ask about PX-0142 (Pricing email) at 42:5-43:10.',
      }],
    });

    const text = view.container.textContent;
    expect(text).toContain('Review extracted citations');
    expect(text).toContain('Pricing email');
    expect(text).toContain('Ask about PX-0142');
    expect(text).toContain('was not uploaded');

    const description = view.container.querySelector('[aria-label="Description for PX-0142"]');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => {
      nativeSetter.call(description, 'Pricing memo');
      description.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(edited).toEqual({ id: 'c1', field: 'description', value: 'Pricing memo' });

    act(() => {
      view.container.querySelector('[aria-label="Remove PX-0142"]').click();
    });
    expect(removed).toBe('c1');

    act(() => {
      [...view.container.querySelectorAll('button')].find((button) => button.textContent === 'Match these citations').click();
    });
    expect(confirmed).toBe(1);
    expect(matched).toBe(0);
    view.unmount();
  });

  it('shows a scanned PDF message and does not list citations', () => {
    const view = renderPanel({
      text: '',
      onTextChange: () => {},
      onMatch: () => {},
      onClear: () => {},
      onUseStagingNames: () => {},
      onChoose: () => {},
      filesById: {},
      fileTone: 'error',
      fileMessage: 'This PDF has no extractable text. It looks scanned or image-only. ExhibitKit does not run OCR.',
    });
    const alert = view.container.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('no extractable text');
    expect(alert.textContent).toContain('OCR');
    expect(view.container.querySelector('.outline-review')).toBeNull();
    view.unmount();
  });
});
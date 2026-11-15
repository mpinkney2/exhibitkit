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
    view.unmount();
  });
});
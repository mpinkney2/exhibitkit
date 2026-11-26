import { describe, expect, it } from 'vitest';
import { applyOutlineResult, extractOfficialExhibitNumber, matchOutline } from './outlineImport';
import {
  MAX_DRAFT_DESCRIPTION,
  draftToOutlineLine,
  draftsToOutlineText,
  extractOutlineCites,
} from './outlineExtract';
import { SAMPLE_OUTLINE_LINES } from '../../test/outlineFixtures';

const OUTLINE = SAMPLE_OUTLINE_LINES.join('\n');

describe('extractOutlineCites', () => {
  it('keeps cites in document order, including a repeat, and skips ordinary words', () => {
    const cites = extractOutlineCites(OUTLINE).map((row) => row.cite);
    expect(cites).toEqual([
      'PX-0142',
      'DX 12',
      'JX-3',
      'PTX 8',
      'DTX-4',
      'PX-0142',
      'FL-0001',
    ]);
  });

  it('captures a parenthetical or the same sentence, and a page:line designation', () => {
    const rows = extractOutlineCites(OUTLINE);
    expect(rows[0]).toMatchObject({
      cite: 'PX-0142',
      description: 'Email from Smith to Jones regarding pricing',
      designation: '',
    });
    expect(rows[0].context).toContain('PX-0142');
    expect(rows[1]).toMatchObject({
      cite: 'DX 12',
      description: 'board minutes',
      designation: '42:5-43:10',
    });
    expect(rows[2]).toMatchObject({
      cite: 'JX-3',
      description: 'Joint pretrial order',
      designation: '4',
    });
    expect(rows[3]).toMatchObject({
      cite: 'PTX 8',
      description: 'damages summary',
      designation: '15:2-16:8',
    });
    expect(rows[4]).toMatchObject({
      cite: 'DTX-4',
      description: 'site photographs',
      designation: '',
    });
    expect(rows[5]).toMatchObject({
      cite: 'PX-0142',
      description: 'pricing clause',
      designation: '9',
    });
    expect(rows[6]).toMatchObject({
      cite: 'FL-0001',
      description: 'parenting plan',
    });
  });

  it('reads px 142, a bare prefix number, and p. 42:5', () => {
    const rows = extractOutlineCites([
      'Use px 142 (pricing memo) and PX0142A p. 42:5.',
      'Pricing email, DX-0031.',
    ].join('\n'));
    expect(rows.map((row) => row.cite)).toEqual(['px 142', 'PX0142A', 'DX-0031']);
    expect(rows[0].description).toBe('pricing memo');
    expect(rows[1]).toMatchObject({ designation: '42:5', description: '' });
    expect(rows[2].description).toBe('Pricing email');
  });

  it('trims a long draft description on a word boundary', () => {
    const long = `Email from Smith to Jones regarding the pricing discussion and the follow up memorandum that counsel marked for identification during deposition preparation`;
    expect(long.length).toBeGreaterThan(MAX_DRAFT_DESCRIPTION);
    const rows = extractOutlineCites(`See PX-0142 (${long}).`);
    expect(rows[0].description.length).toBeLessThanOrEqual(MAX_DRAFT_DESCRIPTION);
    expect(rows[0].description.length).toBeGreaterThanOrEqual(90);
    expect(long.startsWith(rows[0].description)).toBe(true);
  });

  it('builds one line per cite so a comma in the description stays on that cite', () => {
    const line = draftToOutlineLine({
      cite: 'DX-0031',
      description: 'Minutes, March session',
      designation: '12-14',
    });
    expect(line).toBe('DX-0031 Minutes, March session p. 12-14');
    expect(draftToOutlineLine({ cite: 'PX-0142', description: '', designation: '42:5-43:10' }))
      .toBe('PX-0142 42:5-43:10');
  });
});

describe('uploaded cites feed the existing match', () => {
  it('de-dupes a repeat, joins designations, and keeps the first draft description', () => {
    const email = 'PX-0142 Email from Smith to Jones re pricing.pdf';
    const minutes = 'DX_0031 Board minutes.pdf';
    const files = [
      { id: 'email', originalName: email, description: 'Email from Smith' },
      { id: 'minutes', originalName: minutes, description: 'Board minutes' },
      { id: 'cover', originalName: 'Unrelated cover.pdf', description: 'Cover' },
    ].map((file) => ({
      ...file,
      officialExhibitNo: extractOfficialExhibitNumber(file.originalName),
    }));
    const drafts = [
      { cite: 'PX-0142', description: 'Email from Smith to Jones regarding pricing', designation: '3' },
      { cite: 'DX-0031', description: 'Board minutes, March session', designation: '42:5-43:10' },
      { cite: 'PX-0142', description: 'Pricing clause', designation: 'p. 9' },
    ];
    const matched = matchOutline(draftsToOutlineText(drafts), files, { splitCommas: false });
    expect(matched.references).toHaveLength(3);
    expect(matched.references[2].sharedWithOrder).toBe(1);
    const stamped = {
      ...matched,
      references: matched.references.map((reference, index) => ({
        ...reference,
        draftDescription: drafts[index].description,
      })),
    };
    const applied = applyOutlineResult(files, stamped);
    expect(applied.find((item) => item.id === 'email')).toMatchObject({
      included: true,
      outlineOrder: 1,
      designation: '3; 9',
      outlineDescription: 'Email from Smith to Jones regarding pricing',
    });
    expect(applied.find((item) => item.id === 'minutes')).toMatchObject({
      outlineOrder: 2,
      designation: '42:5-43:10',
      outlineDescription: 'Board minutes, March session',
    });
    expect(applied.find((item) => item.id === 'cover').included).toBe(false);
    expect(applied.filter((item) => item.included && item.id === 'email')).toHaveLength(1);
  });
});

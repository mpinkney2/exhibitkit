import { describe, expect, it } from 'vitest';
import { getPresetRuleDefaults, OUTLINE_STAGING_TEMPLATE } from '../config/presets';
import { formatSequenceToken, generateProposedFilename } from './renamer';
import { buildRenameExportCsv } from './crosswalk';
import {
  applyOutlineResult,
  assignOutlineCandidate,
  descriptionAfterOfficialNumber,
  extractOfficialExhibitNumber,
  inferMediaKind,
  isAcceptedExhibitName,
  matchKeyFromOfficial,
  matchOutline,
  orderStagedItems,
  parseOutlineReference,
  splitOutlineList,
  typePrefixForKind,
} from './outlineImport';

const email = 'PX-0142 Email from Smith to Jones re pricing 3-12-19.pdf';
const alternate = 'PX 142 Alternate pricing memo.pdf';
const minutes = 'DX_0031 Board minutes.pdf';
const depo = 'Smith Depo.pdf';
const timeline = 'GFX-2 Opening timeline.pdf';
const video = 'DX-0004 Site inspection.mp4';
const slides = 'DX-0008 Damages slides.pptx';
const cover = 'Unrelated cover.pdf';

function files() {
  return [
    { id: 'email', originalName: email, description: 'Email from Smith to Jones re pricing 3 12 19' },
    { id: 'alt', originalName: alternate, description: 'Alternate pricing memo' },
    { id: 'minutes', originalName: minutes, description: 'Board minutes' },
    { id: 'depo', originalName: depo, description: 'Smith Depo' },
    { id: 'timeline', originalName: timeline, description: 'Opening timeline' },
    { id: 'video', originalName: video, description: 'Site inspection' },
    { id: 'slides', originalName: slides, description: 'Damages slides' },
    { id: 'cover', originalName: cover, description: 'Unrelated cover' },
  ].map((file) => ({
    ...file,
    officialExhibitNo: extractOfficialExhibitNumber(file.originalName),
  }));
}

describe('official exhibit numbers', () => {
  it('keeps padding and separators exactly as written', () => {
    expect(extractOfficialExhibitNumber(email)).toBe('PX-0142');
    expect(extractOfficialExhibitNumber(minutes)).toBe('DX_0031');
    expect(extractOfficialExhibitNumber('px 142 memo.pdf')).toBe('px 142');
    expect(extractOfficialExhibitNumber('FL-0001 Parenting Plan.pdf')).toBe('FL-0001');
    expect(extractOfficialExhibitNumber('04 - Jones Photo.pdf')).toBe('04');
    expect(extractOfficialExhibitNumber('DEP Jones Exhibit 3.pdf')).toBe('DEP Jones Exhibit 3');
  });

  it('does not treat a leading calendar year as an exhibit number', () => {
    expect(extractOfficialExhibitNumber('2019 - Board Minutes.pdf')).toBe('');
  });

  it('matches padding, case, spacing, and hyphen variants, and keeps a letter suffix', () => {
    expect(matchKeyFromOfficial('PX-0142')).toBe('PX-142');
    expect(matchKeyFromOfficial('px 142')).toBe('PX-142');
    expect(matchKeyFromOfficial('PX_0142')).toBe('PX-142');
    expect(matchKeyFromOfficial('PX0142')).toBe('PX-142');
    expect(matchKeyFromOfficial('DX_0031')).toBe('DX-31');
    expect(matchKeyFromOfficial('PX-0142A')).toBe('PX-142A');
    expect(matchKeyFromOfficial('PX-0142A')).not.toBe(matchKeyFromOfficial('PX-0142'));
  });
});

describe('outline reference parsing', () => {
  it('splits lines and commas', () => {
    expect(splitOutlineList('PX-0142, DX-0031 p. 12-14\nSmith Depo 45:3-46:10')).toEqual([
      'PX-0142',
      'DX-0031 p. 12-14',
      'Smith Depo 45:3-46:10',
    ]);
  });

  it('parses page, page range, and page:line designations', () => {
    expect(parseOutlineReference('PX-0142')).toMatchObject({ key: 'PX-142', designation: '' });
    expect(parseOutlineReference('PX 142 at 3')).toMatchObject({ key: 'PX-142', designation: '3', body: 'PX 142' });
    expect(parseOutlineReference('DX-0031 p. 12-14')).toMatchObject({ key: 'DX-31', designation: '12-14' });
    expect(parseOutlineReference('DX-0031 pp. 12–14')).toMatchObject({ designation: '12-14' });
    expect(parseOutlineReference('DX-0031 pages 12-14')).toMatchObject({ designation: '12-14' });
    expect(parseOutlineReference('DX-0031 at p. 3')).toMatchObject({ designation: '3', body: 'DX-0031' });
    expect(parseOutlineReference('DX-0031 at 3-5')).toMatchObject({ designation: '3-5' });
    expect(parseOutlineReference('Smith Depo 45:3-46:10')).toMatchObject({
      key: '',
      body: 'Smith Depo',
      designation: '45:3-46:10',
    });
    expect(parseOutlineReference('Smith Depo 45:3-10')).toMatchObject({ designation: '45:3-10' });
    expect(parseOutlineReference('Smith Depo 45:3')).toMatchObject({ designation: '45:3' });
  });
});

describe('matchOutline', () => {
  it('matches, flags ambiguity, reports missing files, and keeps a repeated citation on one file', () => {
    const pasted = [
      'PX 142 at 3',
      'DX-0031 p. 12-14',
      'Smith Depo 45:3-46:10',
      'PX-0142 p. 9',
      'QX-0007',
    ].join('\n');

    const result = matchOutline(pasted, files());
    const byRaw = Object.fromEntries(result.references.map((reference) => [reference.raw, reference]));

    expect(byRaw['DX-0031 p. 12-14']).toMatchObject({
      status: 'matched',
      fileId: 'minutes',
      designation: '12-14',
      outlineOrder: 1,
    });
    expect(byRaw['Smith Depo 45:3-46:10']).toMatchObject({
      status: 'matched',
      fileId: 'depo',
      designation: '45:3-46:10',
    });
    expect(byRaw['PX 142 at 3'].status).toBe('ambiguous');
    expect(byRaw['PX 142 at 3'].candidates.map((candidate) => candidate.id).sort()).toEqual(['alt', 'email']);
    expect(byRaw['PX-0142 p. 9'].status).toBe('ambiguous');
    expect(byRaw['QX-0007']).toMatchObject({ status: 'missing', fileId: null });
    expect(result.counts).toMatchObject({ ambiguous: 2, missing: 1 });
  });

  it('lets extra words pick one of two files that share an exhibit number', () => {
    const result = matchOutline('PX-0142 Email from Smith', files());
    expect(result.references[0]).toMatchObject({ status: 'matched', fileId: 'email' });
  });

  it('matches a unique number despite padding, case, and separator differences', () => {
    const result = matchOutline('dx 31', files());
    expect(result.references[0]).toMatchObject({ status: 'matched', fileId: 'minutes' });
  });

  it('keeps one file when the same exhibit is cited twice and stores both designations', () => {
    const unique = files().filter((file) => file.id !== 'alt');
    const result = matchOutline('PX-0142 at 3\nDX-0031\nPX 0142 p. 12-14', unique);
    expect(result.references[0]).toMatchObject({ status: 'matched', fileId: 'email', outlineOrder: 1 });
    expect(result.references[2]).toMatchObject({
      status: 'matched',
      fileId: 'email',
      sharedWithOrder: 1,
      designation: '12-14',
    });

    const applied = applyOutlineResult(unique.map((file) => ({ ...file, included: true })), result);
    const staged = applied.find((item) => item.id === 'email');
    expect(staged).toMatchObject({
      included: true,
      outlineOrder: 1,
      designation: '3; 12-14',
    });
    expect(staged.outlineReferences).toEqual(['PX-0142 at 3', 'PX 0142 p. 12-14']);
    expect(applied.find((item) => item.id === 'cover').included).toBe(false);
    expect(applied.filter((item) => item.included && item.id === 'email')).toHaveLength(1);
  });

  it('resolves an ambiguous row onto the chosen file', () => {
    const result = matchOutline('PX-0142', files());
    expect(result.references[0].status).toBe('ambiguous');
    const chosen = assignOutlineCandidate(result, 'r1', 'email');
    expect(chosen.references[0]).toMatchObject({ status: 'matched', fileId: 'email', outlineOrder: 1 });
    const applied = applyOutlineResult(files(), chosen);
    expect(applied.find((item) => item.id === 'email').included).toBe(true);
    expect(applied.find((item) => item.id === 'alt').included).toBe(false);
  });

  it('keeps staged files in outline order ahead of files that were not cited', () => {
    const unique = files().filter((file) => file.id !== 'alt');
    const result = matchOutline('Smith Depo 45:3\nDX-0031', unique);
    const applied = applyOutlineResult(unique, result);
    const ordered = orderStagedItems(applied, 'filename');
    expect(ordered.filter((item) => item.included).map((item) => item.id)).toEqual(['depo', 'minutes']);
    expect(ordered.at(-1).included).toBe(false);
  });
});

describe('staging names and media', () => {
  it('keeps the original title, including a date, until the description is edited', () => {
    expect(descriptionAfterOfficialNumber(email, 'PX-0142')).toBe(
      'Email from Smith to Jones re pricing 3-12-19',
    );
    expect(generateProposedFilename({
      preset: 'outline-staging',
      customTemplate: OUTLINE_STAGING_TEMPLATE,
      seq: 1,
      exhibitNo: 'PX-0142',
      description: 'Email from Smith to Jones re pricing 3 12 19',
      shortDescription: 'Email from Smith to Jones re pricing 3-12-19',
      padLength: 3,
      caseStyle: 'as-is',
      maxDescLength: 48,
    })).toBe('001_PX-0142_Email from Smith to Jones re pricing 3-12-19.pdf');
  });

  it('builds the outline staging name without rewriting the official number', () => {
    expect(getPresetRuleDefaults('outline-staging').customTemplate).toBe(OUTLINE_STAGING_TEMPLATE);
    expect(formatSequenceToken(1, 3)).toBe('001');
    expect(formatSequenceToken(1, 0)).toBe('01');
    expect(generateProposedFilename({
      preset: 'outline-staging',
      customTemplate: OUTLINE_STAGING_TEMPLATE,
      seq: 1,
      exhibitNo: 'PX-0142',
      description: 'Email from Smith',
      padLength: 3,
      caseStyle: 'as-is',
      maxDescLength: 48,
    })).toBe('001_PX-0142_Email from Smith.pdf');
  });

  it('trims a long description and can prefix video or demonstrative copies', () => {
    const long = 'Email from Smith to Jones regarding the March pricing discussion and follow up';
    expect(generateProposedFilename({
      preset: 'outline-staging',
      customTemplate: '{Type}{Seq}_{ExhibitNo}_{ShortDesc}',
      seq: 4,
      exhibitNo: 'DX-0004',
      description: 'Site inspection',
      typePrefix: 'V',
      padLength: 3,
      caseStyle: 'as-is',
      extension: '.mp4',
    })).toBe('V004_DX-0004_Site inspection.mp4');

    expect(generateProposedFilename({
      preset: 'outline-staging',
      customTemplate: '{Type}_{Seq}_{ExhibitNo}_{ShortDesc}',
      seq: 2,
      exhibitNo: 'PX-0142',
      description: long,
      typePrefix: '',
      padLength: 3,
      caseStyle: 'as-is',
      maxDescLength: 32,
    })).toBe('002_PX-0142_Email from Smith to Jones.pdf');

    expect(inferMediaKind(video, 'DX')).toBe('video');
    expect(inferMediaKind(slides, 'DX')).toBe('demonstrative');
    expect(inferMediaKind(timeline, 'GFX')).toBe('demonstrative');
    expect(inferMediaKind(email, 'PX')).toBe('exhibit');
    expect(typePrefixForKind('video')).toBe('V');
    expect(typePrefixForKind('demonstrative')).toBe('D');
    expect(typePrefixForKind('exhibit')).toBe('');
    expect(isAcceptedExhibitName(video)).toBe(true);
    expect(isAcceptedExhibitName('notes.docx')).toBe(false);
  });
});

describe('crosswalk export', () => {
  it('writes outline order, official number, designation, citations, original name, and new name', () => {
    const csv = buildRenameExportCsv([
      {
        included: true,
        outlineOrder: 1,
        officialExhibitNo: 'PX-0142',
        designation: '3; 12-14',
        outlineReferences: ['PX-0142 at 3', 'PX 0142 p. 12-14'],
        originalName: email,
        proposedName: '001_PX-0142_Email from Smith.pdf',
      },
      {
        included: false,
        outlineOrder: null,
        originalName: cover,
        proposedName: 'cover.pdf',
      },
    ]);

    expect(csv.split('\n')[0]).toBe(
      'Outline Order,Official Exhibit Number,Designation,Citations,Original Filename,New Name',
    );
    expect(csv).toContain('"PX-0142"');
    expect(csv).toContain('"3; 12-14"');
    expect(csv).toContain('"PX-0142 at 3 | PX 0142 p. 12-14"');
    expect(csv).toContain('"001_PX-0142_Email from Smith.pdf"');
    expect(csv).not.toContain('Unrelated cover.pdf');
  });

  it('keeps the rename map when no outline is active and neutralizes formula cells', () => {
    const csv = buildRenameExportCsv([
      {
        originalName: '=cmd.pdf',
        number: '1',
        proposedName: 'PX001 Memo.pdf',
      },
    ], { preset: 'oncue' });
    expect(csv.startsWith('Original Filename,Exhibit ID,Proposed Filename,Preset Type')).toBe(true);
    expect(csv).toContain(`"'=cmd.pdf"`);
  });
});

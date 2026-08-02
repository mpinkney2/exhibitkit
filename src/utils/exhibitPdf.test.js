import { describe, expect, it } from 'vitest';
import { buildExhibitPdf, exportProjectPackage } from './exhibitPdf';
import { createEmptyProject } from './project';

function sampleProject(multi = false) {
  const project = createEmptyProject({
    caseName: 'Rivera v. Lee',
    court: 'Superior Court',
    caption: 'Civil Action No. 123',
  });
  project.exhibits = [
    {
      id: 'ex1',
      label: 'Exhibit A',
      sourceFiles: [
        {
          originalName: 'thread.txt',
          byteSize: 12,
          sha256: 'a'.repeat(64),
        },
      ],
      messages: [
        {
          id: 'm1',
          seq: 1,
          sender: 'Alex',
          timestamp: '10:00',
          body: 'Hello 4421',
          selected: true,
          redactions: [{ phrase: '4421' }],
        },
        {
          id: 'm2',
          seq: 2,
          sender: 'Jordan',
          timestamp: '10:01',
          body: 'Confirmed',
          selected: true,
        },
      ],
    },
  ];
  if (multi) {
    project.exhibits.push({
      id: 'ex2',
      label: 'Exhibit B',
      sourceFiles: [
        {
          originalName: 'thread-2.txt',
          byteSize: 8,
          sha256: 'b'.repeat(64),
        },
      ],
      messages: [
        {
          id: 'm3',
          seq: 1,
          sender: 'Alex',
          timestamp: '11:00',
          body: 'Second conversation',
          selected: true,
        },
      ],
    });
  }
  return project;
}

describe('PDF generation', () => {
  it('builds a free exhibit PDF with declaration template', async () => {
    const result = await buildExhibitPdf({
      project: sampleProject(),
      exhibit: sampleProject().exhibits[0],
      includeCover: false,
      includeDeclaration: true,
    });
    expect(result.bytes.byteLength).toBeGreaterThan(500);
    expect(result.messageCount).toBe(2);
    expect(result.pageCount).toBeGreaterThanOrEqual(2);
  });

  it('exports a Pro multi-exhibit package with binder and zip', async () => {
    const result = await exportProjectPackage(sampleProject(true), { pro: true, zip: true });
    expect(result.mode).toBe('pro');
    expect(result.zip?.name).toBe('exhibitkit_export.zip');
    const kinds = result.files.map((f) => f.kind);
    expect(kinds).toContain('binder');
    expect(kinds).toContain('index');
    expect(kinds).toContain('integrity');
    expect(kinds.filter((k) => k === 'exhibit')).toHaveLength(2);
  });

  it('rejects multi-exhibit export on free tier', async () => {
    await expect(exportProjectPackage(sampleProject(true), { pro: false })).rejects.toThrow(
      /one conversation/i
    );
  });
});

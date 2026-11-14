/**
 * Rename map and outline crosswalk exports. Built in the browser; nothing is uploaded.
 */

export function escapeCsvCell(value) {
  let text = String(value ?? '');
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportUsesCrosswalk(items) {
  return (items || []).some((item) => item.included !== false && item.outlineOrder);
}

export function crosswalkFields(item) {
  const citations = Array.isArray(item.outlineReferences) ? item.outlineReferences : [];
  return {
    outlineOrder: item.outlineOrder ?? '',
    officialExhibitNo: item.officialExhibitNo || '',
    designation: item.designation || '',
    citations: citations.join(' | '),
    originalName: item.originalName || '',
    proposedName: item.proposedName || '',
  };
}

/**
 * Attorney list when an outline is active. Otherwise the existing rename map.
 * Files left out of the outline are omitted.
 * @param {Array} items
 * @param {{ preset?: string }} [options]
 * @returns {string}
 */
export function buildRenameExportCsv(items, { preset = '' } = {}) {
  const rows = (items || []).filter((item) => item.included !== false);
  const crosswalk = rows.some((item) => item.outlineOrder);
  const header = crosswalk
    ? ['Outline Order', 'Official Exhibit Number', 'Designation', 'Citations', 'Original Filename', 'New Name']
    : ['Original Filename', 'Exhibit ID', 'Proposed Filename', 'Preset Type'];

  const body = rows.map((item) => {
    if (crosswalk) {
      const fields = crosswalkFields(item);
      return [
        fields.outlineOrder,
        fields.officialExhibitNo,
        fields.designation,
        fields.citations,
        fields.originalName,
        fields.proposedName,
      ].map(escapeCsvCell).join(',');
    }
    return [
      item.originalName,
      item.number,
      item.proposedName,
      preset,
    ].map(escapeCsvCell).join(',');
  });

  return `${header.join(',')}\n${body.join('\n')}`;
}

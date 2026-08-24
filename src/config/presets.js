/**
 * Practice-area grouped renaming presets for ExhibitKIT.
 */

export const PRACTICE_AREAS = [
  {
    id: 'litigation',
    label: 'Litigation',
    description: 'Trial presentation databases',
    presets: [
      {
        id: 'oncue',
        label: 'OnCue',
        description: 'PX001 Memo.pdf — space between ID and title',
        guideline: 'OnCue prefers no dashes in the ID. The first space separates the ID and name.',
        example: 'PX001 Memo.pdf',
      },
      {
        id: 'trialdirector',
        label: 'TrialDirector',
        description: 'PX-0001 - Memo.pdf — padded ID with dash separator',
        guideline: 'TrialDirector emphasizes leading zero padding for clean alphabetical sorting.',
        example: 'PX-0001 - Memo.pdf',
      },
    ],
  },
  {
    id: 'patent',
    label: 'Patent / IP',
    description: 'Discovery of documents & prosecution files',
    presets: [
      {
        id: 'patent-dod',
        label: 'Patent DOD',
        description: 'DOD - 12 - 2012 - Smith - Report.pdf',
        guideline: 'Matches Patent Preppers DOD output: Prefix - Doc ID - Year - Author - Title. Missing years become n.d.',
        example: 'DOD - 12 - 2012 - Smith - Report.pdf',
      },
    ],
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Your own token-based pattern',
    presets: [
      {
        id: 'custom',
        label: 'Custom Template',
        description: 'Build any pattern with template tokens',
        guideline: 'Use tokens like {Prefix}, {Number}, {Year}, {Author}, {Title}, and {DocId}.',
        example: '{Prefix}{Number} - {Description}.pdf',
      },
    ],
  },
];

export const PRESET_IDS = PRACTICE_AREAS.flatMap((area) => area.presets.map((p) => p.id));

export const DEFAULT_PRESET = 'oncue';

/** @param {string} presetId */
export function getPresetMeta(presetId) {
  for (const area of PRACTICE_AREAS) {
    const preset = area.presets.find((p) => p.id === presetId);
    if (preset) {
      return {
        ...preset,
        areaId: area.id,
        areaLabel: area.label,
      };
    }
  }
  return null;
}

/** Suggested sidebar defaults when switching presets. */
export function getPresetRuleDefaults(presetId) {
  switch (presetId) {
    case 'patent-dod':
      return {
        prefix: 'DOD',
        padLength: 0,
        customTemplate: '{Prefix} - {DocId} - {Year} - {Author} - {Title}',
      };
    case 'trialdirector':
      return { prefix: 'PX', padLength: 3 };
    case 'oncue':
      return { prefix: 'PX', padLength: 3 };
    case 'custom':
      return {
        customTemplate: '{Prefix}{Number} - {Description}',
      };
    default:
      return {};
  }
}

export const CUSTOM_TEMPLATE_TOKENS = [
  '{Prefix}',
  '{Number}',
  '{Description}',
  '{Year}',
  '{Author}',
  '{Title}',
  '{DocId}',
];

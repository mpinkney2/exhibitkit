/**
 * Practice-area grouped renaming presets for ExhibitKIT.
 */

/** Map area-specific preset IDs to core renaming engines. */
export const PRESET_ENGINE_MAP = Object.freeze({
  'family-oncue': 'oncue',
  'family-trialdirector': 'trialdirector',
  'employment-oncue': 'oncue',
  'employment-trialdirector': 'trialdirector',
  'bankruptcy-oncue': 'oncue',
  'bankruptcy-trialdirector': 'trialdirector',
});

/** @param {string} presetId */
export function resolvePresetEngine(presetId) {
  return PRESET_ENGINE_MAP[presetId] || presetId;
}

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
    id: 'family',
    label: 'Family Law',
    description: 'Domestic relations & family court exhibits',
    presets: [
      {
        id: 'family-oncue',
        label: 'Family OnCue',
        description: 'FL001 Parenting Plan.pdf — FL prefix, space-separated ID',
        guideline: 'OnCue-style naming with a Family Law exhibit prefix (default FL). Adjust prefix for your jurisdiction.',
        example: 'FL001 Parenting Plan.pdf',
      },
      {
        id: 'family-trialdirector',
        label: 'Family TrialDirector',
        description: 'FL-0001 - Parenting Plan.pdf — padded FL prefix',
        guideline: 'TrialDirector-style dashes with a Family Law prefix for domestic relations matters.',
        example: 'FL-0001 - Parenting Plan.pdf',
      },
    ],
  },
  {
    id: 'employment',
    label: 'Employment',
    description: 'Labor, EEOC, and wage-hour document sets',
    presets: [
      {
        id: 'employment-oncue',
        label: 'Employment OnCue',
        description: 'EMP001 Termination Letter.pdf — EMP prefix for labor exhibits',
        guideline: 'OnCue format with an Employment prefix (default EMP) for HR records and EEOC productions.',
        example: 'EMP001 Termination Letter.pdf',
      },
      {
        id: 'employment-trialdirector',
        label: 'Employment TrialDirector',
        description: 'EMP-0001 - Termination Letter.pdf — padded EMP prefix',
        guideline: 'TrialDirector sequencing for employment litigation and agency-response batches.',
        example: 'EMP-0001 - Termination Letter.pdf',
      },
    ],
  },
  {
    id: 'bankruptcy',
    label: 'Bankruptcy',
    description: 'Schedules, claims, and creditor document batches',
    presets: [
      {
        id: 'bankruptcy-oncue',
        label: 'Bankruptcy OnCue',
        description: 'BK001 Creditor Schedule.pdf — BK prefix for petition exhibits',
        guideline: 'OnCue format with a Bankruptcy prefix (default BK) for schedules and claims support.',
        example: 'BK001 Creditor Schedule.pdf',
      },
      {
        id: 'bankruptcy-trialdirector',
        label: 'Bankruptcy TrialDirector',
        description: 'BK-0001 - Creditor Schedule.pdf — four-digit BK padding',
        guideline: 'TrialDirector padding for large bankruptcy document sets and claims registers.',
        example: 'BK-0001 - Creditor Schedule.pdf',
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
    case 'family-oncue':
      return { prefix: 'FL', padLength: 3 };
    case 'family-trialdirector':
      return { prefix: 'FL', padLength: 3 };
    case 'employment-oncue':
      return { prefix: 'EMP', padLength: 3 };
    case 'employment-trialdirector':
      return { prefix: 'EMP', padLength: 3 };
    case 'bankruptcy-oncue':
      return { prefix: 'BK', padLength: 3 };
    case 'bankruptcy-trialdirector':
      return { prefix: 'BK', padLength: 4 };
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

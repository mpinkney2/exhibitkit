/**
 * Local how-to knowledge for the ExhibitKIT help bot.
 * Answers stay on-device; questions are never uploaded.
 */

export const HOWTO_BOT_NAME = 'Kit';

export const HOWTO_STARTER_QUESTIONS = [
  'How do I rename exhibits?',
  'How do I pick an OnCue preset?',
  'Why does PX10 sort before PX2?',
  'Are my files uploaded?',
];

export const HOWTO_KNOWLEDGE = [
  {
    id: 'rename-flow',
    question: 'How do I rename exhibits?',
    keywords: ['rename', 'renaming', 'execute', 'batch', 'process', 'start', 'workflow', 'steps', 'exhibits'],
    answer:
      'Follow the strip at the top: Select files or a folder, Review the proposed names, then click Rename. Confirm you have backups before in-place changes run. Export a CSV map first if you want an audit trail.',
  },
  {
    id: 'select-folder',
    question: 'How do I select a folder or PDFs?',
    keywords: ['select', 'folder', 'directory', 'ingest', 'drop', 'upload', 'files', 'pdf', 'sample', 'load'],
    answer:
      'Click Select Local Folder for in-place renaming, or Select PDF Files to prepare a batch. Nothing is uploaded. For a safe dry run, use Load Sample Exhibits under the drop zone.',
  },
  {
    id: 'presets',
    question: 'How do I pick a renaming preset?',
    keywords: ['preset', 'oncue', 'trialdirector', 'patent', 'dod', 'family', 'employment', 'bankruptcy', 'custom', 'practice'],
    answer:
      'Open Renaming Preset in the left sidebar. Choose a practice area, then a preset. OnCue uses a space after the ID (PX001 Memo.pdf). TrialDirector uses dashes (PX-0001 - Memo.pdf). Patent DOD uses Prefix - Doc ID - Year - Author - Title.',
  },
  {
    id: 'zero-padding',
    question: 'Why does PX10 sort before PX2?',
    keywords: ['padding', 'zero', 'sort', 'px10', 'px2', 'order', 'alphabetical', 'digits'],
    answer:
      'Computers sort names alphabetically, so PX10 comes before PX2. Set Zero Padding to 3 digits (PX001, PX002, PX010) in Exhibit ID Settings so courtroom databases stay in numeric order.',
  },
  {
    id: 'review-edit',
    question: 'How do I review or edit proposed names?',
    keywords: ['review', 'edit', 'preview', 'grid', 'description', 'sequence', 'auto', 'case', 'clean'],
    answer:
      'After ingest, the preview grid is the Review step. Double-click a cell to edit. Use Auto-Sequence, Fix Conflicts, Clean Text, or Bulk Case before you rename. Status shows Valid, conflicts, or errors.',
  },
  {
    id: 'conflicts',
    question: 'How do I fix duplicate exhibit numbers?',
    keywords: ['conflict', 'duplicate', 'fix', 'status', 'warning', 'error', 'v2'],
    answer:
      'Check the Status column. Click Fix Conflicts to append a safe _v2 (or similar) so two files never share the same proposed name. Resolve warnings before Rename.',
  },
  {
    id: 'backup',
    question: 'Do I need backups before renaming?',
    keywords: ['backup', 'safety', 'confirm', 'irreversible', 'overwrite', 'original'],
    answer:
      'Yes for in-place folder renaming. Duplicate the exhibit directory first and keep originals untouched. ExhibitKIT asks you to confirm backups before it writes new filenames. OS-level renames are not undoable outside this session.',
  },
  {
    id: 'undo',
    question: 'How do I undo a rename?',
    keywords: ['undo', 'revert', 'restore', 'history'],
    answer:
      'If this session still has rename history, use Undo in the action bar to restore original names. After you close the app or leave the folder, rely on your own backup copies.',
  },
  {
    id: 'export',
    question: 'How do I export a rename map?',
    keywords: ['export', 'csv', 'html', 'zip', 'audit', 'log', 'map'],
    answer:
      'Use Export CSV (or HTML) in the bottom action bar to save original vs proposed names. Free includes CSV/HTML. ZIP batch export and in-place rename need Case Pass or Pro.',
  },
  {
    id: 'privacy',
    question: 'Are my files uploaded?',
    keywords: ['upload', 'cloud', 'privacy', 'local', 'server', 'offline', 'confidential', 'data'],
    answer:
      'No. Parsing, preview, and renaming run in your browser on this device. ExhibitKIT does not upload PDFs, folders, or filenames. Checkout never receives exhibit data.',
  },
  {
    id: 'inplace',
    question: 'What is In-Place Mode?',
    keywords: ['inplace', 'in-place', 'toggle', 'connected', 'directory', 'chrome'],
    answer:
      'In-Place Mode is on when a local folder is connected (Chromium browsers). Rename writes directly to that folder. If the toggle is off, select files instead and download a prepared batch.',
  },
  {
    id: 'prefix-padding',
    question: 'How do I set prefix and numbering?',
    keywords: ['prefix', 'number', 'start', 'padding', 'px', 'dx', 'fl', 'emp', 'bk'],
    answer:
      'Use Exhibit ID Settings in the sidebar: Prefix (PX, DX, FL…), Start Number, and Zero Padding. Changing the Renaming Preset applies sensible defaults for that practice area.',
  },
  {
    id: 'custom-template',
    question: 'How do I use a custom filename template?',
    keywords: ['custom', 'template', 'token', 'tokens'],
    answer:
      'Choose Custom Template in Renaming Preset, then build a pattern with tokens such as {Prefix}, {Number}, and {Description}. The guideline under the sidebar shows an example as you edit.',
  },
  {
    id: 'free-limit',
    question: 'What can I do on Free vs Pro?',
    keywords: ['free', 'pro', 'limit', 'upgrade', 'case', 'pass', 'license', 'firm', 'price'],
    answer:
      'Free: preview and CSV/HTML export, up to 5 files per batch, plus unlimited sample exhibits. Case Pass ($39 / 30 days) and Pro ($149 perpetual) unlock in-place rename, ZIP export, undo, and matter profiles. Firm is coming soon.',
  },
  {
    id: 'matter-profiles',
    question: 'How do matter profiles work?',
    keywords: ['matter', 'profile', 'profiles', 'save', 'settings'],
    answer:
      'Pro and Case Pass can save prefix, padding, preset, and template settings per matter and reload them later. Look for Matter Profiles at the bottom of the sidebar.',
  },
];

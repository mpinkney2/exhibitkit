/**
 * Local how-to knowledge for the PatentPreppers ExhibitKit help bot.
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
    id: 'bates-names',
    question: 'How do Bates-style file names work?',
    keywords: ['bates', 'stamp', 'acme', 'smith000123', 'control number'],
    answer:
      'A Bates-style name has 2 to 12 letters, an optional hyphen, underscore, or space, and 4 to 10 digits, with an optional range. Review shows a Bates badge. The default numbers exhibits sequentially and keeps the Bates number in the description. You can switch that saved choice to use the Bates number as the exhibit ID. An edit in the grid overrides the choice for that file.',
  },
  {
    id: 'select-folder',
    question: 'How do I select a folder or PDFs?',
    keywords: ['select', 'folder', 'directory', 'ingest', 'drop', 'upload', 'files', 'pdf', 'sample', 'load'],
    answer:
      'Click Select Local Folder for in-place renaming, or Select Exhibit Files to prepare a batch of PDFs, video, and slides. Nothing is uploaded. Load Sample Exhibits fetches the Starter test pack as real sample PDFs. Download test pack on the same screen offers Starter, Standard, and Large fictional packs.',
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
      'Yes for in-place folder renaming. Duplicate the exhibit directory first and keep originals untouched. ExhibitKit asks you to confirm backups before it writes new filenames. OS-level renames are not undoable outside this session.',
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
      'Use Export CSV (or HTML) in the bottom action bar to save original vs proposed names. After an outline match, that export is a crosswalk: outline order, official number, designation, citations, original filename, and new name. Free includes CSV/HTML. ZIP batch export and in-place rename need Case Pass or Pro.',
  },
  {
    id: 'privacy',
    question: 'Are my files uploaded?',
    keywords: ['upload', 'cloud', 'privacy', 'local', 'server', 'offline', 'confidential', 'data'],
    answer:
      'No. Parsing, preview, and renaming run in your browser on this device. ExhibitKit does not upload PDFs, folders, or filenames. Checkout never receives exhibit data.',
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
      'Choose Custom Template or Outline staging in Renaming Preset. Tokens include {Prefix}, {Number}, {Description}, {Seq}, {ExhibitNo}, {ShortDesc}, and {Type}. {ExhibitNo} keeps the official number as written. {Type} adds V for video and D for a demonstrative. The guideline under the sidebar shows an example as you edit.',
  },
  {
    id: 'free-limit',
    question: 'What can I do on Free vs Pro?',
    keywords: ['free', 'pro', 'limit', 'upgrade', 'case', 'pass', 'license', 'firm', 'price'],
    answer:
      'Free: preview and CSV/HTML export, outline matching and a crosswalk, up to 5 files per batch, plus unlimited sample exhibits. Case Pass ($39 / 30 days) and Pro ($149 perpetual) unlock larger batches, in-place rename, ZIP export, undo, and matter profiles. Firm is coming soon.',
  },
  {
    id: 'matter-profiles',
    question: 'How do matter profiles work?',
    keywords: ['matter', 'profile', 'profiles', 'save', 'settings'],
    answer:
      'Pro and Case Pass can save prefix, padding, preset, and template settings per matter and reload them later. That includes the Outline staging pattern. Look for Matter Profiles at the bottom of the sidebar.',
  },
  {
    id: 'outline-order',
    question: 'How do I stage exhibits in outline order?',
    keywords: ['outline', 'hot', 'seat', 'designation', 'crosswalk', 'paste', 'staging', 'page', 'line', 'citation'],
    answer:
      'Load the exhibit folder, then paste citations in outline order and click Match outline. ExhibitKit matches the official number and tolerates padding, spacing, case, and hyphen variants. Ambiguous rows let you pick a file. Missing citations are listed. A file cited twice stays one row and keeps both citations. Page, page range, and page:line text become an editable Designation. Use staging names for {Seq}_{ExhibitNo}_{ShortDesc}. The CSV and HTML export is the crosswalk. Matching stays on this device. Free covers a batch of 5 files. Case Pass or Pro covers a larger folder, Matter Profiles, and ZIP or in-place rename of the staged copies.',
  },
];

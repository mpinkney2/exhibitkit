/**
 * ExhibitKit public pricing catalog and comparison matrix.
 * Amounts are USD. Payment links are configuration-only — never include evidence metadata.
 */

export const PRODUCT_NAME = 'ExhibitKit';

export const PRICING = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    cadence: 'forever',
    cta: 'Build an exhibit free',
    description: 'Import one conversation, redact what matters, and export a clean PDF — all on your device.',
  },
  case_pass: {
    id: 'case_pass',
    name: 'Case Pass',
    price: 39,
    priceLabel: '$39',
    cadence: 'one time · 30 days',
    cta: 'Get a 30-day Case Pass',
    description: 'All Pro capabilities for 30 days. No recurring billing. Built for a current filing deadline.',
  },
  pro: {
    id: 'pro_perpetual',
    name: 'ExhibitKit Pro',
    price: 149,
    priceLabel: '$149',
    cadence: 'one time',
    label: 'Perpetual license',
    popular: true,
    cta: 'Get ExhibitKit Pro',
    description: 'Keep the purchased version permanently. Twelve months of product updates and support included.',
    updatesRenewal: {
      price: 49,
      priceLabel: '$49',
      cadence: 'per year',
      note: 'Optional after year one. Required only for future updates and support — not an automatic subscription.',
    },
  },
  firm: {
    id: 'firm',
    name: 'Firm',
    price: 399,
    priceLabel: 'From $399',
    cadence: 'contact us',
    cta: 'Contact us',
    comingSoon: true,
    description: 'Five-user license, shared organization presets, and central license administration.',
  },
};

export const PRIVACY_PAYMENT_NOTICE =
  'Payment is processed separately. Your evidence never enters the payment system.';

export const PERPETUAL_CLARIFICATION =
  'Your purchased version continues working permanently. After the first year, renewal is optional and is only required for future updates and support.';

/** Feature rows for the public comparison table. status: available | coming_soon | free | pro */
export const COMPARISON_FEATURES = [
  { id: 'import_one', label: 'Import one conversation at a time', free: true, case_pass: true, pro: true },
  { id: 'review_select', label: 'Review and select messages', free: true, case_pass: true, pro: true },
  { id: 'true_redaction', label: 'True redaction (content removed)', free: true, case_pass: true, pro: true },
  { id: 'clean_pdf', label: 'Clean PDF generation', free: true, case_pass: true, pro: true },
  { id: 'seq_refs', label: 'Basic sequential message & page references', free: true, case_pass: true, pro: true },
  { id: 'local_only', label: 'Local browser processing — no evidence upload', free: true, case_pass: true, pro: true },
  { id: 'no_account', label: 'No account required', free: true, case_pass: true, pro: true },
  { id: 'no_watermark', label: 'No watermark on output', free: true, case_pass: true, pro: true },
  { id: 'source_hash', label: 'SHA-256 source fingerprinting', free: true, case_pass: true, pro: true },
  { id: 'declaration', label: 'Declaration-of-authenticity template', free: true, case_pass: true, pro: true },
  { id: 'multi_exhibit', label: 'Multiple exhibits per project', free: false, case_pass: true, pro: true },
  { id: 'naming_presets', label: 'Saved reusable naming presets', free: false, case_pass: true, pro: true },
  { id: 'bates', label: 'Advanced Bates and exhibit numbering', free: false, case_pass: true, pro: true },
  { id: 'cover', label: 'Exhibit cover pages', free: false, case_pass: true, pro: true },
  { id: 'index', label: 'Exhibit index and evidence manifest', free: false, case_pass: true, pro: true },
  { id: 'binder', label: 'Combined, hyperlinked PDF binder', free: false, case_pass: true, pro: true },
  { id: 'zip', label: 'Batch file naming and organized ZIP export', free: false, case_pass: true, pro: true },
  { id: 'integrity', label: 'Source-integrity report', free: false, case_pass: true, pro: true },
  { id: 'priority', label: 'Priority support', free: false, case_pass: true, pro: true },
  { id: 'local_ai', label: 'Optional local-only AI review', free: false, case_pass: 'coming_soon', pro: 'coming_soon' },
];

export const PRICING_FAQ = [
  {
    q: 'What does a perpetual license mean?',
    a: 'You keep the ExhibitKit Pro version you purchased permanently. It does not expire after 30 days or at the end of the update period.',
  },
  {
    q: 'Are updates required after the first year?',
    a: 'No. Renewal is optional and is only required if you want future product updates and support. Your purchased version continues working without renewal.',
  },
  {
    q: 'What happens when a Case Pass expires?',
    a: 'You lose access to Pro generation features for new work. Locally saved project downloads and previously generated files on your device are not deleted.',
  },
  {
    q: 'Does ExhibitKit upload my evidence?',
    a: 'No. Message exports and generated exhibits are processed in your browser on your device. Payment is handled separately and never receives evidence content.',
  },
  {
    q: 'Does ExhibitKit guarantee court admissibility?',
    a: 'No. ExhibitKit prepares organized, tamper-evident exhibits and documentation to support your authentication process. Admissibility depends on applicable rules of evidence and how counsel presents the materials. ExhibitKit does not certify or authenticate authorship.',
  },
  {
    q: 'What does the SHA-256 fingerprint prove?',
    a: 'The hash establishes whether the source file has changed since it was fingerprinted. It does not prove who authored the messages.',
  },
];

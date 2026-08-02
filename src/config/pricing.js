/**
 * Central ExhibitKIT pricing configuration.
 * Single source of truth for plan IDs, display prices, CTAs, feature matrices, and FAQ copy.
 * Stripe price IDs are read from env var NAMES listed here — never trust client-submitted amounts.
 */

export const PLAN_IDS = Object.freeze({
  FREE: 'free',
  CASE_PASS: 'case_pass',
  PRO: 'pro_perpetual',
  FIRM: 'firm',
});

/** Maximum real PDF files allowed per Free batch. Not a one-time consume limit. */
export const FREE_MAX_FILES_PER_BATCH = 5;

/** Case Pass duration in consecutive days from purchase. */
export const CASE_PASS_DURATION_DAYS = 30;

/** Months of updates/support included with a Pro purchase. */
export const PRO_UPDATES_INCLUDED_MONTHS = 12;

/**
 * Ordered plans for pricing UI (Free → Case Pass → Pro → Firm).
 */
export const PLANS = Object.freeze([
  {
    id: PLAN_IDS.FREE,
    name: 'Free',
    displayPrice: '$0',
    priceUsd: 0,
    billingLabel: 'forever',
    badge: null,
    cta: 'Rename exhibits free',
    ctaShort: 'Start free',
    purchaseAction: 'launch_free',
    stripePriceEnv: null,
    features: [
      { text: 'Unlimited sample/demo workflow', available: true },
      { text: 'Up to 5 files per batch', available: true },
      { text: 'Parse, preview, and edit proposed filenames', available: true },
      { text: 'Basic sequential numbering', available: true },
      { text: 'Standard CSV/HTML export', available: true },
      { text: 'Local processing — no account or watermark', available: true },
    ],
    clarification: null,
  },
  {
    id: PLAN_IDS.CASE_PASS,
    name: 'Case Pass',
    displayPrice: '$39',
    priceUsd: 39,
    billingLabel: 'one-time · 30 days',
    badge: null,
    cta: 'Get a 30-day Case Pass',
    ctaShort: 'Get Case Pass',
    purchaseAction: 'checkout',
    supportingCopy: 'Ideal for an active case, hearing, or filing deadline.',
    stripePriceEnv: 'VITE_STRIPE_PRICE_CASE_PASS',
    stripePriceEnvServer: 'STRIPE_PRICE_CASE_PASS',
    features: [
      { text: 'All Pro renaming features for 30 consecutive days', available: true },
      { text: 'Unlimited file batches', available: true },
      { text: 'In-place renaming', available: true },
      { text: 'Matter Profiles and reusable presets', available: true },
      { text: 'Advanced prefix, padding, and filename templates', available: true },
      { text: 'Undo, ZIP, and supported batch exports', available: true },
      { text: 'No subscription and no automatic renewal', available: true },
    ],
    clarification:
      'When your Case Pass expires, existing exports remain accessible. Expiration only prevents new Pro-level renames and exports.',
  },
  {
    id: PLAN_IDS.PRO,
    name: 'ExhibitKit Pro',
    displayPrice: '$149',
    priceUsd: 149,
    billingLabel: 'one-time · perpetual license',
    badge: 'Best value',
    cta: 'Get ExhibitKit Pro',
    ctaShort: 'Get Pro',
    purchaseAction: 'checkout',
    stripePriceEnv: 'VITE_STRIPE_PRICE_PRO',
    stripePriceEnvServer: 'STRIPE_PRICE_PRO',
    features: [
      { text: 'Permanent Pro renaming access — does not expire', available: true },
      { text: 'Unlimited batches and in-place renaming', available: true },
      { text: 'Matter Profiles and reusable presets', available: true },
      { text: 'Advanced numbering and filename templates', available: true },
      { text: 'Undo, ZIP, and supported batch exports', available: true },
      { text: '12 months of updates and support included', available: true },
    ],
    clarification:
      'Your Pro access does not expire. Your purchase includes 12 months of updates and support. Renewal after that period is optional.',
    licenseLabel: 'Perpetual license',
  },
  {
    id: PLAN_IDS.FIRM,
    name: 'Firm',
    displayPrice: 'Starting at $399',
    priceUsd: 399,
    billingLabel: 'team licensing',
    badge: null,
    cta: 'Contact us',
    ctaShort: 'Contact us',
    purchaseAction: 'contact',
    contactEmail: 'support@patentpreppers.com',
    stripePriceEnv: null,
    features: [
      { text: 'Team licensing for multiple workstations', available: false, planned: true },
      { text: 'Shared organization naming presets', available: false, planned: true },
      { text: 'Central license management', available: false, planned: true },
      { text: 'Priority onboarding', available: false, planned: true },
    ],
    clarification:
      'Firm licensing is not available for self-serve purchase yet. Contact us for availability. Planned capabilities are listed for planning only.',
  },
]);

/** Informational renewal SKUs — not purchasable until renewal checkout is implemented. */
export const RENEWAL_SKUS = Object.freeze({
  proUpdatesSupport: {
    id: 'pro_updates_support',
    displayPrice: '$49',
    priceUsd: 49,
    billingLabel: 'per year',
    informationalOnly: true,
    description:
      'Optional Updates & Support for Pro after the included first year. Renewal is never required to keep Pro renaming access.',
  },
  firmUpdatesSupport: {
    id: 'firm_updates_support',
    displayPrice: '$129',
    priceUsd: 129,
    billingLabel: 'per year',
    informationalOnly: true,
    description:
      'Optional Updates & Support for Firm after the included first year. Renewal is never required to keep entitled access.',
  },
});

/** Simple chooser guidance shown above/beside the plan grid. */
export const PLAN_CHOOSER = Object.freeze([
  { audience: 'Occasional basic use', planId: PLAN_IDS.FREE },
  { audience: 'One immediate matter', planId: PLAN_IDS.CASE_PASS },
  { audience: 'Ongoing individual use', planId: PLAN_IDS.PRO },
  { audience: 'Multiple staff members', planId: PLAN_IDS.FIRM },
]);

export const SUPPORT_EMAIL = 'support@patentpreppers.com';

/**
 * Required pricing FAQ content (customer-facing).
 */
export const PRICING_FAQ = Object.freeze([
  {
    id: 'perpetual-license',
    question: 'What does perpetual license mean?',
    answer:
      'A perpetual license means your ExhibitKit Pro renaming access does not expire. You keep the Pro capabilities included with your purchase. The first 12 months of ordinary updates and support are included. A future separately marketed major upgrade may require an optional upgrade purchase. Declining optional renewal never removes your Pro access.',
  },
  {
    id: 'stop-after-one-year',
    question: 'Will ExhibitKit stop working after one year?',
    answer:
      'No. Pro access does not expire. After the included 12 months of updates and support, optional renewal is only for continued updates and priority support — not to retain the Pro renaming features you already purchased.',
  },
  {
    id: 'update-renewal-required',
    question: 'Is the $49 update renewal required?',
    answer:
      'No. The $49/year Updates & Support renewal is optional. It is never required to keep using your purchased Pro access. We do not automatically enroll you in renewal.',
  },
  {
    id: 'case-pass-auto-renew',
    question: 'Does the Case Pass renew automatically?',
    answer:
      'No. Case Pass is a one-time purchase for 30 consecutive days. There is no subscription and no automatic renewal.',
  },
  {
    id: 'case-pass-expires',
    question: 'What happens when my Case Pass expires?',
    answer:
      'Existing exports remain accessible. Expiration only prevents new Pro-level renames and exports. You can continue using Free (including up to 5 files per batch), purchase another Case Pass, or upgrade to Pro.',
  },
  {
    id: 'evidence-to-stripe',
    question: 'Are my evidence files sent to the payment processor?',
    answer:
      'No. ExhibitKIT processes filenames and files locally in your browser. Payment checkout only involves billing details with Stripe. Filenames, matter names, export data, and document contents are never sent to the payment processor.',
  },
  {
    id: 'continue-free',
    question: 'Can I continue using the free version?',
    answer:
      'Yes. Free remains available with unlimited sample/demo use and up to 5 real files per batch, with parse, preview, edit, basic sequential numbering, and standard CSV/HTML export — no account, credit card, or watermark.',
  },
]);

export function getPlanById(planId) {
  return PLANS.find((p) => p.id === planId) || null;
}

export function getPlanOrder() {
  return PLANS.map((p) => p.id);
}

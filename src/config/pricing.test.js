import { describe, it, expect } from 'vitest';
import {
  PLANS,
  PLAN_IDS,
  PLAN_CHOOSER,
  PRICING_FAQ,
  RENEWAL_SKUS,
  FREE_MAX_FILES_PER_BATCH,
  getPlanOrder,
  getPlanById,
} from './pricing.js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED_FAQ_IDS = [
  'perpetual-license',
  'stop-after-one-year',
  'update-renewal-required',
  'case-pass-auto-renew',
  'case-pass-expires',
  'evidence-to-stripe',
  'continue-free',
];

const BANNED_PHRASES = [
  'lifetime license',
  'Lifetime license',
  'message-to-exhibit',
  'message evidence',
  'true redaction',
  'Bates numbering',
  'bates numbering',
  'hyperlinked binder',
  'court binder',
  'conversation project',
  'multi-conversation',
];

function collectCustomerFacingFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      collectCustomerFacingFiles(path, acc);
    } else if (/\.(js|jsx|css|html)$/.test(name) && !/\.test\./.test(name)) {
      acc.push(path);
    }
  }
  return acc;
}

describe('central pricing configuration', () => {
  it('orders plans Free → Case Pass → Pro → Firm', () => {
    expect(getPlanOrder()).toEqual([
      PLAN_IDS.FREE,
      PLAN_IDS.CASE_PASS,
      PLAN_IDS.PRO,
      PLAN_IDS.FIRM,
    ]);
  });

  it('uses the approved display prices', () => {
    expect(getPlanById(PLAN_IDS.FREE).displayPrice).toBe('$0');
    expect(getPlanById(PLAN_IDS.FREE).priceUsd).toBe(0);
    expect(getPlanById(PLAN_IDS.CASE_PASS).displayPrice).toBe('$39');
    expect(getPlanById(PLAN_IDS.CASE_PASS).priceUsd).toBe(39);
    expect(getPlanById(PLAN_IDS.PRO).displayPrice).toBe('$149');
    expect(getPlanById(PLAN_IDS.PRO).priceUsd).toBe(149);
    expect(getPlanById(PLAN_IDS.FIRM).displayPrice).toBe('Starting at $399');
    expect(getPlanById(PLAN_IDS.FIRM).priceUsd).toBe(399);
    expect(RENEWAL_SKUS.proUpdatesSupport.displayPrice).toBe('$49');
    expect(RENEWAL_SKUS.firmUpdatesSupport.displayPrice).toBe('$129');
    expect(RENEWAL_SKUS.proUpdatesSupport.informationalOnly).toBe(true);
  });

  it('marks Pro as Best value and uses perpetual license labeling', () => {
    const pro = getPlanById(PLAN_IDS.PRO);
    expect(pro.badge).toBe('Best value');
    expect(pro.licenseLabel).toBe('Perpetual license');
    expect(pro.clarification).toMatch(/Pro access does not expire/i);
    expect(pro.clarification).not.toMatch(/lifetime/i);
  });

  it('sets Free file limit and Free CTA copy', () => {
    expect(FREE_MAX_FILES_PER_BATCH).toBe(5);
    expect(getPlanById(PLAN_IDS.FREE).cta).toBe('Rename exhibits free');
    expect(getPlanById(PLAN_IDS.FREE).features.some((f) => /Up to 5 files per batch/i.test(f.text))).toBe(true);
  });

  it('sets Case Pass and Pro CTAs', () => {
    expect(getPlanById(PLAN_IDS.CASE_PASS).cta).toBe('Get a 30-day Case Pass');
    expect(getPlanById(PLAN_IDS.PRO).cta).toBe('Get ExhibitKit Pro');
    expect(getPlanById(PLAN_IDS.FIRM).purchaseAction).toBe('contact');
  });

  it('includes chooser guidance for all four audiences', () => {
    expect(PLAN_CHOOSER.map((c) => c.planId)).toEqual(getPlanOrder());
  });

  it('includes all required pricing FAQ entries', () => {
    const ids = PRICING_FAQ.map((f) => f.id);
    for (const id of REQUIRED_FAQ_IDS) {
      expect(ids).toContain(id);
    }
    expect(PRICING_FAQ.every((f) => f.question && f.answer)).toBe(true);
  });

  it('does not contain banned customer-facing claims in pricing config or UI source', () => {
    const roots = [
      join(process.cwd(), 'src/config'),
      join(process.cwd(), 'src/components'),
      join(process.cwd(), 'src/utils/checkout.js'),
      join(process.cwd(), 'src/utils/entitlement.js'),
      join(process.cwd(), 'index.html'),
    ];
    const files = [];
    for (const root of roots) {
      const st = statSync(root);
      if (st.isDirectory()) collectCustomerFacingFiles(root, files);
      else files.push(root);
    }

    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const phrase of BANNED_PHRASES) {
        expect(text.toLowerCase(), `${file} contains banned phrase: ${phrase}`).not.toContain(phrase.toLowerCase());
      }
      // Former SKU must not appear as current offer in UI/config
      if (file.includes('pricing.js') || file.includes('LandingPage') || file.includes('PricingModal')) {
        expect(text).not.toMatch(/\$150/);
      }
    }
  });

  it('exposes Stripe price env names for paid plans only', () => {
    expect(getPlanById(PLAN_IDS.CASE_PASS).stripePriceEnv).toBe('VITE_STRIPE_PRICE_CASE_PASS');
    expect(getPlanById(PLAN_IDS.PRO).stripePriceEnv).toBe('VITE_STRIPE_PRICE_PRO');
    expect(getPlanById(PLAN_IDS.FREE).stripePriceEnv).toBeNull();
    expect(getPlanById(PLAN_IDS.FIRM).stripePriceEnv).toBeNull();
    expect(PLANS).toHaveLength(4);
  });
});

import {
  getEntitlement,
  clearEntitlement,
  applyCasePassForTesting,
  applyExpiredCasePassForTesting,
  applyPendingCasePassForTesting,
  applyProForTesting,
  applyFounderUnlimitedPro,
} from '../utils/entitlement.js';
import { DEV_TEST_KEY } from '../utils/license.js';

const btn = {
  border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
  background: 'var(--color-surface-2, #1f2937)',
  color: 'inherit',
  borderRadius: 6,
  padding: '7px 9px',
  cursor: 'pointer',
  fontSize: 11.5,
  textAlign: 'left',
};

const btnPrimary = {
  ...btn,
  background: 'rgba(245, 158, 11, 0.18)',
  borderColor: 'rgba(245, 158, 11, 0.5)',
  fontWeight: 600,
};

/**
 * Development-only founder stage controls. Production builds omit this module.
 */
export default function FounderDevStages({ onApply }) {
  return (
    <>
      <section style={{ display: 'grid', gap: 6 }}>
        <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
          Founder unlimited
        </strong>
        <button
          type="button"
          style={btnPrimary}
          onClick={() => onApply(
            'Founder unlimited Pro (no payment)',
            () => applyFounderUnlimitedPro(),
            { enterWorkspace: true },
          )}
        >
          Founder Pro — unlimited renaming (skip payment)
        </button>
        <div style={{ color: 'var(--color-text-muted, #9ca3af)', lineHeight: 1.4 }}>
          Development builds only. Applies Pro renaming on this browser. Not a Stripe purchase.
        </div>
      </section>

      <section style={{ display: 'grid', gap: 6 }}>
        <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
          Entitlement stages
        </strong>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button type="button" style={btn} onClick={() => onApply('Free', () => { clearEntitlement(); return getEntitlement(); })}>
            Free
          </button>
          <button type="button" style={btn} onClick={() => onApply('Case Pass active', () => applyCasePassForTesting())}>
            Case Pass active
          </button>
          <button type="button" style={btn} onClick={() => onApply('Case Pass expired', () => applyExpiredCasePassForTesting())}>
            Case Pass expired
          </button>
          <button type="button" style={btn} onClick={() => onApply('Case Pass pending', () => applyPendingCasePassForTesting())}>
            Case Pass pending
          </button>
          <button
            type="button"
            style={btn}
            onClick={() => onApply('Pro (updates included)', () => applyProForTesting(), { enterWorkspace: true })}
          >
            Pro + updates
          </button>
          <button type="button" style={btn} onClick={() => onApply('Pro (updates lapsed)', () => applyProForTesting({ updatesLapsed: true }), { enterWorkspace: true })}>
            Pro updates lapsed
          </button>
        </div>
      </section>

      <div style={{ color: '#9ca3af' }}>
        Dev license key: <code>{DEV_TEST_KEY}</code>
      </div>
    </>
  );
}

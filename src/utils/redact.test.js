import { describe, expect, it } from 'vitest';
import { applyRedactions, prepareMessagesForExport, redactMessage } from './redact';

describe('true redaction', () => {
  it('removes phrases rather than overlaying them', () => {
    const out = applyRedactions('Account ending 4421 is on file', [{ phrase: '4421' }]);
    expect(out).toBe('Account ending [REDACTED] is on file');
    expect(out).not.toContain('4421');
  });

  it('fully redacts a message body', () => {
    const msg = redactMessage({ body: 'secret address', fullyRedacted: true });
    expect(msg.body).toBe('[REDACTED]');
    expect(msg.redacted).toBe(true);
  });

  it('export prep drops original bodies and deselected messages', () => {
    const prepared = prepareMessagesForExport([
      { id: '1', seq: 1, sender: 'A', body: 'keep me', selected: true },
      { id: '2', seq: 2, sender: 'B', body: 'drop me', selected: false },
      { id: '3', seq: 3, sender: 'C', body: 'ssn 123', selected: true, redactions: [{ phrase: '123' }] },
    ]);
    expect(prepared).toHaveLength(2);
    expect(prepared.find((m) => m.id === '2')).toBeUndefined();
    expect(prepared.find((m) => m.id === '3').body).toContain('[REDACTED]');
    expect(prepared.find((m) => m.id === '3').body).not.toContain('123');
  });
});

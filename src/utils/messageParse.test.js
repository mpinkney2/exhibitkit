import { describe, expect, it } from 'vitest';
import { getSampleConversation, parseMessageExport } from './messageParse';

describe('message parsing', () => {
  it('parses JSON conversation arrays', () => {
    const text = JSON.stringify([
      { sender: 'Alex', timestamp: '2024-01-01', body: 'Hello' },
      { from: 'Jordan', date: '2024-01-02', text: 'Hi' },
    ]);
    const result = parseMessageExport(text, { fileName: 'chat.json' });
    expect(result.format).toBe('json');
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].seq).toBe(1);
  });

  it('parses CSV and plain text', () => {
    const csv = parseMessageExport(
      'sender,timestamp,body\nAlex,10:00,First\nJordan,10:01,Second',
      { fileName: 'a.csv' }
    );
    expect(csv.format).toBe('csv');
    expect(csv.messages).toHaveLength(2);

    const plain = parseMessageExport(
      '[2024-01-01] Alex: One\n[2024-01-01] Jordan: Two',
      { fileName: 'a.txt' }
    );
    expect(plain.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('provides a sample conversation for free onboarding', () => {
    const sample = getSampleConversation();
    expect(sample.messages.length).toBeGreaterThan(2);
  });
});

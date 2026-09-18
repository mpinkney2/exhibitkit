import { describe, expect, it } from 'vitest';
import { answerHowTo, tokenizeHowToQuery } from './howtoBot';

describe('tokenizeHowToQuery', () => {
  it('drops stop words and expands aliases', () => {
    const tokens = tokenizeHowToQuery('How do I upload a folder?');
    expect(tokens).toContain('folder');
    expect(tokens).toContain('privacy');
    expect(tokens).not.toContain('how');
  });
});

describe('answerHowTo', () => {
  it('answers rename workflow questions', () => {
    const result = answerHowTo('How do I rename exhibits?');
    expect(result.id).toBe('rename-flow');
    expect(result.answer.toLowerCase()).toContain('select');
  });

  it('explains OnCue vs TrialDirector presets', () => {
    const result = answerHowTo('How do I pick an OnCue preset?');
    expect(result.id).toBe('presets');
    expect(result.answer).toMatch(/OnCue/i);
  });

  it('explains PX10 before PX2 sorting', () => {
    const result = answerHowTo('Why does PX10 sort before PX2?');
    expect(result.id).toBe('zero-padding');
    expect(result.answer).toMatch(/padding/i);
  });

  it('confirms files stay local', () => {
    const result = answerHowTo('Are my files uploaded?');
    expect(result.id).toBe('privacy');
    expect(result.answer.toLowerCase()).toContain('not upload');
  });

  it('falls back with starter questions when unmatched', () => {
    const result = answerHowTo('what is the weather in court');
    expect(result.id).toBe('fallback');
    expect(result.related.length).toBeGreaterThan(0);
  });
});

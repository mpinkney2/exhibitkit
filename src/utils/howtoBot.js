import { HOWTO_KNOWLEDGE, HOWTO_STARTER_QUESTIONS } from '../config/howtoKnowledge';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'how', 'i', 'in', 'is',
  'it', 'my', 'of', 'on', 'or', 'the', 'to', 'what', 'why', 'with', 'you',
]);

const ALIASES = {
  folder: ['select', 'directory', 'ingest'],
  directory: ['select', 'folder', 'ingest'],
  ingest: ['select', 'folder'],
  upload: ['privacy', 'local'],
  uploaded: ['privacy', 'local'],
  cloud: ['privacy'],
  oncue: ['preset'],
  trialdirector: ['preset'],
  patent: ['preset', 'dod'],
  padding: ['zero', 'sort'],
  duplicate: ['conflict'],
  duplicates: ['conflict'],
  zip: ['export'],
  csv: ['export'],
  license: ['pro', 'free'],
  pricing: ['pro', 'free'],
};

export function tokenizeHowToQuery(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .flatMap((token) => {
      if (!token || STOP_WORDS.has(token) || token.length < 2) return [];
      const extra = ALIASES[token] || [];
      return [token, ...extra];
    });
}

function scoreEntry(entry, tokens) {
  if (!tokens.length) return 0;
  const keywordSet = new Set(entry.keywords.map((k) => k.toLowerCase()));
  const question = entry.question.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (keywordSet.has(token)) score += 3;
    else if (question.includes(token)) score += 2;
  }
  return score;
}

/**
 * Match a how-to question to the local knowledge base.
 * @param {string} query
 * @returns {{ id: string, question: string, answer: string, related: string[] } | { id: 'fallback', question: string, answer: string, related: string[] }}
 */
export function answerHowTo(query) {
  const tokens = tokenizeHowToQuery(query);
  const ranked = HOWTO_KNOWLEDGE
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const related = ranked
    .slice(1, 4)
    .filter((row) => row.score > 0)
    .map((row) => row.entry.question);

  if (!best || best.score < 3) {
    return {
      id: 'fallback',
      question: String(query || '').trim(),
      answer:
        'I can help with how-to steps for ExhibitKIT—selecting files, presets, padding, conflicts, rename, export, and privacy. Try one of these:',
      related: HOWTO_STARTER_QUESTIONS,
    };
  }

  return {
    id: best.entry.id,
    question: best.entry.question,
    answer: best.entry.answer,
    related: related.slice(0, 3),
  };
}

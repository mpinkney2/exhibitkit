/**
 * Collision-safe exhibit file naming for PDF/ZIP exports.
 */

export function sanitizeFileStem(name, fallback = 'exhibit') {
  const cleaned = Array.from(name || '')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      if (code < 32) return false;
      return !'<>:"/\\|?*'.includes(ch);
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  return cleaned || fallback;
}

/**
 * Ensure unique filenames within a set.
 * @param {string[]} names - desired names including extensions
 * @returns {string[]}
 */
export function resolveFileNameCollisions(names) {
  const seen = new Map();
  return names.map((raw) => {
    // Preserve extension if present
    const lastDot = raw.lastIndexOf('.');
    const stem = lastDot > 0 ? sanitizeFileStem(raw.slice(0, lastDot)) : sanitizeFileStem(raw);
    const ext = lastDot > 0 ? raw.slice(lastDot) : '';

    const base = stem || 'exhibit';
    const count = seen.get(base.toLowerCase()) || 0;
    seen.set(base.toLowerCase(), count + 1);
    if (count === 0) return `${base}${ext}`;
    return `${base}_${count + 1}${ext}`;
  });
}

export function buildExhibitFileName({ label, index, prefix = 'EX' }) {
  const num = String(index).padStart(3, '0');
  const stem = sanitizeFileStem(`${prefix}${num}_${label || 'Messages'}`, `${prefix}${num}`);
  return `${stem}.pdf`;
}

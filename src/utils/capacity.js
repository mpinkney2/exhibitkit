/**
 * Capacity guidance and soft limits for large-volume exhibit processing.
 * Values are informed by local benchmarks (see scripts/benchmark-exhibits.mjs).
 */

/** Soft guidance for interactive browser sessions (not hard blocks). */
export const CAPACITY = Object.freeze({
  /** Comfortable interactive Pro export without long waits */
  comfortableExhibits: 25,
  /** Upper bound for a single interactive Pro package export */
  recommendedMaxExhibits: 75,
  /** Multipage: messages that typically span multiple PDF pages */
  multipageMessageThreshold: 40,
  /** Messages per exhibit before export may feel slow on mid-range laptops */
  recommendedMaxMessagesPerExhibit: 400,
  /** Total messages across a project for interactive export */
  recommendedMaxTotalMessages: 8000,
  /** Batch size when generating many exhibit PDFs to bound peak memory */
  exportBatchSize: 10,
});

/**
 * Assess a project against capacity guidance.
 * @returns {{ ok: boolean, level: 'ok'|'caution'|'high', warnings: string[] }}
 */
export function assessProjectCapacity(project) {
  const exhibits = project?.exhibits || [];
  const exhibitCount = exhibits.length;
  const totalMessages = exhibits.reduce(
    (n, ex) => n + (ex.messages || []).filter((m) => m.selected !== false).length,
    0
  );
  const multipageCount = exhibits.filter(
    (ex) =>
      (ex.messages || []).filter((m) => m.selected !== false).length >=
      CAPACITY.multipageMessageThreshold
  ).length;
  const maxMessages = exhibits.reduce((max, ex) => {
    const count = (ex.messages || []).filter((m) => m.selected !== false).length;
    return Math.max(max, count);
  }, 0);

  const warnings = [];
  if (exhibitCount > CAPACITY.recommendedMaxExhibits) {
    warnings.push(
      `This project has ${exhibitCount} exhibits (recommended interactive max ${CAPACITY.recommendedMaxExhibits}). Export in batches for best results.`
    );
  } else if (exhibitCount > CAPACITY.comfortableExhibits) {
    warnings.push(
      `Large project: ${exhibitCount} exhibits. Export may take longer; keep the tab focused.`
    );
  }
  if (maxMessages > CAPACITY.recommendedMaxMessagesPerExhibit) {
    warnings.push(
      `At least one exhibit has ${maxMessages} messages (recommended ≤ ${CAPACITY.recommendedMaxMessagesPerExhibit}).`
    );
  }
  if (totalMessages > CAPACITY.recommendedMaxTotalMessages) {
    warnings.push(
      `Total selected messages: ${totalMessages} (recommended ≤ ${CAPACITY.recommendedMaxTotalMessages} per export).`
    );
  }
  if (multipageCount > 0) {
    warnings.push(
      `${multipageCount} multipage exhibit(s) detected (≥ ${CAPACITY.multipageMessageThreshold} messages each).`
    );
  }

  let level = 'ok';
  if (warnings.some((w) => /recommended interactive max|Total selected/.test(w))) level = 'high';
  else if (warnings.length) level = 'caution';

  return {
    ok: level !== 'high',
    level,
    warnings,
    stats: { exhibitCount, totalMessages, multipageCount, maxMessages },
  };
}

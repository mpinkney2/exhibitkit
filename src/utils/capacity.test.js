import { describe, expect, it } from 'vitest';
import { assessProjectCapacity, CAPACITY } from './capacity';

describe('capacity guidance', () => {
  it('exposes soft operating limits', () => {
    expect(CAPACITY.comfortableExhibits).toBe(25);
    expect(CAPACITY.recommendedMaxExhibits).toBe(75);
    expect(CAPACITY.multipageMessageThreshold).toBe(40);
  });

  it('flags large multipage projects', () => {
    const project = {
      exhibits: Array.from({ length: 80 }, (_, i) => ({
        id: `e${i}`,
        messages: Array.from({ length: 50 }, (__, j) => ({
          id: `${i}-${j}`,
          selected: true,
        })),
      })),
    };
    const assessment = assessProjectCapacity(project);
    expect(assessment.level).toBe('high');
    expect(assessment.stats.exhibitCount).toBe(80);
    expect(assessment.stats.multipageCount).toBe(80);
    expect(assessment.warnings.length).toBeGreaterThan(0);
  });
});

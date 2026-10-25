import { describe, expect, it } from 'vitest';
import { ringLifts } from '../src/three-view';
import { ringFloating } from '../src/mission-model';

describe('3D ring card', () => {
  it('stacks released rings by the same rule as the 2D bench', () => {
    // Two rings with different tops float (the bench's success case for rounds 1–2).
    expect(ringFloating('N', 'S')).toBe(true);
    const floating = ringLifts(['N', 'S'], true), touching = ringLifts(['N', 'N'], true);
    expect(floating[1]).toBeGreaterThan(touching[1]);
    // Before release every ring waits at its test slot, so the heights do not reveal the answer.
    expect(ringLifts(['N', 'N'], false)).toEqual(ringLifts(['N', 'S'], false));
  });
});

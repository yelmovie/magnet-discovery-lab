import { describe, expect, it } from 'vitest';
import { handPose, handRelease, afterHandRelease } from '../src/experiment-hand';

describe('물체를 잡았다가 놓는 손', () => {
  it('손가락 끝을 물체에 맞추고 놓을 때 위쪽으로 물러난다', () => {
    const contact = { x: 63, y: 52 }, held = handPose(contact, 0), open = handPose(contact, 1);
    expect(held.x + held.size * .114).toBeCloseTo(contact.x * 12.8);
    expect(held.y + held.size * .89).toBeCloseTo(contact.y * 7.2);
    expect(open.y).toBeLessThan(held.y);
    expect(open.x).toBeGreaterThan(held.x);
  });
  it('손을 완전히 놓기 전에는 고리가 자석의 힘으로 움직이지 않는다', () => {
    expect(afterHandRelease(.1)).toBe(0);
    expect(handRelease(.18)).toBe(1);
    expect(afterHandRelease(.18)).toBe(0);
    expect(afterHandRelease(.5)).toBeGreaterThan(0);
    expect(afterHandRelease(1)).toBe(1);
  });
});

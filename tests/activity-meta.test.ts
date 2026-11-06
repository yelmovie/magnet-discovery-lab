import { describe, expect, it } from 'vitest';
import { activityMeta } from '../src/activity-meta';
import { titles } from '../src/domain';
import { settingsContent } from '../src/settings-content';

describe('활동 메타데이터', () => {
  it('열 개 활동 모두 목표와 출처, 검수 상태를 갖는다', () => {
    expect(activityMeta.map(meta => meta.activity)).toEqual(titles.map((_, i) => i + 1));
    for (const meta of activityMeta) {
      expect(meta.objective.length, `활동 ${meta.activity}`).toBeGreaterThan(10);
      expect(meta.source).not.toBe('');
      expect(typeof meta.needsReview).toBe('boolean');
      if (!meta.needsReview) expect(meta.reviewer, `활동 ${meta.activity}`).not.toBe('');
    }
  });
  it('설정 화면에 실린 성취기준 코드만 쓰고 세 기준을 모두 다룬다', () => {
    const codes = settingsContent.standardsList.map(([code]) => code);
    const used = new Set(activityMeta.flatMap(meta => meta.standards));
    for (const code of used) expect(codes).toContain(code);
    expect([...used].sort()).toEqual([...codes].sort());
  });
});

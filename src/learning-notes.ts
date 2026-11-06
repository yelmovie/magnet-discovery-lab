import type { Activity } from './domain';

const esc = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Counts only trials that say how they were made; older records simply show nothing here. */
export function recordMode(activities: Activity[]): string {
  const trials = activities.flatMap(a => a.trials || []);
  const direct = trials.filter(t => t.conditions.manual === true).length, auto = trials.filter(t => t.conditions.autoplay === true).length;
  return [direct ? `직접 해봄 ${direct}` : '', auto ? `자동으로 관찰함 ${auto}` : ''].filter(Boolean).join(' · ');
}

/** Short evidence of thinking, read from saved records. Nothing is inferred for records that lack it. */
export function learningNotes(activities: Activity[]): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  for (const a of activities) {
    const find = (key: string) => a.records.find(r => r.key === key)?.result;
    const add = (label: string, value?: string) => { if (value) rows.push({ label, value }); };
    add('실험 전 내 예상', find('inquiry-prediction'));
    add('실제 결과', find('inquiry-observed'));
    add('예상과 비교', find('inquiry-compare'));
    const watchedFirst = find('inquiry-watch-first');
    add('자동 관찰 후 처음 고른 결과', watchedFirst);
    add(watchedFirst ? '다시 고친 결과' : '자동 관찰 후 고른 결과', find('inquiry-watch'));
    const first = find('inquiry-first-choice');
    add('처음 고른 근거', first);
    add(first ? '다시 고친 근거' : '고른 근거', find('inquiry-discovery'));
  }
  return rows;
}

export function learningNotesMarkup(activities: Activity[]): string {
  const mode = recordMode(activities);
  const rows = [...(mode ? [{ label: '기록 방식', value: mode }] : []), ...learningNotes(activities)];
  return rows.length ? `<dl class="learning-notes">${rows.map(row => `<div><dt>${esc(row.label)}</dt><dd>${esc(row.value)}</dd></div>`).join('')}</dl>` : '';
}

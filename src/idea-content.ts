import { boardSize, type Idea, type IdeaSticker } from './idea-model';

const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** None of these repeat a device already repaired in the first four districts. */
export const ideaProblems = [
  { id: 'eraser', who: '담임 선생님', text: '칠판 지우개가 자꾸 바닥에 떨어져요.' },
  { id: 'pins', who: '도서관 사서', text: '쏟아진 압정을 찔리지 않고 줍고 싶어요.' },
  { id: 'bag', who: '옆집 할머니', text: '손이 아파서 가방을 닫기가 힘들어요.' },
  { id: 'door', who: '1층 가게 주인', text: '바람이 불면 문이 쾅 닫혀서 깜짝 놀라요.' },
  { id: 'cup', who: '급식실 조리사', text: '쟁반이 흔들리면 컵이 미끄러져 떨어져요.' },
];
export const ideaProperties = [
  { id: 'iron', title: '철을 끌어당겨', from: '재료 연구소에서 찾은 발견' },
  { id: 'opposite', title: '다른 극끼리 당겨', from: '극의 탑에서 찾은 발견' },
  { id: 'same', title: '같은 극끼리 밀어내', from: '극의 탑에서 찾은 발견' },
  { id: 'through', title: '얇은 물체 너머로 힘이 전해져', from: '수조관에서 찾은 발견' },
  { id: 'distance', title: '가까울수록 힘이 세져', from: '재료 연구소에서 찾은 발견' },
];
export const ideaStickers = [
  { id: 'magnet', label: '자석' }, { id: 'iron', label: '철' }, { id: 'plate', label: '얇은 판' },
  { id: 'box', label: '상자' }, { id: 'string', label: '끈' }, { id: 'wheel', label: '바퀴' },
  { id: 'spring', label: '용수철' }, { id: 'handle', label: '손잡이' },
];
export const feedbackStickers = [
  { id: 'useful', label: '쓸모 있어' }, { id: 'clever', label: '기발해' }, { id: 'curious', label: '궁금해' },
] as const;
export const pitchPrompts = ['누구의 어떤 불편을 해결해?', '자석을 어디에 어떻게 썼어?', '왜 그렇게 움직여?'];

const shapes: Record<string, string> = {
  iron: '<rect x="-10" y="-6" width="20" height="12" rx="1.5" fill="#8d9aa3" stroke="#42525c" stroke-width="1"/><path d="M-7-3h14M-7 1h14" stroke="#c6d0d6" stroke-width=".8"/>',
  plate: '<rect x="-2" y="-13" width="4" height="26" rx="1" fill="#bfe3ee" stroke="#4d8ba0" stroke-width="1"/>',
  box: '<rect x="-11" y="-9" width="22" height="18" rx="1.5" fill="#d9a968" stroke="#7d5526" stroke-width="1"/><path d="M-11-3h22" stroke="#7d5526" stroke-width="1"/>',
  string: '<path d="M-11 6c5-13 7 11 12-2s5-3 10-8" fill="none" stroke="#7d5526" stroke-width="1.8" stroke-linecap="round"/>',
  wheel: '<circle r="9.5" fill="#fff8e6" stroke="#3b4a52" stroke-width="2.4"/><path d="M0-9v18M-9 0h18" stroke="#3b4a52" stroke-width="1.2"/>',
  spring: '<path d="M-12 0l3-6 4 12 4-12 4 12 4-12 3 6" fill="none" stroke="#42525c" stroke-width="1.8" stroke-linejoin="round"/>',
  handle: '<path d="M-10 6v-4a10 7 0 0 1 20 0v4" fill="none" stroke="#7d5526" stroke-width="3" stroke-linecap="round"/>',
};
const label = (id: string) => ideaStickers.find(s => s.id === id)?.label ?? '';
export function stickerArt(s: Pick<IdeaSticker, 'id' | 'pole'>): string {
  if (s.id !== 'magnet') return shapes[s.id] ?? '';
  const north = s.pole !== 'S';
  return `<rect x="-11" y="-7" width="22" height="14" rx="2" fill="${north ? '#d8452f' : '#2f6fbd'}" stroke="#20323a" stroke-width="1"/><text y="3.6" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${north ? 'N' : 'S'}</text>`;
}
export const paletteIcon = (id: string) => `<svg viewBox="-14 -14 28 28" width="44" height="44" aria-hidden="true">${stickerArt({ id, pole: 'N' })}</svg>`;

export function boardLayers(i: Idea, selected = -1): string {
  const lines = i.strokes.map(line => `<polyline points="${line.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#24424a" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const arrows = i.arrows.map(([a, b]) => {
    const angle = Math.atan2(b.y - a.y, b.x - a.x), head = (turn: number) => `${b.x - 5 * Math.cos(angle + turn)},${b.y - 5 * Math.sin(angle + turn)}`;
    return `<path d="M${a.x} ${a.y}L${b.x} ${b.y}M${head(.5)}L${b.x} ${b.y}L${head(-.5)}" fill="none" stroke="#c9531c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
  const stickers = i.stickers.map(s => `<g class="idea-sticker" data-uid="${s.uid}" transform="translate(${s.x} ${s.y})">${s.uid === selected ? '<circle r="15" fill="none" stroke="#f0a020" stroke-width="1.4" stroke-dasharray="3 2"/>' : ''}<rect x="-14" y="-14" width="28" height="28" fill="transparent"/>${stickerArt(s)}<text y="17" text-anchor="middle" font-size="5" fill="#24424a">${label(s.id)}</text></g>`).join('');
  return lines + arrows + stickers;
}
export const boardSvg = (i: Idea, label = '내 설계 스케치') => `<svg class="idea-board-view" viewBox="0 0 ${boardSize.w} ${boardSize.h}" role="img" aria-label="${esc(label)}">${boardLayers(i)}</svg>`;
export const problemText = (i: Idea) => i.problem === 'custom' ? i.custom.trim() : ideaProblems.find(p => p.id === i.problem)?.text ?? '';
export const propertyTitles = (i: Idea) => ideaProperties.filter(p => i.properties.includes(p.id)).map(p => p.title);

/** The invention card shown at the showcase, on the plaza notebook and in the saved image. */
export function ideaCard(i: Idea): string {
  return `<article class="idea-card"><header><small>내 발명 카드</small><h2>${esc(i.name.trim() || '이름을 지어 줘')}</h2></header><div class="idea-card-board">${boardSvg(i)}</div><dl><dt>해결할 불편</dt><dd>${esc(problemText(i))}</dd><dt>쓴 자석의 성질</dt><dd>${propertyTitles(i).map(esc).join(' · ')}</dd>${i.pitch.trim() ? `<dt>소개</dt><dd>${esc(i.pitch.trim())}</dd>` : ''}</dl></article>`;
}

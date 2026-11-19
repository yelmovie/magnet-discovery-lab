import './reward-cards.css';
import { createRewardCards, type RewardCards, type RewardSound } from './reward-cards.js';
import { villageEncounterHits } from './village-encounters.js';
import { stageNames, type Save } from './domain';

/** One achievement card per map villain, in the order of village-encounters.js. The plaza boss is the bonus sixth card. */
const cards = [
  ['clip', '생활 속 자석 탐정'], ['parts', '철 부품 분류 박사'], ['pole', '밀고 당기는 극 마스터'],
  ['latch', '유리 너머 자석 조종사'], ['workshop', '자석 발명 설계왕'], ['plaza', '자석 도시 전설의 영웅'],
] as const;
let cue: (name: RewardSound) => void = () => {};
/** main.ts hands over its effect player, so the cards follow the sound switch. */
export function bindRewardSound(play: (name: RewardSound) => void) { cue = play; }

// Built on first use, so importing this module never touches the document.
let instance: RewardCards | undefined;
function rewardCards() {
  return instance ??= createRewardCards({
    setName: '자석 도시 성취 카드',
    cards: cards.map(([id, title], index) => ({
      id, title, stage: stageNames[index] ?? '중앙 광장',
      art: `/assets/reward-cards/card-${index + 1}-${id}.webp`, thumb: `/assets/reward-cards/thumb-${index + 1}-${id}.webp`,
      ...(index === 5 ? { bonus: true, rarity: 4 } : {}),
    })),
    theme: { accent: '#f4c35c', accent2: '#246c70', glow: '#ffe7a2', ink: '#173f47' },
    particles: ['bolt', 'spark', 'gear', 'star'],
    colors: ['#d94c43', '#2875b7', '#f4c35c', '#ffe7a2', '#d9eeea', '#ffffff'],
    // The horseshoe magnet of the favicon.
    emblem: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M17 15v23a15 15 0 0 0 30 0V15" fill="none" stroke="#e45144" stroke-width="12"/><path d="M47 15v16" stroke="#397bc2" stroke-width="12"/><path d="M17 10v10M47 10v10" stroke="#d3e0e6" stroke-width="12"/></svg>',
    sound: name => cue(name),
    inertRoot: () => document.querySelector<HTMLElement>('#app'),
  });
}

// Cards on their way to a slot stay empty in the header until they land.
const flying = new Set<number>();
type Progress = Pick<Save, 'mapEncounters'>;
/** A card is owned once its villain has been driven off (three hits). Nothing extra is saved. */
export const ownedRewardCards = (save: Progress) => cards.map((_, stage) => villageEncounterHits(save.mapEncounters, stage) === 3);
const shown = (save: Progress) => ownedRewardCards(save).map((owned, index) => owned && !flying.has(index));
export const rewardSlotsHtml = (save: Progress) => rewardCards().slotsHtml(shown(save));
/** Keeps a just-earned card out of its slot until `revealRewardCard` or `dropRewardCard`. */
export function holdRewardCard(index: number) { flying.add(index); }
// Cards whose turn has come (the villain's exit has played) and that are not in their slot yet.
const due = new Set<number>();
/** The villain has left: this card is next, even while a dialog makes it wait. */
export function queueRewardCard(index: number) { due.add(index); }
/** True from a card's turn until it is put away. The map holds its villains meanwhile, so the all-villains finale cannot slip in ahead of a waiting card. */
export const rewardCardDue = () => due.size > 0;
/** The reveal was skipped (the map closed first): the card simply sits in its slot. */
export function dropRewardCard(index: number, save: Progress) { flying.delete(index); due.delete(index); rewardCards().syncSlots(shown(save)); }
/** Where the defeated villain stands on screen while it is still on the map. */
export function rewardCardOrigin(index: number) {
  const foe = document.querySelector<HTMLElement>(`.map-encounter-foe[data-encounter="${cards[index][0]}"]`);
  const box = foe && !foe.hidden ? foe.getBoundingClientRect() : undefined;
  return box && { x: box.left, y: box.top - (parseFloat(foe!.style.getPropertyValue('--encounter-size')) || 0) / 2 };
}
/** Flies the card in from the defeated villain. `origin` is where it stood, noted before its goodbye ended. */
export function revealRewardCard(index: number, save: Progress, origin = rewardCardOrigin(index)) {
  return rewardCards().reveal(index, origin, ownedRewardCards(save)).finally(() => { flying.delete(index); due.delete(index); });
}

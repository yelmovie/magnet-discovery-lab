import { icon } from './art';
import type { Save } from './domain';

export const rewards = [
  { name: '자석 수리 키트', use: '다음 연구소에서 자석으로 재료를 검사해.', change: '배송 보관함의 덮개를 고쳤어!', icon: 'magnet' },
  { name: '힘 관찰 렌즈', use: '다음 센터에서 밀림·끌림을 관찰해.', change: '철 부품을 골라 내는 분류소가 다시 열렸어!', icon: 'eye' },
  { name: '극 표시 스티커', use: '카트의 마주 보는 극을 보며 운반해.', change: '고리자석 완충 장치가 다시 작동해!', icon: 'spark' },
  { name: '원격 조작 손잡이', use: '발명 공방에서 판 너머 장치를 설계할 수 있어.', change: '수조가 깨끗해지고 부품 배송이 도착했어!', icon: 'map' },
  { name: '나의 발명 설계도', use: '마지막 관제소에서 내 설계를 다시 사용해.', change: '시민이 사용할 자석 장치를 완성했어!', icon: 'book' },
];
export function rewardBelt(s: Save) { return `<div class="tool-belt" aria-label="모은 수리 도구">${rewards.map((r, i) => `<div class="tool-slot ${s.evidence.length > i ? 'earned' : ''}" title="${r.use}">${icon(s.evidence.length > i ? r.icon : 'lock', 21)}<span>${r.name}</span>${s.evidence.length > i ? '<b>획득</b>' : ''}</div>`).join('')}</div>`; }

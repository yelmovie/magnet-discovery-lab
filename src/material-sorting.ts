import type { Activity } from './domain';

export const materialCatalog = [
  { id: 'clip', name: '철 클립', magnetic: true, x: 36, y: 42 },
  { id: 'nail', name: '철못', magnetic: true, x: 52, y: 42 },
  { id: 'aluminum', name: '알루미늄 포일', magnetic: false, x: 66, y: 43 },
  { id: 'wood', name: '나무 조각', magnetic: false, x: 36, y: 65 },
  { id: 'plastic', name: '플라스틱 조각', magnetic: false, x: 52, y: 65 },
  { id: 'rubber', name: '고무 지우개', magnetic: false, x: 66, y: 65 },
  { id: 'nut', name: '철 너트', magnetic: true, x: 66, y: 65 },
];

// Keep the old atlas and replay indices stable, including the retired eraser.
export const sortingSpecimens = materialCatalog.flatMap((m, index) => m.id === 'rubber' ? [] : [{ ...m, index }]);
export const ironNutArt = '/assets/quest/material-iron-nut.webp';
export const materialBins = [{ x: 86, y: 44 }, { x: 86, y: 70 }] as const;
export const sortedMaterialPosition = (m: typeof sortingSpecimens[number]) => {
  const slot = sortingSpecimens.filter(other => other.magnetic === m.magnetic).findIndex(other => other.id === m.id);
  return { x: 82 + slot * 4, y: m.magnetic ? 43 : 69 };
};
export const materialClassified = (a: Activity, id: string) =>
  a.values[`tested-${id}`] === true && a.values[`sorted-${id}`] === true;

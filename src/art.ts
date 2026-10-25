export const icon = (name: string, size = 22): string => {
  const paths: Record<string, string> = {
    gear: '<path d="m10 2-.7 2.5-2 .9-2.3-.7-2 3.5 1.7 1.8v2.3L3 14l2 3.5 2.3-.7 2 .9L10 20h4l.7-2.3 2-.9 2.3.7 2-3.5-1.7-1.7V10L21 8.2l-2-3.5-2.3.7-2-.9L14 2z"/><circle cx="12" cy="11" r="3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
    home: '<path d="m3 10 9-7 9 7M6 9v12h12V9M10 21v-7h4v7"/>', book: '<path d="M12 5v16M3 4h5a4 4 0 0 1 4 3 4 4 0 0 1 4-3h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z"/>',
    sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>', mute: '<path d="m11 4-6 5H2v6h3l6 5zM16 9l5 6m0-6-5 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>', lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>', spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
    flask: '<path d="M9 3h6m-5 0v7L4 19q-1 2 2 2h12q3 0 2-2l-6-9V3M7 15h10"/>', print: '<path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>', map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zm6-2v16m6-14v16"/>',
    light: '<path d="M8 15a7 7 0 1 1 8 0v3H8zM9 22h6m-3-11v7"/>', play: '<path d="m8 4 12 8-12 8z"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
};
export function mascot(type: 'mili' | 'dangi' = 'mili', size = 110, pose = 0): string {
  return `<span class="mascot sprite-mascot ${type}" role="img" aria-label="${type === 'mili' ? '밀이' : '당이'}" style="--size:${size}px;--pose:${Math.max(0, Math.min(3, pose))};background-image:url('/assets/adventure/${type}-poses-tablet.webp')"></span>`;
}
export function magnet(pole = 'N', cls = ''): string { return `<div class="bar-magnet ${pole === 'S' ? 'flipped' : ''} ${cls}"><span>N</span><span>S</span></div>`; }
export function objectArt(id: string): string {
  const materials: Record<string, { index: number; label: string }> = {
    clip: { index: 0, label: '철 클립' }, nail: { index: 1, label: '철못' },
    aluminum: { index: 2, label: '알루미늄 조각' }, wood: { index: 3, label: '나무 조각' },
    plastic: { index: 4, label: '플라스틱' }, rubber: { index: 5, label: '고무 지우개' },
  };
  const material = materials[id] || materials.clip;
  return `<span class="material-art" role="img" aria-label="${material.label}" style="--material-column:${material.index % 3};--material-row:${Math.floor(material.index / 3)}"></span>`;
}

export type EquipmentKind = 'ringN' | 'ringS' | 'plate' | 'pad' | 'key' | 'stand';
const equipmentFrames: Record<EquipmentKind, { frame: [number, number, number, number]; label: string }> = {
  ringN: { frame: [32, 87, 453, 324], label: '윗면이 N극인 고리자석' },
  ringS: { frame: [545, 86, 452, 325], label: '윗면이 S극인 고리자석' },
  plate: { frame: [1064, 83, 439, 328], label: '자석과 마주 놓는 철 걸쇠' },
  pad: { frame: [33, 561, 466, 366], label: '수조 안쪽 청소 패드' },
  key: { frame: [544, 512, 465, 430], label: '철 열쇠' },
  stand: { frame: [1146, 467, 300, 505], label: '고리자석 실험 받침대' },
};

/** Exact atlas crops preserve each real object's proportions at any display size. */
export function equipmentArt(kind: EquipmentKind, extraClass = ''): string {
  const { frame: [x, y, width, height], label } = equipmentFrames[kind];
  return `<span class="equipment-art equipment-${kind} ${extraClass}" role="img" aria-label="${label}" style="--equipment-ratio:${width}/${height};background-size:${153600 / width}% ${102400 / height}%;background-position:${x / (1536 - width) * 100}% ${y / (1024 - height) * 100}%"></span>`;
}

/** District scenes are shared by invitations, records, rewards, and the journey. */
export function sceneArt(index: number, extraClass = ''): string {
  const safeIndex = Math.min(5, Math.max(0, Math.floor(index)));
  const labels = ['자석과 철 걸쇠가 보이는 우편함', '여러 재료의 자석 반응을 살피는 실험', '같은 극이 마주 보아 떨어져 있는 고리자석', '수조 청소와 자석 택배 장치', '자석과 철 부품을 배치한 발명 장치', '복구된 자석 도시와 시민들의 도구'];
  // The generated vignette's ring colors are not a valid axial magnet model.
  // Assemble this scene from the separately verified N-top/S-top equipment.
  const rings = safeIndex === 2 ? `<span class="scene-ring-equipment" aria-hidden="true">${equipmentArt('stand', 'scene-stand')}${equipmentArt('ringN', 'scene-ring-lower')}${equipmentArt('ringS', 'scene-ring-upper')}</span>` : '';
  // The lower-left rail extends beyond a nominal 512px cell. Keep the whole
  // rail in its own scene and exclude that fragment from the invention scene.
  const [x,y,width,height] = safeIndex===3?[0,512,550,512]:safeIndex===4?[550,512,474,512]:[safeIndex%3*512,Math.floor(safeIndex/3)*512,512,512];
  const crop = safeIndex===2?'':`background-size:${153600/width}% ${102400/height}%;background-position:${x/(1536-width)*100}% ${y/(1024-height)*100}%;aspect-ratio:${width}/${height};`;
  return `<span class="mission-scene-art ${safeIndex === 2 ? 'scene-poles' : ''} ${extraClass}" role="img" aria-label="${labels[safeIndex]}" style="${crop}">${rings}</span>`;
}

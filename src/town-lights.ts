import type { Save } from './domain';

// Coordinates follow the painted panes, street lamps and terraces of city-expedition.webp.
const buildings = [
  { lamp:[412,230], panes:'M431 250V171Q431 153 448 150Q465 151 466 170V249Z M492 238V159Q495 142 507 140Q515 140 516 154V234Z M213 262V234Q220 218 227 232V262Z', door:[301,303], flags:[250,218,98], color:'#ffd16b' },
  { lamp:[903,182], panes:'M824 207V178Q824 162 840 157Q855 163 855 178V207Z M785 185V157Q790 145 795 156V184Z M887 187V154Q893 145 898 155V187Z', door:[839,214], flags:[740,120,71], color:'#b8f091' },
  { lamp:[1201,337], panes:'M1331 310V278Q1334 264 1345 259Q1357 266 1357 279V312Z M1383 307V263Q1386 254 1390 264V309Z M1537 285V269Q1541 260 1545 269V286Z', door:[1345,316], flags:[1297,228,78], color:'#ffc477' },
  { lamp:[1310,674], panes:'M1179 561V540Q1183 519 1195 517Q1214 528 1216 548V566Z M1168 637V613Q1174 597 1182 594Q1192 602 1193 615V641Z M1295 548Q1387 569 1488 532L1487 542Q1397 582 1295 558Z', door:[1180,646], flags:[1271,522,92], color:'#8ef2ec' },
  { lamp:[356,646], panes:'M178 557V537Q181 516 195 511Q213 519 217 542V570Z M335 635V595Q344 569 374 566Q396 566 401 584V634Z M247 666V650Q252 633 261 636Q270 642 270 650V665Z', door:[368,643], flags:[443,569,104], color:'#ffbd65' },
] as const;

export function districtRestored(s: Save, stage: number) {
  return s.completed.includes(stage * 2 + 1) && s.completed.includes(stage * 2 + 2) && s.evidence.some(e => e.stage === stage);
}

export function townLights(s: Save) {
  const art = buildings.map(({ lamp:[x,y], panes, door, flags:[fx,fy,span], color }, stage) => {
    const first = s.completed.includes(stage * 2 + 1), restored = districtRestored(s,stage);
    if (!first) return '';
    const pennants = Array.from({length:7}, (_,i) => {
      const left = i * span / 7, sag = Math.sin(Math.PI*(i+.5)/7)*9;
      return `<path d="M${left} ${sag}l${span/14} 12 ${span/14} -12Z" fill="${['#cf6041','#ffdb79','#308c89'][i%3]}"/>`;
    }).join('');
    return `<g data-district-light="${stage}" class="${restored?'town-lit':'porch-lit'}" style="color:${color}">
      <circle cx="${x}" cy="${y}" r="24" fill="url(#town-halo)"/><circle cx="${x}" cy="${y}" r="3.7" fill="#fff2bd"/>
      ${restored?`<g class="town-windows"><path d="${panes}" fill="currentColor" opacity=".35" filter="url(#town-bloom)"/><path d="${panes}" fill="currentColor" opacity=".36"/>
      <ellipse cx="${door[0]}" cy="${door[1]}" rx="44" ry="15" fill="url(#town-halo)"/>
      <g transform="translate(${fx} ${fy})"><path d="M0 0Q${span/2} 18 ${span} 0" fill="none" stroke="#664c32" stroke-width="2"/>${pennants}</g></g>`:''}</g>`;
  }).join('');
  return `<svg class="town-lights" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs><radialGradient id="town-halo"><stop stop-color="#fff5bb" stop-opacity=".94"/><stop offset=".4" stop-color="#ffd36c" stop-opacity=".53"/><stop offset="1" stop-color="#ffc05e" stop-opacity="0"/></radialGradient>
    <filter id="town-bloom" x="-50%" y="-70%" width="200%" height="240%"><feGaussianBlur stdDeviation="5"/></filter></defs>${art}</svg>`;
}

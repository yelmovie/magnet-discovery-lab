import type { Save } from './domain';
import { missionReady } from './mission-model';

/** These rewards reflect an actual repair, never the teacher's access switch. */
export function townRestoration(s: Save) {
  const accomplished = (screen: 7 | 8) => {
    if (s.completed.includes(screen)) return true;
    const a = s.activities[screen];
    return !!a && missionReady(screen, { ...a, trials:a.trials?.filter(trial => trial.activity === screen) }, s);
  };
  return { aquariumClean: accomplished(7), deliveriesRunning: accomplished(8) };
}

export function aquariumOnMap(s: Save): string {
  const clean = townRestoration(s).aquariumClean;
  // Keep grime inside the illustrated glass. Brass ribs and the entrance remain
  // clear, so this reads as an aquarium to clean, rather than a damaged building.
  const panes = 'M1272 541Q1316 553 1369 555L1368 649Q1312 648 1271 624Z M1380 555Q1437 557 1487 539L1488 622Q1452 651 1379 651Z M1268 525Q1289 477 1353 467L1367 541Q1312 539 1268 525Z M1378 467Q1447 470 1482 524Q1433 542 1378 541Z';
  return `<svg class="town-aquarium-state" data-aquarium-state="${clean ? 'clean' : 'dirty'}" viewBox="0 0 1672 941" preserveAspectRatio="none" role="img" aria-label="${clean ? '청소를 마쳐 물고기가 잘 보이는 수조' : '유리에 이끼와 물때가 낀 수조'}" focusable="false">
    <defs><clipPath id="town-aquarium-glass"><path d="${panes}"/></clipPath></defs>
    ${clean ? `<g class="town-water-glint" fill="none" stroke="#e8ffff" stroke-linecap="round"><path d="M1289 560v24m8-19v11M1403 574v27m8-20v10" stroke-width="3" opacity=".68"/><path d="m1461 494 0 13m-6-6h12" stroke-width="2" opacity=".8"/></g>
    <g class="town-aquarium-bubbles" clip-path="url(#town-aquarium-glass)" fill="none" stroke="#d6fffb" stroke-width="1.6"><circle cx="1318" cy="600" r="4"/><circle cx="1329" cy="609" r="2.5"/><circle cx="1350" cy="580" r="3"/><circle cx="1433" cy="601" r="4"/><circle cx="1444" cy="590" r="2.7"/><circle cx="1456" cy="610" r="3.6"/></g>` : `<g clip-path="url(#town-aquarium-glass)"><path d="${panes}" fill="#65734e" opacity=".68"/>
      <svg x="1260" y="530" width="242" height="124" viewBox="0 224 320 112" preserveAspectRatio="none" opacity=".92"><image href="/assets/quest/aquarium-cleaner-parts.webp" width="320" height="448"/></svg>
      <svg x="1260" y="463" width="240" height="92" viewBox="0 224 320 112" preserveAspectRatio="none" opacity=".78"><image href="/assets/quest/aquarium-cleaner-parts.webp" width="320" height="448"/></svg>
      <svg x="1318" y="517" width="150" height="130" viewBox="0 336 320 112" preserveAspectRatio="none" opacity=".32"><image href="/assets/quest/aquarium-cleaner-parts.webp" width="320" height="448"/></svg></g>`}
  </svg>`;
}

export function courierOnMap(s: Save): string {
  if (!townRestoration(s).deliveriesRunning) return '';
  return '<div class="expedition-courier" role="img" aria-label="마을길을 오가는 택배 수레"><img class="town-courier-cart" src="/assets/quest/prop-cart.webp" alt="" draggable="false"><img class="town-courier-parcel" src="/assets/quest/prop-parcel.webp" alt="" draggable="false"></div>';
}

import { mailboxReplayArt } from './apparatus-figures';
import { trialObjectArt, type Trial } from './trial-records';

function separatedParts(trial:Trial) {
  const parts = [
    ['base','몸체'], ['lid','덮개'], ['handle','손잡이'],
    ['socket','자석 틀'], ['plate','철판'], ['magnet','자석'],
  ];
  const rows:Record<string,number>={handle:0,plate:1,socket:2,magnet:3};
  return parts.map(([id,name],i)=>{
    const x=60+i%3*120,y=48+Math.floor(i/3)*104;
    const art=id in rows
      ? `<svg x="-42" y="-15" width="84" height="30" viewBox="0 ${rows[id]*112} 320 112" preserveAspectRatio="none" overflow="hidden"><image href="/assets/quest/mailbox-hardware.webp" width="320" height="448"/></svg>`
      :trialObjectArt({id,x:0,y:0},trial,0,0,1.15);
    return `<g transform="translate(${x} ${y})"><rect x="-53" y="-40" width="106" height="88" rx="10" fill="#fffaf0" stroke="#d4c8aa"/>${art}<text class="replay-part-name" y="40" text-anchor="middle">${name}</text></g>`;
  }).join('');
}

/** Successful mailbox records explain the apparatus, with no inferred extra experiment. */
export function mailboxReplayScene(trial:Trial) {
  const repair=trial.activity===2&&/^repair\d+$/.test(trial.key);
  const latch=trial.activity===1&&/^latch\d+$/.test(trial.key);
  if(trial.outcome!=='success'||(!repair&&!latch)||!trial.initialObjects.length||!trial.objects.length)return;
  // A displaced strike needs its own recorded geometry. Keep the general replay for those records.
  if(trial.conditions.course==='loose-plate'||trial.key==='repair2')return;
  const assembled=repair&&trial.conditions.assembled===true;
  const beforeCaption=assembled?'처음에는 여섯 부품이 따로 있었어.':repair?'덮개를 열었어. 아직 자석을 끼우기 전이야.':'덮개가 열려서 자석과 철판이 떨어져 있어.';
  const before=assembled?separatedParts(trial):mailboxReplayArt(65,latch);
  const resultCaption=repair?'흔들어도 덮개가 닫혀 있어!':'덮개를 닫으니 자석과 철판이 붙었어!';
  const frame=(value:number)=>{
    if(value===0)return {art:before,caption:beforeCaption};
    if(assembled&&value<.3)return {art:before,caption:'몸체부터 부품을 하나씩 조립했어.'};
    const closing=Math.max(0,Math.min(1,(value-.4)/.3));
    const shaking=repair&&value>.72&&value<.94;
    const offset=shaking?Math.sin((value-.72)*Math.PI*45)*3:0;
    const caption=value===1?resultCaption:shaking?'상자를 살짝 흔들어 확인했어.':value<.4?'① 자석은 덮개에, ② 철판은 몸체에 있어.':'덮개를 내려 자석과 철판을 만나게 했어.';
    return {art:`<g transform="translate(${offset} 0)">${mailboxReplayArt(65*(1-closing))}</g>`,caption};
  };
  return {before,beforeCaption,resultCaption,frame};
}

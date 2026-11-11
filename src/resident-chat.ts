import { stageNames, type Save } from './domain';
import { residents } from './expedition';
import { playNarration } from './game-audio';

const stories = [
  {
    place:'우편국',
    hello:'딩동! 네 덕분에 편지 배달을 다시 시작했어. 오늘 첫 소식, 들어 볼래?',
    again:'또 만났네! 다음 배달을 준비하고 있었어. 우편함은 오늘도 잘 닫혀 있어!',
    question:'편지는 잘 배달했어?',
    news:'물론이지! 덜컹거리는 다리를 건너도 덮개가 닫혀 있었어. 편지를 받고 웃는 얼굴을 보니 신이 나더라!',
    science:'덮개가 닫혀 있는 비결은?',
  },
  {
    place:'재료 연구소',
    hello:'어, 마침 잘 왔어! 네가 나눠 준 재료로 실험대를 다시 차렸어. 어떤 재료가 남았는지 볼래?',
    again:'또 궁금한 게 생겼구나? 좋아, 실험 기록을 같이 보자!',
    question:'어떤 재료가 남았어?',
    news:'나무와 알루미늄은 그 자리에 남았어. 붙은 철 클립은 따로 모았지. 반짝이는 재료끼리도 반응이 다르다니, 재미있지?',
    science:'철 클립만 골라낸 비결은?',
  },
  {
    place:'극의 탑',
    hello:'잘 왔구나. 네가 극을 찾아 준 덕에 탑 문을 다시 열었단다. 안에서는 고리 전시가 한창이야.',
    again:'다시 왔구나. 서두르지 말고 고리 사이를 천천히 보렴. 작은 틈에도 재미있는 이야기가 있단다.',
    question:'고리 전시는 어때?',
    news:'아이들이 고리 사이로 살짝 몸을 낮춰 보고 있단다. 두 고리가 닿지 않았다는 걸 발견하면 눈이 동그래지지.',
    science:'고리는 어떻게 떠 있어?',
  },
  {
    place:'수조관',
    hello:'어서 와! 네가 유리를 닦아 준 덕에 물고기들이 잘 보여. 여기서 잠깐 같이 구경할래?',
    again:'반가워! 오늘도 물고기들을 돌보고 있었어. 맑은 유리 앞에 오니 한눈에 잘 보이지?',
    question:'어떤 물고기가 보여?',
    news:'저기 수초 뒤를 봐. 노란 물고기가 쏙 나왔네! 얼룩 때문에 안 보였는데, 네 덕에 이제 잘 보이는구나.',
    science:'물속 얼룩은 어떻게 닦았어?',
  },
  {
    place:'발명 공방',
    hello:'좋아, 공방 다시 문 열었어! 네 발명품을 첫 전시대에 놓았지. 구경 온 친구 이야기를 들어 볼래?',
    again:'왔네! 새 설계도를 펼치고 있었어. 쓸모 있는 장치를 만들려면 직접 맞추고 시험해 봐야지!',
    question:'누가 내 발명품을 봤어?',
    news:'옆 골목 꼬마가 네 설계도를 한참 보더라! 자기도 이웃의 불편을 고쳐 주고 싶대. 그래서 같이 부품부터 골라 보기로 했어.',
    science:'부품을 어디에 달아야 해?',
  },
] as const;

export function reunionTitle(stage:number) {
  return `${stories[stage].place}에 다시 불이 켜졌어!`;
}

function stampRow(s:Save) {
  const met=s.greetedResidents||[];
  // Ink stamps from the post office, materials lab, tower, aquarium and workshop.
  const seals=[
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    '<path d="m8 14 7-7a2 2 0 0 1 3 3l-9 9a4 4 0 0 1-6-6L14 2"/>',
    '<circle cx="12" cy="12" r="8"/><path d="M12 6v6l4 2"/>',
    '<path d="M3 12q7-10 14-1l4-4v10l-4-4Q9 21 3 12Z"/><circle cx="8" cy="11" r=".8"/>',
    '<path d="m4 17 9-9a5 5 0 0 1 6-6l-3 4 2 2 4-3a5 5 0 0 1-6 6l-9 9a2 2 0 0 1-3-3Z"/>',
  ];
  const stamps=residents.map(({name},i)=>`<span class="friend-seal" role="img" data-filled="${met.includes(i)}" title="${name}" aria-label="${name} 도장 ${met.includes(i)?'받음':'아직 없음'}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${seals[i]}</svg></span>`).join('');
  return `<strong>마을 친구 도장 <b>${met.length} / 5</b></strong><span class="friend-seals">${stamps}</span>`;
}

export function chatMarkup(s:Save, stage:number) {
  const {name}=residents[stage], story=stories[stage];
  return `<div class="resident-chat"><img src="/assets/quest/resident-${stage+1}.webp" alt=""><div><small>${stageNames[stage]} · 돌아온 주민</small><h2>${name}</h2><p aria-live="polite" data-town-speech>${s.greetedResidents?.includes(stage)?story.again:story.hello}</p></div></div>
    <div class="town-replies" aria-label="주민에게 물어보기"><button class="btn soft" data-town-reply="news">${story.question}</button><button class="btn soft" data-town-reply="science">${story.science}</button></div>
    <div class="friend-album" data-friend-album>${stampRow(s)}</div><p class="friend-receipt" role="status">${s.greetedResidents?.includes(stage)?'이 친구의 도장을 모았어.':'궁금한 걸 물어보고 친구 도장을 받아 봐.'}</p>`;
}

export function bindResidentChat(dialog:HTMLElement, s:Save, stage:number, onStamp:()=>void) {
  const events = new AbortController();
  let line:'hello'|'again'|'news'|'science' = s.greetedResidents?.includes(stage) ? 'again' : 'hello';
  let stopVoice = () => {};
  const speak = () => {
    stopVoice();
    stopVoice = playNarration(`/audio/voices/resident-${stage+1}-${line}.mp3`,s.settings);
  };
  dialog.querySelectorAll<HTMLButtonElement>('[data-town-reply]').forEach(btn=>btn.addEventListener('click',()=>{
    line = btn.dataset.townReply==='news' ? 'news' : 'science';
    dialog.querySelector<HTMLElement>('[data-town-speech]')!.textContent=line==='news'?stories[stage].news:residents[stage].speech;
    if (!s.greetedResidents?.includes(stage)) {
      (s.greetedResidents??=[]).push(stage);
      dialog.querySelector<HTMLElement>('[data-friend-album]')!.innerHTML=stampRow(s);
      dialog.querySelector<HTMLElement>('.friend-receipt')!.textContent=`${residents[stage].name}의 인사 도장을 받았어!`;
      onStamp();
    }
    speak();
  },{signal:events.signal}));
  // Opening a resident is already a click/key gesture; rejected playback keeps the text usable.
  speak();
  return () => { events.abort(); stopVoice(); };
}

# 문장 줄바꿈 균형 점검·수정 (2026-11-19~20)

공통 지침: `_shared/LINEBREAK-BALANCE-20261119.md`. 문구·대사는 바꾸지 않고 줄바꿈 위치만 고쳤다.

## 점검 방법

- `.tmp/linebreak-20261119/audit.cjs`(git 제외): 개발 서버에 `window.__lab` 훅을 붙이고 교사 모드로 제목 → 인트로 끝 카드 → 지도 → 설정 → 주민 5명 대화(선택지 6단계씩) → 개념 영상 5개 → 활동 2~10(교사 모드 완료로 탐구 단계 넘김) → 발명 공방 예시 팝업 5개 → 핵심 정리·보고서·인증서·연구 기록을 열고 공용 `measure.js`로 잰다.
- 화면 크기 1280×800, 1920×1080. 브라우저는 `run-lock.sh lbk-browser-2` 안에서.
- 운영 확인: 공용 `run.mjs 05 - 18 1280x800`(인트로 구간).

## 결과

| | 1280×800 | 1920×1080 |
|---|---|---|
| 수정 전 | 12 | 18 |
| 수정 후 | 6 (모두 오탐·허용) | 5 (모두 오탐·허용) |

## 고친 곳

- `src/korean-linebreak.css`: 공통 규칙 복사(keep-all·pretty, 제목·버튼·dialog balance). `index.html`에서 다른 스타일보다 먼저 링크.
  - 발명 공방 예시 팝업 `.idea-example`(dialog) → balance 적용. 「…문을 열린 채로 / 잡아 줘.」 → 「…자석이 문 아래 / 철판을 당겨서 문을 열린 채로 잡아 줘.」, 「…끌어올릴 / 수 있어.」도 같이 해결.
  - 연구 기록 도구 이름표의 낱말 끊김(「힘 관찰 렌|즈」「극 표시 스|티커」「자석 수리 키|트」 등) → keep-all.
  - 빈 연구 기록 안내 「…차곡차곡 / 모여.」 → pretty로 한 줄.
- 같은 파일 「프로젝트 보정」 절:
  - `#app :is(.puzzle-crisis-copy, .quiz-scenes figcaption, .final-note-photos figcaption, .final-hand-note, .tool-belt .tool-slot span) { text-wrap: balance; }` — 1920에서 위기 카드(활동 3·4·5·6·8)의 「…꺼내 / 줘.」「…건너편 / 길과 이어 줘.」, 퀴즈 그림 캡션 「…장치 예|시」, 최종 노트 캡션 「…장치 / 예시」·손글씨 메모 「…열리는지 / 비교했어.」.
  - `#app .quest-activity .run-view-toggle { max-width: none; white-space: nowrap; }` — 140px 상자에서 「3D 달리기로 / 하기」로 떨어지던 버튼을 한 줄로(겹침 없음 스크린샷 확인).

## 남은 것 (오탐·허용·범위 밖)

- 인증서 「…실험하여 / 밀고 당기는 도시를…」: 원래 `<br>`로 뜻 단위로 끊은 곳. 도구가 띄어쓰기 없는 줄바꿈을 낱말 끊김으로 잡은 오탐.
- 연구 기록 도구 이름표 「자석 수리 / 키트」「극 표시 / 스티커」「원격 조작 / 손잡이」「나의 발명 / 설계도」(+1280의 「힘 관찰 / 렌즈」): 6~7자 이름표가 88~99px 칸에서 뜻 단위로 고르게 두 줄. 도구의 '끝줄 4자 이하' 기준에만 걸려 허용으로 판정.
- 인트로 자막 `.story-line` 4건(운영 `run.mjs`): 영상이 도는 동안(`has-film`) 1px로 잘라 둔 화면낭독기용 글이라 보이지 않는다. 실제 자막은 영상에 구워져 있고 스크린샷에서 「다섯 구역을 고치고 나면 / 여기서 네 발명품을 만들 차례야!」처럼 고르게 보인다. 범위 밖(영상 자막).
- 캔버스(Three) 안 글은 재지 못했다.
- 기존 `scripts/layout-check.cjs`는 저장 데이터를 넣는 단계에서 멈춰(2026-10-25 기준 스크립트, 이번 변경과 무관) 돌리지 못했다. 대신 바뀐 화면을 스크린샷으로 확인했다.

## 검증·배포

- `npm run build` 통과, `npm test` 22파일 335개 통과.
- 커밋 `fd95df3` 푸시, `deploy.sh 05 5magnet pages magnet-city`로 배포(https://5f218e4a.magnet-city.pages.dev).
- 운영 https://magnet-city.pages.dev: `index.html`과 `assets/index-5zvaS0G1.css`가 배포 빌드와 sha256 일치(`098ad617983a047d`), CSS에 보정 규칙 포함 확인.
- 추가 수정(2026-11-20, 지침 8절): 성취 카드 보관함 잠긴 문구 「악당을 물리치면 / 열려요」 → `src/reward-cards.css` `.rc-locked` 컨테이너 규칙 네 줄 추가로 좁은 카드에서 「악당을 / 물리치면 / 열려요」 세 줄. 로컬 1280×800·1024×768에서 세 줄·카드 넘침 없음 확인, 커밋 `7c3ce8e` 배포(https://b504f016.magnet-city.pages.dev), 운영 `index.html`·`assets/index-xE_qKnjM.css` sha256 일치(`9b1e107e4d566918`).

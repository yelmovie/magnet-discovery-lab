# 퍼즐 액션 리뉴얼 인계 · 2026-11-11 (작업 중, 커밋 전)

다른 세션이나 도구가 이 절만 읽고 이어갈 수 있게 적었다. 설계와 단계별 기록은 `docs/PUZZLE-ACTION-RENEWAL-20261111.md`(1~9절 설계, 10절 진행 기록)에 있다. 이 절 아래의 2026-11-06 인계는 운영 배포 기준 기록이라 그대로 유효하다.

## 지금 상태

- 브랜치 `codex/magnet-quest-upgrade-20261021`, 마지막 커밋 `32b7b2a`. **이번 작업은 전부 커밋 전**이고 작업 폴더에만 있다. 운영(magnet-city.pages.dev)에는 반영되지 않았다. 푸시·배포는 사용자가 말할 때만 한다.
- 사용자가 지금까지 만든 퍼즐을 직접 해 보는 중이다(2026-11-11). 그 의견이 아래 순서보다 먼저다.
- 목표: 「위기 발생 → 자석 조작 → 퍼즐 해결 → 즉각 보상 → 다음 구역 해금」. 도구는 자석 하나, 조작은 가까이·떼기 / 사이에 두기 / 뒤집기뿐이고, 답을 고르는 버튼 퍼즐은 만들지 않는다.

## 완료한 작업

- 활동 2~8을 새로 시작하면 위기 카드가 뜨고 별 3개가 붙는다(`puzzleVersion: 1`). 진행 중이던 활동, 활동 1·9·10, 광장은 그대로다.
- 새 장애물 3개
  - 활동 2 「어긋난 철판」: 먼저 흔들어 열림 확인 → 자석을 끼워도 철판이 멀면 열림 → 철판을 자석 맞은편으로 옮겨야 닫힘.
  - 활동 5 「같은 극으로 여는 문」: 극 스티커를 다 붙이면 그 자석이 문 빗장이 된다. 같은 극을 대서 밀어내야 열림. 완료에 `door0` 증거가 추가로 필요하다.
  - 활동 8 「유리벽 보관실」: 조종 자석은 유리벽(가로 52)을 못 넘는다. 당기기만 하면 벽 앞에서 멈추고, 뒤집어 뒤에서 밀어야 깃발(60)에 닿는다. 지나치면 당겨서 되돌린다.
- 활동 3·4·6·7은 새 장애물 없이, 원래 있던 '다르게 움직인 결과'를 빗나감으로 센다(잘못된 분류함 / 클립이 안 움직인 칸 / 안 뜨거나 안 붙은 고리 / 패드 떨어짐).
- 빗나감 2번째부터 단서가 한 단계씩 붙고 4번째에 자동재생을 권한다. 별은 저장하지 않고 증거에서 계산한다: 직접 풀면 3개에서 빗나감마다 하나씩(최소 1), 자동재생으로 풀면 0개이고 완료는 인정.
- 구역 보상 창에 그 구역 퍼즐의 별이 나온다. 자동재생·코치 안내·브라우저 회귀 시나리오를 새 흐름에 맞췄다.

## 수정한 파일 (`git status`, `git diff --stat` 실측 · 14개 수정 402줄 추가 45줄 삭제, 새 파일 3개)

| 파일 | 변경 내용 |
|---|---|
| `src/puzzle-hud.ts`, `src/puzzle-hud.css` (새 파일) | 위기 카드(`crises`), 별 표시, `출동하기` 처리 |
| `src/mission-model.ts` | `deliveryCourse`, `puzzleHint`, `puzzleStars`, `puzzleSolved`, 활동별 마지막 증거 `puzzleProof`, 활동 5 완료 조건에 `door0` |
| `src/mission-surface.ts` | 공용 빗나감 `Surface.miss(text, clues)` |
| `src/mission-content.ts` | `missionQuestion`, 활동별 단서 문구(`latchHints` 등), `puzzleAutoHint` |
| `src/mission-play.ts` | 활동 2~8 새 시작에 `puzzleVersion`, 위기·별 마크업, 활동 2 철판 조작물 |
| `src/missions-mailbox.ts` | 활동 2 어긋난 철판 |
| `src/missions-poles.ts` | 활동 5 문 단계(`startDoor`, `tryDoor`, 문 그리기), 활동 5·6 빗나감 |
| `src/missions-remote.ts` | 활동 8 유리벽 코스, 활동 7 빗나감 |
| `src/missions-force.ts` | 활동 3·4 빗나감 |
| `src/experiment-autoplay.ts`, `src/coach.ts` | 위기 카드 넘기기, 활동 2·5·8 새 단계의 자동재생과 안내 |
| `src/main.ts`, `src/trial-observations.ts` | 질문 문구, 보상 창 별, `door0` 관찰 문장 |
| `tests/mechanics.test.ts`, `scripts/playful-regression.cjs` | 퍼즐 시험 13개 추가, 회귀가 활동 2·5·8 새 경로를 지나감 |
| `docs/PUZZLE-ACTION-RENEWAL-20261111.md` (새 파일) | 설계와 진행 기록 |

## 테스트·빌드 결과 (마지막 코드 변경 뒤 2026-11-11 실행)

| 명령 | 결과 |
|---|---|
| `npx vitest run --exclude '**/._*'` | 20개 파일 277개 통과 |
| `npx tsc --noEmit`, `npm run build` | 통과(3D 청크 크기 경고는 이전부터 있음) |
| `TEST_URL=http://127.0.0.1:4196/ TEST_OUT=test-results/playful-20261111 node scripts/playful-regression.cjs` | 21개 통과 |
| `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" TEST_URL=http://127.0.0.1:4196/ node scripts/tablet-layout-regression.cjs` | 205화면 0건 |
| `scripts/autoplay-progress-regression.cjs` | 미실행 — 완주 저장 표본(`TEST_FIXTURE`) 파일을 찾지 못함 |
| `scripts/layout-audit.cjs`, `inquiry-evidence-regression.cjs`, `experiment-audio-regression.cjs`, `resume-review.cjs` | 미실행 |

브라우저 스크립트는 개발 서버가 떠 있어야 한다: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4196 --strictPort`(`.claude/launch.json`의 `magnet-dev`). 맥에는 Playwright 번들 브라우저가 없어 설치된 크롬으로 돈다. 화면 캡처용 임시 스크립트는 `.tmp/puzzle-shots.cjs`, `.tmp/door-shots.cjs`, `.tmp/door-auto.cjs`(git 제외), 결과 PNG는 `test-results/puzzle-20261111/`.

## 확정된 결정

- 기존 10활동의 자리·저장 칸·그림·과학 모형을 유지하고 그 위에 퍼즐을 얹는다. 새 게임 엔진과 새 의존성은 없다.
- 저장 구조 버전은 올리지 않는다. 새로 시작한 활동에만 `puzzleVersion: 1`을 붙이고, 진행 중이던 활동은 예전 규칙으로 끝난다.
- 시간 제한, 순위표, 목숨은 넣지 않는다. 틀려도 벌점 없이 그 자리에서 다시 한다.
- 별은 풀기 전에는 빈 채로 둔다(빗나갈 때 깎이는 것처럼 보이지 않게).
- 5구역 발명 공방은 퍼즐로 바꾸지 않는다(성취기준 4과09-03이 설계·개선이다).

## 아직 정하지 않은 것

- 지도의 도깨비 '세 번 누르기'(`src/map-villains.js`)를 퍼즐 해결과 이을지. 지금은 손대지 않았다.
- 활동 5에 '당겨 여는 문'을 더할지. 지금은 '밀어 여는 문' 하나다.
- 광장 연결 퍼즐을 수첩 정리 앞에 넣을지, 넣는다면 조작 수를 얼마로 할지.

## 남은 문제

| 등급 | 문제 | 재현·확인 방법 |
|---|---|---|
| 확인 필요 | 활동 3·4·6·7의 빗나감 연결을 한 번도 밟아 보지 않았다 | 각 활동에서 일부러 틀린다: 3 붙지 않는 물건을 수리함에, 4 2~4칸 선택 후 손 놓기, 6 뜨지 않는 배치로 관찰, 7 손잡이를 패드에서 멀리. 안내에 단서가 붙고 `puzzleMisses`가 늘어야 한다 |
| 확인 필요 | 보상 창의 별 표시를 화면으로 못 봤다 | 교사용을 끄고 한 구역을 직접 끝낸다. 회귀는 이 창을 지나가지만 별을 검사하지 않는다 |
| 확인 필요 | 활동 2 자동재생이 철판까지 옮기는지 | 활동 2에서 자동재생을 끝까지 본다 |
| 확인 필요 | 활동 5 문 단계의 실제 드래그, 1024×768 이하에서 문과 다른 요소의 겹침 | 직접 조작과 화면 캡처 |
| 낮음 | 915×412에서 활동 8의 '유리벽'·'배달 장소' 이름표가 안내 말풍선에 가려진다 | 그 크기에서 활동 8 열기. '배달 장소'는 이전부터 같다 |
| 낮음 | 활동 8에서 자석을 뗄 때 조종 자석이 '유리벽' 이름표를 잠깐 가린다 | 벽 가까이에서 `자석 떼기` |
| 미실측 | 1920×1080 직접 조작, 실제 태블릿·전자칠판 손가락 조작, 학생의 재미·이해도·소요 시간 | 이 작업 안에서 잴 수 없다 |

## 다음에 할 일 (우선순위 순)

1. 사용자의 직접 플레이 의견을 반영한다.
2. 지금 상태를 커밋한다(사용자가 말하면). 커밋 전 `find . -name '._*' -not -path './node_modules/*' -delete`.
3. 위 '확인 필요' 네 줄을 밟아 보고, 활동 3·4·6·7 빗나감은 `tests/mechanics.test.ts`에 시험으로 남긴다.
4. 활동 6 「고리 승강 발판」: 고리를 뒤집어 띄워 발판을 올리고, 붙여서 내려 캐릭터를 건넨다. 지금 활동 6의 띄우기(`float2`)·붙이기(`join2`) 두 라운드를 그대로 쓰고 발판과 건너는 연출만 얹는 것이 가장 작다.
5. 활동 4 「틈 너머 열쇠」: 멀면 안 움직이고 가까우면 끌려오고 종이 너머에서도 끌려온다. 지금의 5칸 → 칸 고르기 → 종이 비교 흐름에 '꺼내야 할 열쇠' 장면을 얹는다.
6. 활동 3과 7에 판단이 필요한 장애물을 넣을지 사용자와 정한다.
7. 광장 연결 퍼즐과 지도 해금 연출.
8. 마지막에 `edu-final-check`로 판정, README와 `docs/IMPLEMENTATION.md` 갱신.

## 퍼즐 하나를 더할 때 손대는 곳

1. `tests/mechanics.test.ts`에 시험 먼저. `mount(n,{paceVersion:1,mechanicsVersion:1,puzzleVersion:1})`로 연다. 값 없이 여는 기존 시험은 예전 규칙을 지킨다.
2. 해당 `src/missions-*.ts`에서 `v.a.values.puzzleVersion===1`일 때만 새 규칙. 틀린 결과는 `v.miss(문장, 단서배열)`, 풀리면 `v.proof(키, …, 'success', {course:'이름'})`.
3. `src/mission-model.ts`의 `puzzleProof`에 그 활동의 마지막 증거 키. 완료 조건이 늘면 `missionReady`의 해당 `case`.
4. `src/mission-content.ts`에 단서 두 문장(어디를 볼지 → 무엇을 비교할지), `src/puzzle-hud.ts`의 `crises`에 위기 문구.
5. `src/experiment-autoplay.ts`(자동재생 단계), `src/coach.ts`(다음 조작 안내), `scripts/playful-regression.cjs`(그 활동 경로).
6. 시험 → `npx tsc --noEmit` → 빌드 → 브라우저 회귀 → 화면 캡처 확인.

## 건드리면 안 되는 것

- `domain.ts`·`mission-model.ts`의 힘·거리·마찰 계산과 N/S 표기. 재미를 위해 사실과 다른 움직임을 만들지 않는다.
- 이미 저장된 진행·증거·인증서. 실제 학생 저장소를 지우며 시험하지 않는다(교사용 미리보기나 격리된 브라우저 컨텍스트를 쓴다).
- `src/delivery.ts`와 광장의 옛 배송(`final-mission.ts`가 쓴다), `_unused/`.
- `package.json`·`package-lock.json`. `npm install`을 했다면 `node "/Volumes/T7 Shield/DevMaintenance/add-native-binaries.mjs"`.
- main 브랜치. 운영의 원본은 이 브랜치다(아래 2026-11-06 인계 참고).
- 외장 SSD 밖에 작업 파일을 쓰지 않는다. 디스크 포맷·변환은 하지 않고 `._*` 파일은 지운다.

---

# 밀고 당기는 도시 인계 · 2026-11-06 (탐구 기록 고도화 배포 후)

최신 운영: 2cbb8f4b (소스 31fa5a7). 운영 파일 175개 SHA-256 동일. 되돌릴 이전 배포 32f57d71. 브랜치는 아직 푸시하지 않았다.
아래 운영·검증 줄은 직전 배포 기록이다.
공개 main은 10월 25일 시점(f3c2b93)이라 14커밋 뒤처져 있다. 운영의 원본은 이 브랜치다. main으로 덮어쓰거나 main에서 배포하지 말 것.
자세한 내용: docs/reviews/INQUIRY-EVIDENCE-20261106.md. 시험: scripts/inquiry-evidence-regression.cjs (TEST_FIXTURE에 완주 저장 필요).

위치: 외장 SSD의 iscreammedia_sc34/5magnet (맥 /Volumes/T7 Shield, 윈도우는 드라이브 문자가 바뀔 수 있음)
저장소: yelmovie/magnet-discovery-lab, 브랜치 codex/magnet-quest-upgrade-20261021 푸시 완료 (main 미병합)
상태: 최종점검 1~4단계 수정 후 수동 운영 배포 완료. 자동 배포 추가 없음. 판정 조건부 배포 가능, 88/100.
소스: 47b1404
운영: https://magnet-city.pages.dev/
배포: 32f57d71 (2026-11-06). 이전 배포 4892887a 로 되돌릴 수 있음.
검증: 테스트 237개·브라우저 회귀 21개·빌드 통과. 운영 파일 175개 SHA-256 동일. 운영 스모크 2해상도, 오프라인 새로고침, 뒤로가기, 저장 복구 확인.
남음: 학생 난이도·수업 시간, 교사의 활동 목표 검수, 학교 태블릿·전자칠판·iOS 인쇄 실기, Suno 음원 조건 근거, 카톡 실제 카드 확인.
3D: 고리 모델 2개만 배포한다. 원본 Meshy GLB는 assets/source/3d-base-20261025/meshy/ (저장소 제외). 다시 압축은 node scripts/pack-glb.mjs, 정점 합치기(weld) 금지 — 텍스처가 찢어진다.
구형: 호출되지 않던 코드와 에셋은 _unused/src-legacy-20261106/, _unused/public-legacy-20261106/ 에 있다. 상자·운반기 3D 시연 포함.
오프라인: public/sw.js. 빌드가 캐시 이름과 사전 저장 목록을 채운다(vite.config.ts). 음악·음성·영상은 캐시하지 않는다.
배포 절차: npx vitest run → node scripts/pack-glb.mjs check → npm run build → wrangler pages deploy dist --project-name magnet-city --branch main → node scripts/verify-release.mjs https://magnet-city.pages.dev → node scripts/release-smoke.cjs https://magnet-city.pages.dev test-results/release-smoke.
윈도우 주의: 이 SSD의 node_modules/.bin 이 없으면 npm 스크립트가 도구를 못 찾는다. node node_modules/vitest/vitest.mjs run, node node_modules/vite/bin/vite.js build 로 직접 실행한다. vite preview가 켜져 있으면 dist가 잠겨 빌드가 실패한다.
자료: docs/reviews/RELEASE-REVIEW-20261106.md, docs/reviews/SCORE-20261106-2.md, public/assets/3d/README.md.
주의: 실제 학생 저장소를 지우며 시험하지 말 것. graphify-out/은 생성 자료로 커밋 제외.

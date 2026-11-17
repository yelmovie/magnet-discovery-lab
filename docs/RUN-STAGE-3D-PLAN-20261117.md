# 05 밀고 당기는 도시 · 3D 달리기 스테이지 계획 · 2026-11-17

**현재 단계: 구현·운영 배포 완료(2026-11-17).** 아래 계획은 작업 전에 쓴 것이고, 실제로 한 일은 문서 끝의 「계획 확정」과 「구현 결과」에 있다. 공통 규격은 [공통 계획](../../_shared/RUN-STAGE-3D-PLAN-20261117.md)에 있다. 이 프로젝트가 9개 중 첫 번째 기준 구현이다.

## 한 줄 요약

활동 8 「자석 택배를 부탁해」를, 밀이가 자석을 들고 레일 옆을 달리며 수레를 끌고 밀어 깃발까지 보내는 3D 달리기로 바꾼다.

## 바꿀 자리

- 4학년 「자석의 이용」, 4구역 '원격 제어 구역'의 두 번째 탐구. 전체 10개 활동 중 8번째이고 필수다.
- 지금 화면은 `src/missions-remote.ts`의 `delivery()`(107행 부근)가 그린다. 진입은 `src/main.ts`의 `activityPage()` → `inquiryView` → `missionView`(`src/mission-play.ts`)다.
- **`src/delivery.ts`와 `src/final-mission.ts`는 대상이 아니다.** `finalView()`를 부르는 곳이 없는 옛 코드이고, HANDOFF에 건드리지 말라고 적혀 있다. 처음 추천 때 이 두 파일을 가리킨 것은 잘못이었다.

## 지금 방식과 바뀐 방식

| | 지금 | 바꾼 뒤 |
|---|---|---|
| 조작 | 조종 자석을 끌어 오고, '뒤집기'로 극을 바꾸고, '자석 떼기'로 놓는다 | 방향판으로 밀이를 움직이고, '극 뒤집기'와 '자석 들기·내리기' 버튼을 누른다 |
| 1구간 | 수레를 깃발까지 보낸 뒤 자석을 떼어 세운다 | 수레 옆을 걸으며 끌어당겨 깃발 칸에 세운다 |
| 2구간 | 유리벽 너머에서 밀어 깃발에 세운다 | 유리 통로 건너편 길을 달리며, 유리 너머의 수레를 밀어 깃발 칸에 세운다 |
| 화면 | 2D 실험대(1280×720) | 레일이 깔린 3D 골목길 |

## 과학 개념과 조작

| 개념 | 달리기에서 하는 일 |
|---|---|
| 다른 극끼리는 끌어당긴다 | 수레의 극과 다른 극을 향하게 들고 앞서 걸으면 수레가 따라온다 |
| 같은 극끼리는 밀어낸다 | 같은 극을 향하게 들고 뒤에서 다가가면 수레가 앞으로 밀린다 |
| 자석의 힘은 떨어져 있어도, 유리를 사이에 두어도 작용한다 | 유리 통로 건너편에서 수레를 움직인다 |
| 가까울수록 힘이 세다 | 수레와의 거리에 따라 움직임이 달라진다. 거리 계산은 기존 함수를 쓴다 |

### 지켜야 할 제한

- HANDOFF 원문: "`domain.ts`·`mission-model.ts`의 힘·거리·마찰 계산과 N/S 표기. 재미를 위해 사실과 다른 움직임을 만들지 않는다."
- 그래서 자석의 힘으로 높이 뛰는 능력은 넣지 않는다. 점프는 길의 턱과 틈을 넘는 평범한 점프다.
- 수레가 움직이는지, 어디서 멈추는지는 `src/domain.ts`의 `relation()`과 `src/mission-model.ts`의 계산, `missions-remote.ts` 130행 부근의 멈춤 판정을 그대로 부른다.
- N·S 글자는 그림에 넣지 않고 코드로 그린다. 극의 색은 기존 화면과 같게 한다.

## 코스 구성

1. **연습 길:** 자석을 들고 걷기, 극 뒤집기를 한 번씩 해 본다. 길가의 철 클립은 가까이 가면 자석에 붙고, 알루미늄 캔과 플라스틱 뚜껑은 붙지 않는다. 모은 개수는 기록에 넣지 않는다.
2. **1구간 끌어당기기:** 출발역에서 중간역 깃발 칸까지. 자석을 내려놓아(떼어) 수레를 세운다.
3. **2구간 유리 통로:** 유리벽이 길을 나눈다. 밀이는 건너편 길로만 갈 수 있고, 유리 너머로 수레를 밀어 공방 깃발 칸에 세운다.

방해꾼은 지도 악당 스프라이트를 써서 레일 옆을 왔다 갔다 하게 한다. 닿으면 움찔만 하고 수레 위치는 바뀌지 않는다.

## 연결과 저장

- 저장은 IndexedDB(DB `push-pull-city`, 저장소 `saves`, 키 `main`)다. `activities[8].values`의 `round`, `car`, `controllerPole`, `segment0`, `segment1`, `controlled0·1`, `cartMethod0·1`과 `trials`의 증거 `delivery0`, `delivery1`을 기존과 같은 이름으로 남긴다.
- 완료 판정은 `src/mission-model.ts` 88행 부근 조건(`segment0`, `segment1`, 증거 두 개)을 그대로 쓴다. 완료 호출은 `main.ts`의 `finishActivity()` → `completeActivity()`다.
- 새로 넣는 값은 화면 방식 하나뿐이다(예: `values.view`). 이 값이 없으면 기존 저장으로 보고 그대로 이어 한다.
- 대체 화면은 기존 `delivery()` 2D 실험대다.

## 이미지 생성·적용 목록

그림체는 지도와 캐릭터가 2.5D 픽셀아트다. 참고 그림은 `public/assets/adventure/mili-poses-pixel.webp`와 `dangi-*-pixel.webp`다. 실험 화면 소품의 그림체는 작업을 시작할 때 `src/art.ts`를 보고 맞춘다.

| 번호 | 그림 | 종류 | 적용 위치 |
|---|---|---|---|
| 1 | 밀이 대기 | 캐릭터 동작 줄 | 서 있을 때 |
| 2 | 밀이 달리기(막대자석을 든 모습) | 캐릭터 동작 줄 | 이동 |
| 3 | 밀이 점프 | 캐릭터 동작 줄 | 점프 |
| 4 | 밀이 움찔 | 캐릭터 동작 줄 | 방해꾼에 닿았을 때 |
| 5 | 밀이 기뻐하기 | 캐릭터 동작 줄 | 깃발 칸에 세웠을 때 |
| 6 | 당이 따라 걷기 | 캐릭터 동작 줄 | 동료, 힌트 줄 때 |
| 7 | 수레(극 표시 자리를 비운 것) | 소품 | 레일 위 수레 |
| 8 | 막대자석(글자 없이 두 색) | 소품 | 밀이 손, 내려놓은 자석 |
| 9 | 깃발 칸 | 소품 | 도착 지점 |
| 10 | 철 클립, 알루미늄 캔, 플라스틱 뚜껑 | 소품 3장 | 연습 길 |
| 11 | 골목길 바닥 돌 무늬 | 바닥 무늬 | 길 |
| 12 | 레일과 침목 무늬 | 바닥 무늬 | 레일 |
| 13 | 도시 원경(먼 건물, 가까운 지붕) | 원경 2장 | 배경 |
| 14 | 역 건물 세 곳(출발역, 중간역, 공방) | 소품 3장 | 구간 경계 |
| 15 | 시작 카드 그림 | 시작 카드 | 활동 들어갈 때 |

유리벽은 그림 없이 반투명 판으로 코드에서 만든다. 생성 원본은 `asset-bank/original/run-stage-20261117/`(없으면 만든다)에, 실행 파일은 `public/assets/run-stage/`에 둔다. 예상 19장.

## 기술, 검증, 배포

- Three.js는 npm `three` 0.186.1이 이미 있다. `src/three-view.ts`처럼 필요할 때만 `import()`로 불러온다. 지금은 고리자석 모형을 돌려 보는 창에만 쓰고 있다.
- 방향판은 `src/map-controls.js`의 `bindDirectionPad`를 다시 쓴다.
- 검증 명령: `npm run build`(`tsc --noEmit && vite build`), `npm test`(vitest), `npm run test:browser`.
- `public/sw.js`의 캐시 목록은 빌드가 자동으로 채운다. 손으로 고칠 필요가 없다.
- 운영 주소는 https://magnet-city.pages.dev/ 이고 `wrangler pages deploy dist --project-name magnet-city --branch main`으로 직접 올린다. 푸시만으로는 배포되지 않는다.

## 작업 순서

1. 규칙 연결: 밀이 위치와 든 극을 기존 계산에 넘겨 수레 위치를 받는 함수와 테스트
2. 기본 도형으로 세 구간 만들고 끝까지 해 보기
3. 기록 연결: `segment`, `controlled`, `cartMethod`, 증거 기록이 기존과 같게 남는지 테스트
4. 이미지 생성·적용(위 표 순서대로 한 장씩)
5. 대체 화면, 새로고침 후 이어 하기, 교사 시연 확인
6. 검증 명령 → 커밋·푸시 → 운영 배포 → 운영 주소 확인

## 시작 전에 확인할 것

- 현재 브랜치는 `main`인데 HANDOFF에는 작업 브랜치가 `codex/magnet-quest-upgrade-20261021`로 적혀 있다. 어느 쪽이 운영 기준인지 확인한다.
- 추적되지 않은 문서 3개(`docs/MAP-VILLAIN-HANDOFF-20261114.md`, `docs/reviews/RELEASE-REVIEW-20261115.md`, `docs/reviews/SCORE-20261115.md`)가 있다. 이번 작업과 섞지 않는다.
- `puzzleRevision 2`의 유리벽 위치(가로 52)와 깃발 위치(60)를 3D 길의 좌표로 옮기는 비율을 정한다.
- 운영 시트 G·H열의 주소와 저장소를 대조한다.

---

## 계획 확정 · 2026-11-17 (구현 세션)

코드를 읽어 「시작 전에 확인할 것」을 해결하고, 위 내용 중 실제 코드와 다른 곳을 바로잡았다.

### 확인 결과

- **브랜치:** `main`이 `origin/main`과 같고 최근 운영 커밋(`e3871b0`)이 여기에 있다. `main`에서 작업한다. HANDOFF의 `codex/magnet-quest-upgrade-20261021`은 2026-11-12 시점 기록이다.
- **추적 안 된 문서 3개:** 이번 커밋에 넣지 않는다.
- **인계 문서 위치:** `HANDOFF.md`는 루트가 아니라 `docs/HANDOFF.md`에 있다.
- **수레 판정 위치:** 수레의 이동·마찰·멈춤 판정은 `mission-model.ts`가 아니라 `missions-remote.ts`의 `delivery()` 안 프레임 루프와 `finishStopped()`에 있다. `relation()`은 `delivery()`가 직접 부르지 않고 같은 규칙(`cartPole!==controlPole`)을 쓴다. 그래서 3D는 계산을 따로 만들지 않고 **`delivery()`를 그대로 판정 루프로 쓴다.** 3D 쪽은 밀이의 자석 위치를 실험대 좌표로 넘기고, 루프가 돌려준 상태를 그리기만 한다.
- **자동 실험:** `src/experiment-autoplay.ts`는 지금 화면 어디에서도 불러오지 않는다(단위 테스트만 쓴다). 자동 경로는 손대지 않았고, 연결이 되살아나도 `[data-drag="controller"]`가 있는 기존 2D 화면에서만 돈다.
- **방향판:** `bindDirectionPad`는 터치·마우스만 누름 콜백을 준다. 키보드(WASD·방향키·Space)는 달리기 입력 모듈이 직접 받는다.
- **운영 주소·저장소:** 지휘 세션이 대조한 값(https://magnet-city.pages.dev, `yelmovie/magnet-discovery-lab`)이 `origin`·`wrangler.jsonc`와 같다.

### 좌표 옮기기

실험대 좌표(가로 0~100)를 그대로 코스 길이로 쓴다. 실험대 1칸 = 3D 0.5m.

| 실험대 좌표 | 3D 코스 |
|---|---|
| -30 ~ 18 | 연습 길(수레 없음). 턱 1개, 틈 1개, 물건 3개, 방해꾼 1명 |
| 27 | 출발역. 수레가 서 있다 |
| 44 ± 3 | 중간역 깃발 칸(1구간 도착) |
| 47.5 | 2구간에서 밀이가 갈 수 있는 끝(`deliveryCourse.reach`). 유리문이 닫힌다 |
| 52 | 유리 보관실 앞벽(`deliveryCourse.wall`). 수레만 아래 문으로 지나간다 |
| 60 ± 3 | 보관실 깃발 칸(2구간 도착) |

- 자석을 든 높이는 실험대 세로 좌표로 바꿔 넘긴다. 레일까지의 옆 거리 1.1~3.3m가 세로 47~55에 해당해 `|세로-59|<12` 안에 든다. 「자석 내리기」는 2D의 「자석 떼기」와 같이 세로 38로 보낸다.
- 1구간에서는 2D처럼 유리벽이 없다. 3D에서는 같은 자리에 유리문이 열려 있다가 2구간이 시작되면 닫힌다. 2D 규칙(2구간에서만 손이 47.5를 넘지 못함)을 그대로 지키려고 이렇게 했다.

### 코스 설계표

| 구간 | 새로 쓰는 개념 | 하는 일 | 끝나는 조건 |
|---|---|---|---|
| 연습 길 | 철은 자석에 붙고, 알루미늄·플라스틱은 붙지 않는다 | 걷기, 턱 점프, 틈 점프, 극 뒤집기 한 번. 철 클립은 붙고 캔·뚜껑은 안 붙는다 | 출발역 도착(기록 없음) |
| 1구간 | 다른 극은 당기고 같은 극은 민다 | 수레 앞에서 당기거나 뒤에서 밀어 중간역 칸에 세우고 자석을 내린다 | 기존 `segment0` + `delivery0` |
| 2구간 | 자석의 힘은 떨어져 있어도, 유리 너머에도 작용한다 | 유리문 앞까지만 갈 수 있다. 뒤집어 뒤에서 밀고, 깃발 칸에서 자석을 내린다 | 기존 `segment1` + `delivery1` |

### 판단이 갈린 곳

- **카메라:** 캐릭터 뒤 위쪽에서 따라가는 고정 시점. 수레가 가까이 있으면 밀이와 수레의 가운데를 본다. 앞뒤 관계(누가 앞에 있나)가 한눈에 보여야 해서다.
- **캐릭터 그림:** 새로 만들지 않고 `mili-walk-pixel.webp`(4방향 걷기, 뒷모습 포함)와 `mili-poses-pixel.webp`를 다시 쓴다. 세션 9개가 이미지 도구를 한 장씩 번갈아 쓰기 때문에, 이미 있는 그림으로 되는 것은 만들지 않는다.
- **수레와 자석:** 세운 그림 대신 기본 도형으로 만든다. 수레의 앞뒤 극과 밀이 자석의 앞뒤 극이 3D에서 정확히 보여야 해서다. N·S 글자는 코드로 그린다.
- **깃발:** 기존 2D 화면에 있던 배달 장소 표시(짧은 기둥과 삼각 깃발)를 같은 색으로 옮겼다. 특정 게임의 도착 깃대와 다른, 이 프로젝트의 기존 요소다.
- **기본 화면:** 새로 시작한 활동 8은 3D가 먼저 뜨고 「기존 방식으로 하기」로 바꿀 수 있다. 진행 중이던 저장(`values.view` 없음), 움직임 줄이기, WebGL 실패, 교사용 전체 열기는 기존 2D로 시작하고, 3D를 쓸 수 있으면 「3D 달리기로 하기」 버튼이 보인다.

### 구현 작업 목록

1. `missions-remote.ts` `delivery()`에 달리기 연결구(자석 위치 받기, 상태 넘기기)를 넣는다. 2D 경로의 동작은 바꾸지 않는다. 테스트 먼저.
2. `run-stage-rules.ts`: 좌표 변환, 구간·복귀 지점, 물건이 붙는지(기존 `magneticReach`·`materials`), 이어 하기 위치. 테스트 먼저.
3. `run-input.ts`(입력), `run-course.ts`·`run-course.css`(화면 겹침·불러오기·대체 화면 전환), `run-stage.ts`(무대), `run-character.ts`(캐릭터·충돌).
4. `mission-play.ts`: 활동 8의 화면 방식(`values.view`)과 전환 버튼.
5. 바닥·배경 그림 생성과 적용.
6. 회귀 스크립트: 기존 2D 검사는 「기존 방식으로 하기」를 누르고 진행, 3D는 새 스크립트로 키보드·화면 버튼 완주 확인.

---

## 구현 결과 · 2026-11-17

### 무엇이 달라졌나

- 새로 시작한 활동 8은 3D 길로 열린다. 연습 길 → 1구간(중간역) → 2구간(유리 보관실)을 방향판·점프·극 뒤집기·자석 내리기/들기로 진행한다. 키보드는 WASD·방향키, Space(점프), F(극 뒤집기), E(자석 내리기/들기)다.
- 수레의 이동·마찰·정차 판정과 기록은 `delivery()` 한 곳에서 한다. 3D 완주로 남는 값은 2D와 같다: `round`, `car`, `controllerPole`, `segment0·1`, `controlled0·1`, `cartMethod0·1`, 증거 `stop0·1`·`delivery0·1`. 새 값은 `values.view` 하나다.
- 기존 2D 실험대는 그대로 있고 「기존 방식으로 하기」·「3D 달리기로 하기」로 오간다. 진행 중이던 저장, 움직임 줄이기, WebGL을 못 쓰는 기기(불러오기 실패·그래픽 끊김 포함), 교사용 전체 열기는 2D로 시작한다.
- 떨어지면 지나온 지점(-30, -11, 0, 20, 38)으로 돌아온다. 같은 곳에서 세 번 떨어지면 당이의 도움말이 나오고 기존 방식으로 바꿀 수 있다고 알려 준다. 도깨비에 닿으면 움찔만 하고 수레와 기록은 그대로다.
- 화면에 "설명 모형이야. 실제 자석의 힘은 자석과 거리에 따라 달라져."를 적었다. 자석의 힘으로 높이 뛰는 동작은 없다.

### 계획과 다르게 한 곳

- **이미지 19장 → 2장.** 밀이·당이는 기존 걷기 그림(4방향, 뒷모습 포함)과 포즈 그림을, 도깨비는 지도 악당 그림을, 연습 길 물건은 `material-kit.webp`를 다시 썼다. 수레·막대자석·깃발 칸·유리벽·레일·건물은 기본 도형과 코드로 그린 글자다. 새로 만든 것은 바닥 무늬와 도시 원경뿐이다. 세션 9개가 이미지 도구를 한 장씩 번갈아 써서, 있는 그림으로 되는 것은 만들지 않았다.
- **시작 카드 그림 없음.** 기존 긴급 의뢰 카드가 3D 화면 위에 그대로 뜬다.
- **자동 실험 경로 변경 없음.** `experiment-autoplay.ts`가 지금 화면에 연결돼 있지 않아 손댈 곳이 없었다.
- **밀이가 유리 통로 건너편 길을 달리는 구성 → 유리문 앞에서 멈추는 구성.** 2D 규칙(2구간에서 손이 47.5를 넘지 못함, 수레만 문으로 지나감)을 그대로 옮겼다.

### 바뀐 파일

| 파일 | 내용 |
|---|---|
| `src/missions-remote.ts` | `delivery(v, run?)`. 달리기 연결구 `DeliveryRun`(자석 위치 받기 `walk`, 상태 넘기기 `show`). 2D 경로의 계산은 그대로 |
| `src/mission-play.ts`, `src/inquiry.ts` | 활동 8의 화면 방식(`values.view`), 전환 버튼, 교사용 열기 전달 |
| `src/run-stage-rules.ts` | 규칙 연결: 좌표 변환, 구간·복귀 지점, 물건이 붙는지(`magneticReach`·`materials`), 이어 하기 위치, 3D를 열지 말지 |
| `src/run-input.ts` | 입력: 방향판(`bindDirectionPad`)·버튼·키보드를 하나의 상태로 |
| `src/run-course.ts`, `src/run-course.css` | 화면 겹침: 버튼·안내·진행 표시, 불러오기, 2D로 되돌리기 |
| `src/run-stage.ts` | 무대: 길·레일·역·유리 보관실·수레·카메라. `three`를 필요할 때만 받는 묶음 |
| `src/run-character.ts` | 캐릭터: 세운 그림, 캡슐·옥트리 충돌(games_fps 방식), 발밑 그림자 |
| `vite.config.ts` | 오프라인 미리 저장 목록에 `three.module`·`run-stage` 묶음 추가(고리 3D 창의 오프라인 동작 유지) |
| `tests/run-stage.test.ts` | 판정 연결 4개, 좌표·구간 규칙 5개 |
| `scripts/run-stage-regression.cjs` | 3D 완주(키보드 1280×800, 화면 버튼 1024×768), 2D 대체 화면 완주, 전환, 새로고침, 움직임 줄이기 |
| `scripts/run-stage-release-smoke.cjs` | 배포된 주소에서 3D를 키보드로 끝까지 플레이하고 저장 기록 확인 |
| `scripts/playful-regression.cjs` 외 3개 | 2D 실험대를 검사하는 기존 스크립트가 활동 8에서 「기존 방식으로 하기」를 먼저 누르게 함 |
| `README.md`, `docs/HANDOFF.md` | 사용법과 인계 |

### 성능 목표 대비

| 항목 | 목표 | 결과 |
|---|---|---|
| 추가 다운로드 | 3MB 이내 | 코드 약 0.61MB(`three.module` 585KB + `run-stage` 22KB, gzip 약 156KB) + 새 그림 2장. 캐릭터·소품 그림은 기존 파일 |
| 삼각형 | 3만 이하 | 상자·평면 위주로 수천 개 수준(측정 도구로 세지는 않았다) |
| 픽셀 비율 | 최대 1.5 | `min(1.5, devicePixelRatio)` |
| 그림자·후처리 | 둥근 그림자만, 후처리 없음 | 지켰다 |
| 저사양 30fps | 실기기 측정 | **측정하지 못했다** |

### 실행한 검증

| 검증 | 결과 |
|---|---|
| `npm test` (vitest) | 22개 파일 321개 통과. 새 테스트 9개 포함 |
| `npm run build` (`tsc --noEmit && vite build`) | 통과. `run-stage`·`three.module` 묶음이 `sw.js` 미리 저장 목록에 들어간 것 확인 |
| `scripts/run-stage-regression.cjs` (로컬 dev 서버, 헤드리스 크롬) | 18개 통과. 1280×800과 1024×768 각각에서 키보드와 화면 버튼으로 연습 길 → 1구간 → 2구간 완주, `segment0·1`·`delivery0·1`(당기기/밀기, `glass-room`, `manual`) 저장, 새로고침 뒤 이어짐, 버튼 크기(52px 이상)·이름·화면 안 배치, 2D 실험대 완주, 2D↔3D 전환, 틈에 떨어짐과 세 번째 도움말, 움직임 줄이기, 콘솔 오류 0건 |
| `npm run test:browser` (`playful-regression.cjs`) | **실패(이번 작업 이전부터).** 첫 단계 `teacherUnlock → begin(1)`에서 `screen` 2≠1. 이번 변경을 `git stash`로 빼고 돌려도 같은 자리에서 멈춘다. 활동 1이 활동 2로 열리게 바뀐 뒤(2026-11-12) 스크립트가 맞춰지지 않았다. 활동 8에 닿기 전에 멈추므로 2D 실험대 완주는 위 스크립트에 따로 넣어 확인했다 |
| `scripts/puzzle-regression.cjs` 등 `TEST_FIXTURE`가 필요한 스크립트 | 실행하지 못했다(완주 저장 표본이 이 맥에 없다). 활동 8에서 「기존 방식으로 하기」를 누르는 한 줄만 넣었다 |
| 화면 버튼 검사 방식 | 방향판과 점프는 `PointerEvent`를 직접 보내 확인했다. 실제 손가락 터치는 확인하지 못했다 |

### 확인하지 못한 것

- 학교 태블릿·전자칠판 실기기에서의 터치 조작과 프레임 수(30fps 목표).
- 실제 학생이 60~90초 안에 지나가는지, 연습 길의 난이도가 맞는지.
- 교사용 전체 열기에서 2D로 시작하는 것은 단위 테스트로만 확인했다(브라우저에서 눌러 보지는 않았다).
- WebGL이 없는 기기에서의 자동 전환은 코드 경로와 단위 테스트(`setRunBlocked`)로만 확인했다.

### 커밋과 배포

| 항목 | 값 |
|---|---|
| 저장소·브랜치 | `yelmovie/magnet-discovery-lab` `main` (강제 푸시 없음) |
| 커밋 | `53a3cf0` 3D 달리기 구현 · `9441235` 버튼 겹침 수정과 운영 확인 스크립트 · `502df1f` 검사 보강과 이 기록 |
| 운영 주소 | https://magnet-city.pages.dev (운영 시트 G열) |
| 배포 | Cloudflare Pages `magnet-city`, 운영 배포 `3b5365aa`(소스 `502df1f`). 앞서 `3d9f69ae`(소스 `53a3cf0`)를 먼저 올려 확인했다 |
| 파일 대조 | `node scripts/verify-release.mjs https://magnet-city.pages.dev` → 213/213 일치 |
| 운영 동작 | `node scripts/run-stage-release-smoke.cjs https://magnet-city.pages.dev` → 운영 주소에서 활동 8이 3D로 열리고, 키보드로 두 구간을 끝까지 배달했고, IndexedDB에 `view: run`, `segment0·1`, 증거 `delivery0·1`이 남았으며, 「기존 방식으로 하기」로 2D가 열렸다 |
| 미추적 문서 3개 | 커밋하지 않았다 |

---

## 화면 다듬기 · 2026-11-17 (사용자 요청: 그림 고도화, 겹침·잘림·어색한 물리 점검)

### 점검 방법

`.tmp/hud-audit.cjs`(커밋하지 않는 점검용)로 1920×1080, 1280×800, 1024×768, 915×412, 830×515, 768×1024의 6개 화면에서 장면 4개(연습 길, 1구간 끌기, 1구간 완료, 2구간 유리문)를 열어 화면 요소 14종의 사각형이 서로 겹치거나 화면 밖으로 나가는지 계산하고 캡처를 직접 봤다. 고친 뒤 24개 조합 모두 겹침 0건이다.

### 고친 것

| 종류 | 무엇이 이상했나 | 고친 방법 |
|---|---|---|
| 겹침 | 1920×1080에서 방향판과 도우미 「자꾸」가 겹침 | 도우미가 방향판 옆에 있을 때만 그 폭만큼 비켜남(`--run-pad-left`) |
| 겹침 | 작은 가로 화면에서 안내 문구와 자석 표시가 겹침 | 자석 표시를 N·S 두 칸으로 줄여 진행 줄로 올림 |
| 겹침 | 작은 화면에서 「유리벽 너머로 배달」이 방향판을 덮음 | 작은 화면에서는 오른쪽 버튼 줄에 둠. 큰 화면에서는 안내 문구 아래에 둬 수레를 가리지 않게 함 |
| 겹침 | 완료 뒤 「개념 영상 보기」가 점프 버튼을 덮음 | 다음 단계 버튼이 보이면 오른쪽 버튼들이 위로 올라감 |
| 잘림 | 빈 안내 칩이 떠 있음, 길과 벽 사이로 하늘이 비침 | 칩을 숨김, 바닥을 벽 안쪽까지 넓힘 |
| 물리 | 역 표지판과 깃발이 공중에 떠 있음 | 승강장 위 기둥에 달음 |
| 물리 | 수레 바퀴가 레일 바깥에 있음, 수레 자석이 유리 옆면에 닿음 | 바퀴를 레일 위로, 자석을 7cm 안쪽으로 |
| 물리 | 밀이가 유리문 앞 끝에 서면 자석 끝이 유리를 뚫음 | 유리문을 자석 길이만큼 뒤로 물림(실험대 49.0) |
| 물리 | 1구간에서 수레를 끝까지 밀면 보관실 끝벽과 레일 끝을 뚫음 | 레일을 84, 보관실을 82까지 늘림(수레가 갈 수 있는 끝은 79) |
| 물리 | 막대자석이 밀이 옆에 떠 있음 | 나무 손잡이를 달고 손 높이로 내림. 내린 자석은 반투명 |
| 물리 | 배달한 택배가 레일 옆 바닥에 놓임 | 승강장 받침대 위에 내려놓음 |
| 물리 | 유리문이 닫히거나 떨어져 돌아올 때 당이가 문을 지나 미끄러짐 | 따라오는 경로를 그 자리에서 다시 시작. 문이 닫히면 "유리문이 닫혔어" 안내 |

수레가 밀이 자석에서 3m(실험대 6칸) 뒤까지만 따라오는 것과 힘이 9m(18칸)까지 닿는 것은 2D 실험대의 규칙 그대로다. 화면의 "설명 모형" 문구가 이 과장을 알린다.

### 그림을 넣을 자리

길 양옆을 상점 줄 벽(높이 4.3m)과 지붕·청록 돔 탑으로 바꾸고, 왼쪽 보도와 오른쪽 승강장을 만들고, 소품 자리 30여 곳을 정했다. 그림 파일이 없으면 단색 벽과 빈 보도로 보이고 오류는 나지 않는다.

### 생성한 그림 (GPT 이미지, `gpt-imagegen` 스킬, 잠금 래퍼로 한 장씩)

원본은 `assets/source/run-stage-20261117/`, 게임용 파일은 `public/assets/run-stage/`에 있다. 변환은 `node scripts/prepare-run-stage-art.mjs`(크기 조정과 WebP 인코딩, 소품은 투명 픽셀 비율 확인)로 한다.

| 그림 | 원본 | 게임용 | 쓰이는 곳 | 검수 |
|---|---|---|---|---|
| 조약돌 바닥 | `street-tile.png` 1254×1254 | `street-tile.webp` 512×512, 45KB | 길, 턱, 왼쪽 보도(2m마다 반복) | 글자·로고 없음, 네 변이 이어짐, 물체·그림자 없음 |
| 상점 줄 정면 | `shop-row.png` 1774×887 | `shop-row.webp` 1536×768, 243KB | 길 양옆 벽(8.6m마다 반복) | 글자 없음(시계는 눈금만), 좌우가 이어짐, 사람 없음 |
| 소품 6종 | `props-sheet.png` 1536×1024 | `props-sheet.webp` 1536×1024, 266KB | 가로등·나무·꽃수레(보도·길가), 상자 더미·신호기(승강장), 벤치 | 진짜 투명 배경(완전 투명 74.2%), 3×2 칸 정렬, 바닥선이 칸 높이 93%로 같음 |
| 도시 원경 | `city-skyline.png` 2172×724 | `city-skyline.webp` 1536×512, 27KB | 길 끝 | 글자·사람 없음. 카메라가 아래를 보고 있어 화면에는 길 끝 안개처럼 조금만 보인다 |

추가 다운로드는 그림 4장 약 0.58MB와 코드 약 0.61MB로 합계 약 1.2MB다(목표 3MB 이내).

공통 그림체 문구: `cozy storybook steampunk canal town for an elementary science game, cream stone walls, teal-blue domes and shutters, warm terracotta roof tiles, small brass pipes and gears, hand-painted 2.5D game art with soft clean outlines and gentle warm light, cute and friendly`

- **street-tile:** `Seamless tileable top-down texture of a town street paved with rounded cobblestones in warm cream, honey and soft sand colors with thin darker mortar lines and a few tiny moss tufts, perfectly flat even lighting, no shadows, no objects, no perspective, the pattern continues perfectly across all four edges, square image. Style: cozy storybook steampunk canal town for an elementary science game, cream stone walls, teal-blue domes and shutters, warm terracotta roof tiles, small brass pipes and gears, hand-painted 2.5D game art with soft clean outlines and gentle warm light, cute and friendly. No text, no letters, no numbers, no logo.`
- **shop-row:** `Flat front elevation, orthographic, no perspective: one continuous row of four adjoining cute two-storey town shops seen straight on, filling the whole image from the left edge to the right edge and from the bottom edge to the top edge. Ground floor: arched wooden doors, round and square shop windows, striped awnings, hanging lanterns, flower boxes, barrels. Upper floor: shuttered windows, small balconies, brass pipes and one little gear clock. The wall ends in a straight stone cornice exactly at the top edge, no roofs and no sky visible. The left edge and right edge match so the row tiles seamlessly sideways. Style: cozy storybook steampunk canal town for an elementary science game, cream stone walls, teal-blue domes and shutters, warm terracotta roof tiles, small brass pipes and gears, hand-painted 2.5D game art with soft clean outlines and gentle warm light, cute and friendly. No people, no characters, no signs with writing, no text, no letters, no numbers, no logo.`
- **props-sheet:** `TRANSPARENT game object sprites in a strictly aligned sprite atlas with exactly 3 columns and 2 rows, canvas 1536x1024, six equal 512x512 cells, one object centered in each cell with clear empty margin, REAL transparent alpha background, no painted backdrop, no ground shadows. Row 1: a brass street lamp with a warm glowing lantern on a slim post; a small round tree in a wooden planter tub; a wooden flower cart planter full of red and yellow flowers. Row 2: a neat stack of two wooden crates with a brown paper parcel tied with string on top; a wooden park bench with brass armrests; a small station signal post with a round brass bell and a teal pennant. All objects are drawn from the same slightly raised front view, standing upright with their base on the same baseline near the bottom of each cell. Style: cozy storybook steampunk canal town for an elementary science game, cream stone walls, teal-blue domes and shutters, warm terracotta roof tiles, small brass pipes and gears, hand-painted 2.5D game art with soft clean outlines and gentle warm light, cute and friendly. No people, no characters, no text, no letters, no numbers, no logo.`
- **city-skyline:** `Wide panoramic backdrop of a whimsical canal city far in the distance under a soft blue morning sky with a few fluffy clouds: domed towers with teal-blue roofs, a clock tower, brass pipes, warm terracotta rooftops, a stone bridge, everything hazy and pale so it reads as far away, the lower third fades into light cream mist. Style: cozy storybook steampunk canal town for an elementary science game, cream stone walls, teal-blue domes and shutters, warm terracotta roof tiles, small brass pipes and gears, hand-painted 2.5D game art with soft clean outlines and gentle warm light, cute and friendly. No people, no characters, no vehicles, no text, no letters, no numbers, no logo.`

생성 차례는 다른 세션들과 겹쳐 첫 장이 나오기까지 약 80분이 걸렸다. `gpt-image.sh`를 백그라운드에서 돌릴 때는 `< /dev/null`을 붙여야 한다(안 붙이면 `codex exec`가 입력을 기다리며 멈춘다).

### 다듬기 뒤 검증과 배포

| 항목 | 결과 |
|---|---|
| `npm test` | 321개 통과 |
| `scripts/run-stage-regression.cjs` | 18개 통과(그림 4장 적용 상태) |
| 화면 겹침 점검 | 6개 화면 × 4개 장면 24조합 겹침·화면 밖 0건 |
| 커밋 | `52bdd63` 겹침·물리 수정 · `32a1584` 그림 4장과 변환 스크립트 |
| 운영 배포 | `f3fe56b0`(소스 `52bdd63`) → `377c2ed7`(소스 `32a1584`). `verify-release.mjs` 217/217 일치 |
| 운영 동작 | `run-stage-release-smoke.cjs` 통과. 운영 캡처에서 조약돌 길·상점 줄·소품이 보이는 것을 확인 |
| 내장 임시 원본 | 운영 확인 뒤 잠금 래퍼로 `gpt-image.sh -c` 4건 삭제. `-l`에 이 프로젝트 항목 0건 확인 |

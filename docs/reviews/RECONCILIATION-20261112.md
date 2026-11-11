# 작업 기록·커밋·공개 배포 대조 · 2026-11-12

## 확인 범위

11월 11일 납품 작업 기록, 승인된 리뉴얼 설계, 사용자 수정 요청, Git 이력·원격 브랜치, 공개 주소를 대조했다. 대조 시작점은 로컬/원격 `871e2c98d908a0c895f4e12082efa80bd536eb43`, 공개 배포 소스는 `5a04801ce400a8762cea93967baa51a262b04617`이었다. 두 커밋 사이 변경은 배포 검증 문서 4개였다.

초기 퍼즐 구현 `377ca42`와 이전 화면 마감 `fcc16ee`가 모두 현재 HEAD의 조상임을 확인했다. stash는 비어 있고, 작업 시작 시 미커밋 기능 파일은 없었다. 실행 코드에서 수정 후 빠진 기능은 발견되지 않았다.

## 요청별 대조

| 작업 기록·요청 | 커밋에 포함된 구현 | 검증 |
|---|---|---|
| 열쇠 거리·종이 실험 | `src/missions-force.ts`, `src/mission-model.ts` | 커밋 재빌드·퍼즐 회귀 |
| 밀기·당기기 두 문 | `src/missions-poles.ts`, `door0`/`door1` 완료 증거 | 같은/다른 극 직접 조작 |
| 고리 승강 발판·캐릭터 건너기 | `src/missions-poles.ts`, `platformCrossed` | 물체 배치·뜨기/붙기·완료 표시 |
| 수조 원격 닦기·세 구간 배송 | `src/missions-remote.ts`, `delivery0`~`delivery2` | 자동 관찰·단서·정차·재접속 |
| 광장 네 장치·수첩 연결 | `src/final-mission.ts`, `src/restoration.ts` | 철·거리·극·유리 증거와 수첩 진입 |
| 보상창 퍼즐 별 구분 | `src/main.ts`의 개별 퍼즐 이름과 별 묶음 | 1280/915에서 이름·저장별 개수 대조 |
| 힘 충전 문구 수정 | `src/map-villains.js`, `src/expedition.ts` | 새/이전 경로의 기다리는 이유와 안내 |
| 모든 주민 듣기 버튼·효과음 안내 제거 | `src/idea-lab.ts`, `src/resident-chat.ts` | 주민 10명, 음향 켬/끔 양쪽 |
| 소리 제어를 설정으로 통합 | `src/quest-ui.ts`, `src/main.ts`, `src/game-settings.ts` | 전체 페이지·10활동의 HUD, 음악/효과음 개별 저장 |
| 자동재생 1배/2배 | `src/autoplay-controls.ts/css`, 실험·장치 그림·광장 연동 | 기존 속도 실측 기록, 공개 주소 선택·재접속 |
| 교사 자동재생 허용/차단 | `src/game-settings.ts`, `src/domain.ts`, `src/main.ts` | 공개 주소의 정상 시작·교사 설정·활동 진입·새로고침 |
| 작은 화면 겹침 수정 | `src/experiment-autoplay.css`, `src/fit-activity.css` | 기존 최종 315회 측정과 해당 CSS의 커밋·배포 바이트 대조 |

위 기능은 `5a04801`에 포함돼 있었다. 각 파일의 현재 실행 소스는 HEAD와 일치한다.

## 복구·정리한 항목

1. 주민·별 표시·음향 통합을 검증한 `.tmp/ui-feedback-check.cjs`가 임시폴더에만 있었다. `scripts/ui-feedback-regression.cjs`로 복구하고 URL·fixture·출력 경로를 환경변수로 지정하도록 했다. 기존 9개 검사 묶음을 다시 통과했다.
2. 공개 주소에서 교사 설정을 확인한 `.tmp/delivery-production-settings.cjs`도 임시폴더에만 있었다. `scripts/production-settings-regression.cjs`로 복구했다. 실제 운영 URL에서 1280/1024/915의 3개 검사를 다시 통과했다.
3. `docs/HANDOFF.md`의 배포 전 이력에 “현재 로컬 작업 트리”, “이 절을 우선” 같은 문장이 남아 있었다. 당시 상태와 현재 상태를 구분하고, Git 작업 브랜치와 Pages production 설정값을 정확히 적었다. 리뉴얼 설계 마지막의 검토 링크도 최신 납품 보고서로 고쳤다.
4. 커밋 export로 새로 빌드한 결과에서 JSON 2개와 서비스 워커가 기존 운영 파일과 달랐다. `public/assets/quest/science-equipment.json`, `public/audio/sources.json`의 CRLF/LF 차이이며 JSON 객체는 완전히 같았다. 서비스 워커 차이는 그 바이트 차이로 계산된 BUILD 값뿐이었다. Git의 LF 규칙에 맞춰 작업 파일을 정규화하고 재빌드했다. 정리한 빌드 188개는 커밋 export 빌드와 모두 동일하다.

## 커밋만으로 재현

`git archive 871e2c9`를 외장 SSD에 펼쳐 기존 외장 `node_modules`를 연결한 뒤 `npm run build`를 실행했다. Git에 포함된 소스·공개 에셋만으로 TypeScript/Vite 빌드를 통과했다. 새 의존성을 설치하지 않았다.

별도 export는 `/Volumes/T7 Shield/DevCaches/tmp/magnet-reconcile-20261112-871e2c9`에 있다. 원래 프로젝트의 테스트 검색 범위와 겹치지 않도록 외부에 보관했다. 검사 준비 중 export까지 수집한 590개 실행은 고유 시험 수로 사용하지 않고, 분리 후 원본 295개를 다시 실행했다.

초기 비교는 184/187 바이트 일치였고 세 차이의 원인을 위에서 확인했다. 정규화 후 로컬과 export는 `_headers`를 포함해 188/188 일치한다. 정규화 빌드를 공개 주소에 반영한 뒤 정적 파일 187/187의 SHA-256 일치를 확인했다.

## 공개 배포 반영

- 복구 커밋 `2857ff4c2ae4b6ec41d5470a872d931cea8a72ba`를 원격 작업 브랜치에 푸시하고 SHA 일치를 확인했다.
- 공개 배포 ID는 `52861083-55fe-462b-9fd6-a78c122c83ae`, 버전 주소는 `https://52861083.magnet-city.pages.dev/`다. 운영 주소 `https://magnet-city.pages.dev/`의 canonical과 production 성공 상태를 확인했다.
- 커밋에는 검사 스크립트 두 개와 대조·인계 문서가 포함됐다. 게임 TypeScript/CSS의 실행 내용은 이전 검증 소스와 동일하다. 배포 산출물의 차이는 JSON 두 개의 줄바꿈과 그에 따른 서비스 워커 BUILD 값이다.
- 배포 전 공개 퍼즐 회귀 23개를 재실행해 전부 통과했고 JS 오류는 0건이었다. 공개 기본 경로 8개와 설정 3개도 통과했다. 재배포 후에도 smoke 8개·설정 3개가 전부 통과했다. 설정 검사에는 보이는 이미지의 로딩 완료·정상 크기 확인을 추가하고 최종 캡처를 직접 확인했다.
- 운영 파일은 187/187 일치, 새 manifest의 macOS 메타파일은 0개다. 기존 업로드 186개를 재사용하고 1개를 업로드했다.
- 되돌리기 기준은 직전 배포 `bd7a753b-bdf5-4346-8623-9c5b681976fd`다.

## 재실행 방법

환경의 `TMPDIR`, `XDG_CACHE_HOME`, `npm_config_cache`, `CHROME_PATH`를 외장 SSD로 지정한다. macOS에서는 기존 `.tmp/headless-external.sh`가 외장 외 브라우저 쓰기를 차단한다.

```sh
TEST_URL=http://127.0.0.1:4196/ \
TEST_PRODUCTION_URL=https://magnet-city.pages.dev/ \
TEST_FIXTURE=test-results/renewal-journey-20261111/student.json \
TEST_OUT=test-results/ui-feedback \
node scripts/ui-feedback-regression.cjs

TEST_URL=https://magnet-city.pages.dev/ \
TEST_OUT=test-results/production-settings \
node scripts/production-settings-regression.cjs
```

UI 검사의 fixture는 `scripts/playful-regression.cjs`의 완주 저장 산출물이다. 위 경로는 이번 검증에 사용한 합성 표본이며, 새 환경에서는 해당 스크립트로 먼저 만든다. 첫 검사는 개발 서버의 탐색용 hook을 사용한다. 두 번째는 공개 주소의 정상 UI만 사용한다. 사용자 학습 기록에 접근하지 않는다.

## 증거 위치

- `test-results/reconcile-20261111/committed-build-comparison.json` 초기 바이트 차이.
- `test-results/reconcile-20261111/normalized-build-comparison.json` 정규화 후 188개 일치.
- `test-results/reconcile-20261111/ui-feedback/results.json` 9개 검사 묶음.
- `test-results/reconcile-20261111/settings/results.json` 공개 교사 설정 3개.
- `test-results/reconcile-20261111/smoke/smoke.json` 공개 기본 경로·출력·오프라인 8개.
- `test-results/reconcile-20261111/puzzles/results.json` 공개 퍼즐 23개.
- `test-results/reconcile-20261111/final-hashes.json` 최종 운영 정적 파일 187개.
- `test-results/reconcile-20261111/final-smoke/smoke.json`, `final-settings/results.json` 재배포 후 검사.
- `.tmp/reconcile-20261111/unit-final.log`, `normalized-build.log`, `graph-update.log` 단위 시험·빌드·지식 그래프.

실제 학교 기기·학생 수업·iOS 출력·기존 음원 권리 자료 확인 조건과 8.8/10 성적은 기존 최종 검토를 따른다.

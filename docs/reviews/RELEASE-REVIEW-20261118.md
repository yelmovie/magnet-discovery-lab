# 납품 최종 점검 · 2026-11-18 (놀이 영역 비율·중복 버튼 정리 후)

> 범위: 공통 기준 `_shared/LAYOUT-BALANCE-DELIVERY-20261118.md` 3절 7번. 이번 변경(놀이 영역 크기·중복 버튼, [LAYOUT-BALANCE-20261118.md](../LAYOUT-BALANCE-20261118.md))을 반영한 상태의 A~G 판정. 학습 문구·판정·저장·진행 로직은 이번에 바꾸지 않았다.
> 브랜치 `main` · 기준 커밋 `6e9cf2e` + 이번 커밋 · 배포 대상 Cloudflare Pages `magnet-city` (https://magnet-city.pages.dev)

## 최종 판정

**조건부 배포 가능**

### 왜 이 판정인가

- 확인된 FAIL 없음. 빌드·타입 검사·단위 시험 22파일 326개 통과, 바꾼 화면은 앱 안 브라우저에서 세 뷰포트(+1600×900, 915×412) 넘침 0, 발명 공방 9·10을 실제 클릭으로 끝까지 마치고 저장(활동 10개·증거 5개)과 「이어 하기」까지 확인.
- 다만 00:20 무렵부터 이 맥에서 헤드리스 Chrome이 시작 단계에서 멈춰(아래 「점검 환경」) 프로젝트의 Playwright 회귀(`npm run test:browser`, 레이아웃 전수 감사, 운영 smoke)를 이번에는 돌리지 못했다. B 핵심 경로 중 B14(활동 도중 새로고침 복원)를 이번 빌드로 직접 밟지 못해 규칙상 `배포 가능`을 줄 수 없다.
- 11-15 점검의 P0(철 열쇠 직후 새로고침 유실)는 그 뒤 커밋 `8fe5ec9`에서 고쳐졌고 그 커밋이 `release-smoke.cjs`에 해당 재현 단계를 추가했다. 이번 변경은 그 경로(`main.ts` 저장)를 건드리지 않는다.

### 배포 전 처리할 조건

1. 없음(이번 변경은 CSS와 타이틀 버튼 한 개라 배포 차단 요인 없음). 운영 반영 뒤 파일 해시 대조(`verify-release.mjs`, `cmp.sh`)로 확인한다.

### 배포 후 확인할 것

1. Chrome이 다시 뜨면 `node scripts/release-smoke.cjs https://magnet-city.pages.dev`와 `npm run test:browser`를 돌려 B14·C 전수를 채운다.
2. 1920×1080 전자칠판에서 인증서·수첩·공방 확대가 눈으로 자연스러운지 본다(인증서 1920은 이번에 계산값만 확인).

---

## 요약

| 영역 | PASS | WARNING | FAIL | NOT TESTED | N/A |
|---|---|---|---|---|---|
| A 교육적 품질 | 8 | 1 | 0 | 2 | 0 |
| B 기능 | 8 | 1 | 0 | 2 | 0 |
| C 태블릿·UI | 6 | 2 | 0 | 3 | 0 |
| D 성능 | 3 | 1 | 0 | 2 | 0 |
| E 코드 품질 | 4 | 2 | 0 | 0 | 1 |
| F 데이터·안전 | 4 | 0 | 0 | 1 | 0 |
| G 배포 | 5 | 0 | 0 | 1 | 0 |

## 점검 환경 (실측)

| 항목 | 값 |
|---|---|
| package manager | npm (`package-lock.json`) |
| 실행 명령 | `package.json`: `build`(=`tsc --noEmit && vite build`), `test`(vitest), `test:browser`(Playwright) |
| lint | **정의 안 됨** (N/A) |
| typecheck | `npx tsc --noEmit` 통과 |
| test | `vitest run` 22파일 326개 통과 |
| build | `npm run build` 통과. 선택 3D 청크 500KB 초과 경고(기존과 같음) |
| 브라우저 | Playwright·헤드리스 Chrome **실행 불가**. 앱 안 브라우저 창(숨김 상태)에서 빌드본을 정적 서버(127.0.0.1:4198)로 열어 DOM 측정·클릭 |

헤드리스 Chrome 멈춤: `Google Chrome --headless --dump-dom`이 출력 없이 멈춤. `sample`로 보면 ChromeMain 초반 `fopen → __open_nocancel`에서 대기. 같은 시각 `~/Desktop`·`~/Downloads`·`~/Music`·`~/Library/Mobile Documents` 목록 읽기가 timeout(124), `~/Documents`·SSD는 정상 → macOS 폴더 접근 권한 확인 창이 사용자 응답을 기다리는 상태로 보인다. Vite 개발 서버(4196, 다른 세션의 4395 포함)의 `/` 응답과 `vite preview` 시작도 같은 이유로 멈췄다. 사용자 응답이 필요해 이번 세션에서 풀지 않았다. 다른 세션의 Chrome도 같은 곳에서 멈춰 있었다.

자동 전수 스윕(`scripts/layout-audit.cjs`): 위 사유로 **이번 빌드에서 실행 못 함**. 변경 전 상태는 이번 세션 `measure.cjs`로 3뷰포트 19화면 측정·촬영 완료(`.tmp/layout-balance-20261118/before/`).

---

## A. 교육적 품질 — 이번 변경 없음(화면 크기·버튼 노출만)

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| A1~A5 | 목표–활동 일치, 성취기준, 정답 맞히기로 끝나지 않음, 근거 생각, 오개념 피드백 | PASS(확인됨, 인용) | [11-11 납품 검토](RELEASE-REVIEW-20261111-DELIVERY.md), [11-15](RELEASE-REVIEW-20261115.md). 이번에 학습 문구·판정 파일 미변경(`git diff --stat`) |
| A6 | 난이도(실제 학생) | NOT TESTED | 학생 수업 관찰 없음 |
| A7~A10 | 보상·클릭 반복·힌트·오답 후 튕김 | PASS(확인됨, 인용) | 위 보고서. 이번에 공방 9·10 완주 시 단계 잠금(「친구 의견 보기」는 전시 전 비활성) 직접 확인 |
| A14 | 어휘·지시문 학년 적합성 | PASS(추정) | 문구 변경 없음 |
| A16 | 조작 다양성 | WARNING(추정) | 실험 활동의 기구 판이 화면 높이 40~53%(이번 측정). 장면은 꽉 차지만 기구가 작게 보일 수 있음 → 제안으로 남김 |
| B16 | 40분 분량 | NOT TESTED | 실제 수업 시간 미측정 |

## B. 기능

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| B1 | 시작 | PASS(확인됨) | 저장 없음: 「시작하기」만 보이고 누르면 저장 생성. 저장 있음: 「시작하기」·「이어 하기」 |
| B3 | 스테이지 이동 | PASS(확인됨) | 공방 9 → 10 → 완성 → 지도. 활동 1~10 진입은 변경 전 측정에서 모두 열림 |
| B5·B6 | 진행·보상 | PASS(확인됨) | 공방 완성 후 저장 `completed 1~10`, `evidence 5` |
| B9 | 자동저장 | PASS(확인됨) | 위 저장값을 IndexedDB에서 직접 읽음 |
| B10 | 이어하기 | PASS(확인됨) | 저장 `resume 9/10` → 「이어 하기」 → 해당 공방 단계로 진입, 완료 후 새로고침 → 「이어 하기」 → 지도 |
| B14 | 활동 도중 새로고침 복원 | NOT TESTED | Playwright 불가. 11-15 P0는 `8fe5ec9`에서 수정·smoke에 추가(이번 미재실행) |
| B17~B19 | 중복 보상·피드백 동기화·조작 응답 | PASS(인용) / B19 WARNING(인용) | 11-11 보고서. 이번 변경 범위 밖 |
| B11 | 뒤로가기 | PASS(추정) | HUD 홈·뒤로 유지, 지운 버튼은 HUD 홈과 같은 `go('city')`(`main.ts:559`)라 진행 경로가 막히지 않음 |
| B-준 | 스케치 판 좌표 | PASS(확인됨) | 판이 커진 뒤 스티커를 판 40%·60% 지점에 누르면 그 자리에 붙음 |
| B12 | 초기화·완료 | NOT TESTED | 이번 미재실행(인용: 11-15 PASS) |

## C. 태블릿·UI

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| C1·C2 | 16:9 가로, 1024px 이상 | PASS(확인됨) | 1280×800·1024×768·1920×1080·1600×900에서 바꾼 화면 페이지 스크롤 0, 내부 넘침 0 |
| C4·C5·C6 | 겹침·잘림·화면 밖 | PASS(확인됨, 바꾼 화면만) / 전체 NOT TESTED | 확대된 수첩 4쪽이 1600×900에서 24px 넘쳐 배율을 1.1로 낮춤 → 0. 전 화면 전수는 layout-audit 미실행 |
| C3 | 터치 영역 | PASS(확인됨) | 확대 화면에서 버튼·입력 중심점 `elementFromPoint` 일치 |
| 915×412 | 폰 가로 | PASS(확인됨, 공방 스케치) | 새 규칙은 높이 600px 이상만. 판 313×176, 내부 스크롤 322px로 변경 전과 같음 |
| C10 | 디자인 일관성 | PASS(확인됨) | 주 버튼 한 곳: 보고서 「발견 정리 시작」, 인증서 「인증서 인쇄」만 남김 |
| C14 | 놀이 영역 비율 | WARNING(확인됨) | 공방 스케치 1920 판 43→60%h, 전시 27→45%a, 수첩 31→49%a. 실험 기구 판은 40~53%h로 기준 70% 미만(장면 판은 75~100%로 통과) |
| C18 | 모달 크기 | PASS(인용) | 3초 규칙 작업(11-17) 0.25 scrim·카드 50% 이하 |
| C19 | 실제 기기 | NOT TESTED | 학교 태블릿·전자칠판 실기 없음 |
| C25 | 200% 확대 | NOT TESTED | 이번 미실행 |
| C9 | 키보드 | WARNING(인용) | 11-11 C25·C20 경고 유지 |

## D. 성능

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| D1 | 초기 로딩 | 배포 후 측정(아래 「운영 확인」) | |
| D2·D3 | 이미지·오디오 크기 | PASS(인용) | 이번 에셋 추가 없음 |
| D5 | dependency | PASS(확인됨) | `package.json`·lock 변경 없음 |
| D8 | 3D 청크 | WARNING(확인됨) | 빌드 경고 `three.module` 640KB(선택 로드), 기존과 같음 |
| D10 | 저사양 기기 | NOT TESTED | 실기 없음 |
| D11 | 오프라인 재방문 | NOT TESTED(이번) | 앱 안 창이 서비스워커 스크립트를 요청하지 않음(정적 서버 로그 `sw.js` 0건). 11-15 PASS 인용 |

## E. 코드 품질

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| E11 | 빌드 | PASS(확인됨) | `npm run build` |
| E12 | 테스트 | PASS(확인됨) | 326개 |
| E-lint | lint | N/A | 명령 없음 |
| E5 | console 오류 | PASS(확인됨, 앱) | 공방 완주 중 앱 오류 0. 콘솔의 "unknown error when fetching the script"는 앱 안 창의 서비스워커 요청 실패(환경) |
| E1·E6 | 구형 경로·하드코딩 | WARNING(인용) | 11-11 경고 유지. 학생 흐름에서 들어오는 길이 없는 보고서 화면(`reportPage`)이 남아 있음(`main.ts:418`) |
| E-변경 | 이번 변경 크기 | PASS(확인됨) | CSS 3파일 추가 규칙 + `quest-ui.ts` 1줄 |

## F. 데이터·안전

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| F1~F3 | 학생 정보 수집·전송 | PASS(인용) | 저장은 기기 내 IndexedDB만. 이번 변경 없음 |
| F13 | 비밀키 | PASS(확인됨) | `dist/assets`에서 `sk-`, `service_role`, `AKIA`, JWT 형태 0건 |
| F10 | 초기화 | PASS(인용) | 11-15 |
| F11 | 음원 이용조건 근거 | NOT TESTED(인용) | 11-11 조건 유지 |
| F15 | 해금 플래그 | PASS(인용) | |

## G. 배포

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| G13 | git status | PASS(확인됨) | 다른 세션 미커밋(`src/main.ts`, `src/concept-video.ts`, `src/concept-fullscreen.css`, docs 3개)은 커밋에서 뺌 |
| G1·G2·G10 | 배포·smoke | 아래 「운영 확인」 | |
| G19 | iOS 공유·인쇄 | NOT TESTED(인용) | |

## 운영 확인

- 커밋 `d86b6e2` 푸시 → `_scratch/deploy-20261118/deploy.sh 05 5magnet pages magnet-city`(origin/main만 빌드) → Pages 배포 `c0edf5d9`.
- `cmp.sh 05`: `assets/index-3-XG8rrd.js` build=live **MATCH**, index **MATCH**.
- `node scripts/verify-release.mjs https://magnet-city.pages.dev`(배포 빌드 폴더에서): **384/384 identical**. 첫 시도는 새 CSS 1개가 엣지 전파 전이라 HTML이 돌아왔고, 바로 다시 받아 일치.
- 운영 주소를 앱 안 브라우저로 열어 로드된 CSS가 `index-B-cfdWYc.css`이고, 그 안에 인증서 「도시 둘러보기」 숨김, 스케치 판 규칙(`min-height: 600px` 조건), 수첩 확대(1.1/1.25) 규칙이 들어 있음을 확인.
- 첫 화면 파일 전송(curl, 압축 받기): `/` 1.2KB 58ms, 메인 JS 156KB 68ms, CSS 80KB 57ms, 로고 190KB 49ms. 브라우저 첫 그리기 시간은 이번에 못 잼(앱 안 창에 기존 캐시가 있음, 헤드리스 Chrome 불가).
- 운영 smoke(`release-smoke.cjs`)는 헤드리스 Chrome 불가로 **미실행**.

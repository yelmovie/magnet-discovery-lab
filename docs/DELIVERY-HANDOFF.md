# 납품 안내 · 밀고 당기는 도시 (05 자석)

기존 인계 문서: [HANDOFF.md](HANDOFF.md)(3D 달리기 스테이지와 작업 이력), [../README.md](../README.md). 두 파일은 그대로 두었습니다.

## 1. 한눈에

| 항목 | 내용 |
|---|---|
| 이름 | 밀고 당기는 도시(자석 탐구 웹게임, 05번) |
| 운영 주소 | https://magnet-city.pages.dev |
| 저장소 | 이 폴더(`5magnet`, 독립 git 저장소, 브랜치 `main`) |
| 현재 앱 커밋 | `b4d70d4` (2026-11-22, 인증서 최신 수정). 기존 운영 배포 유지, 공식 운영 파일 SHA-256 일치 |

## 2. 폴더 구조

- `src/`, `index.html`, `public/`: 앱 코드와 배포되는 그림·영상·소리·글꼴·3D 모델
- `functions/video/`, `worker/media-range.js`: 영상 탐색 요청(Range) 처리
- `dist/`: 빌드 결과(배포 대상, git 제외)
- `tests/`, `scripts/`: 자동 검사, 브라우저 점검, 배포 검증, 그림·영상 준비 스크립트
- `assets/`, `docs/`, `thumbnails/`: 원본 소스·출처 기록, 문서, 납품 썸네일(배포되지 않음)

## 3. 실행·빌드·검사 명령

`package.json`에서 확인한 것입니다. Node.js 22.12 이상을 권장합니다(README).

- `npm run dev`: 개발 서버(127.0.0.1)
- `npm test`: vitest 자동 검사
- `npm run build`: `tsc --noEmit` 후 `vite build`(결과는 `dist/`)
- `npm run preview`: 빌드 미리보기
- `npm run test:browser`: 브라우저 회귀 점검(`scripts/playful-regression.cjs`)
- `npm run story:render`: 인트로·엔딩 영상 편집 렌더

## 4. 배포

- 호스팅: Cloudflare Pages, 프로젝트 `magnet-city`, 빌드 폴더 `dist`(`wrangler.jsonc`).
- 배포 명령(README 「Cloudflare 배포」): `wrangler pages deploy dist --project-name magnet-city --branch main`.
- 배포 뒤 확인: `node scripts/verify-release.mjs https://magnet-city.pages.dev`(`dist/` 파일을 운영에서 받아 SHA-256 비교), `node scripts/release-smoke.cjs <주소> <폴더>`.
- GitHub에 푸시해도 자동 배포되지 않습니다. 워크플로 파일이 없고, 검증한 빌드를 직접 올립니다.
- 영상 Range 처리: `functions/video/story/[[path]].js`, `functions/video/concepts/[[path]].js`가 `worker/media-range.js`를 불러 206 응답을 만듭니다.
- 배포 헤더는 `public/_headers`, 서비스 워커는 `public/sw.js`입니다.

## 5. 다른 호스팅으로 옮길 때 챙길 것

- 정적 파일 폴더: `npm run build`로 만든 `dist/` 전체.
- 영상: mp4가 `dist/video/story/`, `dist/video/concepts/`에 있고, 서버가 Range 요청에 206으로 답해야 합니다. 그렇지 않으면 탐색이 안 되고 iPad Safari에서 재생되지 않습니다(`worker/media-range.js` 주석).
- 서비스 워커(`public/sw.js`)와 `public/_headers`의 헤더 규칙을 같은 효과로 옮깁니다.
- 환경 값: 코드와 문서에서 필요한 환경 변수는 확인하지 못했습니다. 진행 저장은 브라우저 IndexedDB(`push-pull-city`)라 서버 값이 없습니다.

## 6. 버전과 변경 이력

앱 코드(`src`, `public`)를 바꾼 최근 커밋입니다.

- `73794a7` 2026-11-21 쓰지 않는 보고서 화면·자동 재생 코드·그림 창과 전투 시트 파일 삭제
- `3a0f3cb` 2026-11-21 브라우저 뒤로 가기를 게임 안에서 처리(활동 → 지도 → 시작 화면)
- `ae96073` 2026-11-21 공통 성취 카드 글자를 10번 기준에 맞춤
- `9448c57` 2026-11-21 대비가 낮은 글자 세 곳 보정, 1024 태블릿 125% 확대 맞춤
- `a376986` 2026-11-20 지도 악당 글자를 18px로
- `c4e6beb` 2026-11-20 악당 말풍선과 내보내기 카드 글자 균형
- `7ab0be5` 2026-11-20 시작 화면 우측 하단에 제작·저작권 표기 추가
- `47c7436` 2026-11-20 저작권·제작 표기를 「기획·제작: 옐샘 & ⓒ 아이스크림미디어」로 통일
- `e5ae502` 2026-11-20 목소리 스위치를 효과음에서 분리, 효과음 크기 추가

## 7. 권리·출처

[RIGHTS-LEDGER-20261121.md](RIGHTS-LEDGER-20261121.md)에 그림·영상·음악·효과음·목소리·글꼴을 41줄로 정리했습니다. 29줄은 확인됨, 6줄은 사용자 확인, 6줄은 근거 약함(G4·G5 Higgsfield 그림, G15 주민 초상, G27 3D 모델, V1 인트로·엔딩 영상, A3 옛 목소리)입니다. 근거 약한 줄은 요금제 화면이나 이용 조건 자료를 받아야 채울 수 있습니다.

## 8. 알려진 한계와 남은 일

성적표 [reviews/SCORE-20261121.md](reviews/SCORE-20261121.md) 기준 총점 90점, 실기기 제외 96점입니다.

- 다음 단계에서 풀 것: 실험 기구 판 화면 비율(C14, 사용자가 지금 모습을 유지하기로 결정), 빌드의 `three.module` 청크 경고.
- 자료 대기: 음원 이용조건, 권리 장부의 근거 약한 줄, 교사 검수표 검수.
- 실기기·수업 대기: 학생 난이도, 40분 수업, 실제 손가락 조작, 학교 태블릿·전자칠판, 저사양 태블릿, iPad 실물 인쇄.

## 운영 대조 기록 (2026-11-22 12:56)

- 조율 세션이 운영 주소의 `index`와 스크립트·스타일 파일 6개를 저장소 `origin/main`과 대조했습니다. 결과는 모두 일치입니다(불일치 0).
- 위 본문에 「운영 반영 확인 필요」로 적힌 칸은 이 대조로 확인된 것입니다. 이후 앱을 다시 배포하면 `_scratch/final-recheck-20261120/prodcmp.sh 05`로 다시 대조합니다.

## 최신 인증서 운영 마무리 (2026-11-22)

- 앱 `b4d70d4`: A4 가로 인증서, 학교·학년·반·번호·이름 손기입 빈칸, 인쇄 / PDF 및 PNG 저장. 진행·성취 숫자 요약은 없고 제목을 굵게 표시합니다. 이름을 화면에서 입력하거나 전송하지 않습니다.
- 공식 운영 주소 https://magnet-city.pages.dev/ 의 index·실제 JS/CSS SHA-256이 최신 빌드와 일치합니다. 기존 운영 배포 유지를 유지했고, 이번에는 납품 문서의 버전과 안내만 갱신했습니다.
- 세 화면 크기·PDF 한 쪽·2400px PNG 확인은 기존 인증서 완료 기록을 유지합니다. 실기기·실물 인쇄·수업 검수와 권리 증빙 대기는 완료로 바꾸지 않았습니다.

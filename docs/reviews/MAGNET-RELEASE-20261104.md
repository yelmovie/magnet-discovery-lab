# 운영 배포 · 우편함 조립·주민 음성·탐험 수첩 — 2026-11-04

대상: `yelmovie/magnet-discovery-lab`, 맥 `/Volumes/T7 Shield/iscreammedia_sc34/5magnet`. 사용자 요청에 따라 GitHub 푸시 후 수동 배포했다.

## 배포

| 항목 | 값 |
|---|---|
| 소스 커밋 | `c317fc54eb06d0cb6f470ec42757bf2e97be9953` (작업 트리 변경 없음) |
| GitHub 브랜치 | `codex/magnet-quest-upgrade-20261021` (`main`에는 병합하지 않음) |
| 운영 주소 | https://magnet-city.pages.dev/ |
| 배포 고유 주소 | https://2495e2f2.magnet-city.pages.dev/ |
| Cloudflare 배포 ID | `2495e2f2-afa1-4ee4-b3d2-f4dd96bfd8c7` · Production · `main` |
| 도구 | Wrangler 4.155.0 |
| 업로드 | 153개 중 새 파일 85개, 기존 68개 재사용 |
| 이전 배포 | `701affb0-4f2a-4e1c-a523-baabc6abab3d` (`62ced2e`, 되돌릴 때 이 배포를 다시 올린다) |

## 배포 전 검사

| 검사 | 결과 |
|---|---|
| `npm test` | 16파일 217/217 |
| `node scripts/pack-glb.mjs check` | 3D 모델 7개, 21.5MB |
| `npm run build` | 성공. `dist` 153개, 71MB, 숨김 파일 0 |
| `scripts/playful-regression.cjs` | 20/20 (로컬 개발 서버, 맥 Chrome) |

`playful-regression.cjs`는 현재 앱 흐름에 맞춰 네 곳을 고쳤다. 교사 해금 구역 직행, 수조 얼룩 새 좌표, 배달 1회 완료, 마지막 수첩 5문제다. 수첩은 오답이면 다음으로 못 가는지도 새로 검사한다. 앱 코드는 바꾸지 않았다.

## 운영 파일 대조

`node scripts/verify-release.mjs <주소> <결과.json>`으로 `dist/`의 모든 파일을 운영에서 다시 받아 SHA-256을 비교했다.

| 주소 | 결과 |
|---|---|
| https://2495e2f2.magnet-city.pages.dev | **153/153 동일** |
| https://magnet-city.pages.dev | **153/153 동일** |

## 운영 주소 스모크

`scripts/release-smoke.cjs`는 그대로 돌리면 실패한다(아래 「발명품 3D 시연 진입 없음」 참고). 임시 사본에서 상자·운반기 3D 대신 수첩 화면을 확인하도록 바꿔 돌렸다. 저장소의 스크립트는 고치지 않았다. 새 브라우저 문맥마다 시험용 저장을 넣어 확인했고, 실제 학생 기록에는 접근하지 않았다.

| 해상도 | 시작 화면 | 고리 3D | 탐험 수첩 |
|---|---|---|---|
| 1280×800 | 통과 | 통과 | 통과 |
| 1024×768 | 통과 | 통과 | 통과 |

각 검사에서 콘솔 오류·실패 요청 0이고, 시작 화면과 수첩 화면의 깨진 이미지도 0이다. 결과: `test-results/release-20261104/`.

## 남은 문제

### 발명품 3D 시연 진입 없음

자석 잠금 상자·유리 너머 운반기 3D 시연을 여는 버튼(`data-restoration="view3d"`)이 이번 커밋에서 마지막 화면 개편과 함께 없어졌다. `open-3d`를 보내는 곳은 이제 고리 3D(`src/mission-play.ts`)뿐이다. `src/main.ts`의 시연 코드와 3D 모델은 남아 있지만 학생이 열 수 없다. 의도한 제거인지는 확인되지 않았다.

- 되살린다면: 수첩 완성 화면에 버튼을 다시 넣고 `release-smoke.cjs`의 진입 경로를 고친다.
- 제거가 맞다면: `release-smoke.cjs`에서 상자·운반기를 빼고 README의 「3D 카드 3종」 설명을 고친다.

### 확인하지 못한 범위

- `scripts/browser-regression.cjs`에 수조의 옛 얼룩 좌표가 남아 있다. 이번에는 실행하지 않았다.
- `layout-audit`, `tablet-layout-regression`, `experiment-audio-regression`, `pixel-mascot-regression`, `autoplay-progress-regression`은 이번에 실행하지 않았다.
- 실제 태블릿·전자칠판 터치와 학교망 로딩 시간은 미검증이다.
- 운영 주소에서 10개 활동 전체를 플레이하지는 않았다. 전체 플레이는 로컬 개발 서버에서 확인했고, 운영은 파일 해시와 스모크로 확인했다.

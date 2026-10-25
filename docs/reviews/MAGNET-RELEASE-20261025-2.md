# 운영 배포 · 납품 마감 디자인 + 3D 보기 — 2026-10-25 (2차)

대상: `yelmovie/magnet-discovery-lab`, `D:\iscreammedia_sc34\5magnet`. 사용자 요청("지금 상태로 Cloudflare에 배포하고 운영 파일이 로컬 빌드와 같은지 확인")에 따라 수동 배포했다. GitHub 푸시와 자동 배포 설정은 하지 않았다.

## 배포

| 항목 | 값 |
|---|---|
| 소스 커밋 | `d44669a5acad56380f0b10feb8b63c780349ef6f` (작업 트리 변경 없음, 추적 안 하는 `.claude/`만 존재) |
| 운영 주소 | https://magnet-city.pages.dev/ |
| 배포 고유 주소 | https://bb8057cf.magnet-city.pages.dev/ |
| Cloudflare 배포 ID | `bb8057cf-e1c1-4b06-9a8e-ca20bf0c6f36` · Production · `main` |
| 배포 시각 | 2026-10-25 22:48 KST 무렵 (목록 조회 22:58에 "10분 전") |
| 도구 | Wrangler 4.151.1 · `wrangler pages deploy dist --project-name magnet-city --branch main --commit-hash d44669a…` |
| 업로드 | 89개 중 새 파일 20개, 기존 69개 재사용 |
| 이전 배포 | `b4c36b1e-7191-4551-bb70-08dc777089e9` (`eba6e88`, 되돌릴 때 이 배포를 다시 올린다) |

이번 배포에 들어간 변경: 실험 화면 미션판 통합, 그림 7종 교체, 능력 문장 인증서, 첫 화면 로고 경량화, 고리자석 3D 돌려 보기, 발명품 3D 작동 시연(자석 잠금 상자·유리 너머 운반기), 3D 모델 7개.

## 배포 전 검사

| 검사 | 결과 |
|---|---|
| `npx vitest run` | 10파일 107/107 |
| `node scripts/pack-glb.mjs check` | 3D 모델 7개, 21.5MB, meshopt 압축 확인 |
| `npm run build` | 성공. `three-view` 청크 677KB는 3D 버튼을 누를 때만 받는다(첫 화면 제외) |
| 전체 플레이 회귀 (`scripts/browser-regression.cjs`) | 39/39 (같은 커밋 코드, 로컬 개발 서버) |
| 4해상도 레이아웃 (`scripts/layout-check.cjs`) | 44/44 |

## 운영 파일 대조

`node scripts/verify-release.mjs <주소> <결과.json>` — `dist/`의 **모든 파일**을 운영에서 다시 받아 SHA-256을 비교했다.

| 주소 | 결과 |
|---|---|
| https://bb8057cf.magnet-city.pages.dev | **89/89 동일** |
| https://magnet-city.pages.dev | **89/89 동일** |

전체 44.9MB. GLB는 `model/gltf-binary`, WebP·MP3·MP4·WOFF2·VTT 모두 맞는 형식으로 응답했다. 배포 전 운영 `index.html`(SHA-256 `ab527c8d…`)이 새 빌드(`5e3b4069…`)로 바뀐 것을 확인했다.

## 운영 주소 스모크

`node scripts/release-smoke.cjs https://magnet-city.pages.dev test-results/release-20261025b` — 새 브라우저 문맥마다 시험용 저장을 넣어 확인했다. 실제 학생 브라우저 기록에는 접근하지 않았다.

| 해상도 | 시작 화면 | 고리 3D | 자석 잠금 상자 | 유리 너머 운반기 |
|---|---|---|---|---|
| 1280×800 | 통과 | 통과 | 통과 · "착!" 문구 | 통과 · "위 선반 도착" 문구 |
| 1024×768 | 통과 | 통과 | 통과 · "착!" 문구 | 통과 · "위 선반 도착" 문구 |

각 검사에서 콘솔 오류·실패 요청·깨진 이미지 0, 3D 장면이 실제로 그려졌는지 스크린샷 색 분포로 확인했다. 스크린샷과 JSON: `test-results/release-20261025b/`.

## 남은 확인 범위

- 실제 태블릿·전자칠판에서 3D 장면을 손가락으로 돌리는 조작과 프레임 속도는 미검증이다. 스모크는 데스크톱 크롬의 소프트웨어 렌더링으로 돌았다.
- 학교망에서 3D 모델(카드 1장당 3~11MB)을 처음 받는 시간은 재지 않았다. 첫 화면 용량에는 포함되지 않는다.
- GitHub 원격 저장소에는 아직 푸시하지 않았다.

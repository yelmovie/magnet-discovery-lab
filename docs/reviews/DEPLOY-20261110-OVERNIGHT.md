# 자석 고도화 통합·운영 배포 · 2026-11-10

## 완료

- 기존 `codex/magnet-quest-upgrade-20261021` 브랜치 원본/원격 d34af0c를 확인하고, clean 상태에서 격리 브랜치의36fc586 →24d6e30 →fcc16ee를 fast-forward 통합했다.
- GitHub `yelmovie/magnet-discovery-lab`의 동일 브랜치 push와 원격 SHA fcc16ee21b6181fa987b5ff2afb7728f0b99dbd6 일치를 확인했다. Git main 브랜치는 변경하지 않았다.
- 기존 계정 `fcff904907bd035c503a63f971810cc9`, 기존 Pages `magnet-city`, production branch `main`을 API와 기존 인증 HOME으로 확인했다. 새로운 계정/프로젝트/인증을 만들지 않았다.
- 최종 운영 배포: **fbd5b95e-1cfa-4729-9448-d14739f8021c**.
- 운영: https://magnet-city.pages.dev
- 버전: https://fbd5b95e.magnet-city.pages.dev
- 배포 소스: fcc16ee21b6181fa987b5ff2afb7728f0b99dbd6. 본 배포 기록만 추가한 후속 문서 커밋은 실행 번들에 영향을 주지 않는다.

## 패키징 실수와 복구

첫 복사에서 SSD가 AppleDouble `._*` 메타파일200개를 다시 생성했다. 검사 assertion은 실패했지만 셸이 다음 명령을 계속 실행해 **324e4d44**가 메타파일 포함 상태로 게시됐다. 이를 발견한 즉시 상위 검토에 보고했다.

그 뒤 생성한 staging 안의 메타파일만 제거했다. 원본 파일은 삭제하지 않았다. `set -e`로 0개 assert와 배포를 강제 연결하고, 고정 Wrangler4.154.0으로 같은 소스를 다시 게시했다. 최종 배포는186개 정적 파일과 `_headers`이며, 복사본의 메타파일은 배포 전후 모두0개였다. Cloudflare API의 production canonical이 fbd5b95e임을 확인했다. 이전324e4d44는 현재 운영이 아니지만 과거 버전으로 남아 있다.

## 운영 검증

- `npm run build`: TypeScript/Vite 통과. 선택적 Three.js 청크676KB 경고 유지.
- 정리 staging 대비 운영 파일186/186 SHA-256 동일.
- 독립 Chrome 1280×800 및1024×768: 시작, 잠금, 첫 조립, 저장/새로고침 복원, 고리3D, 수첩, 축제, 인증서, 초기화 통과.
- 숨김 경로 `/._index.html`, `/.DS_Store`, `/assets/._audio`, `/assets/._index-B4xeD1SH.js`는 검사 클라이언트에서 HTTP403, `text/plain; charset=UTF-8`, 본문 `error code: 1010` 17바이트를 반환했다. 메타파일 내용은 반환되지 않았다. 이는 해당 클라이언트의 차단 응답이며 모든 클라이언트에서404라는 증거로 해석하지 않는다. 깨끗한 staging/업로드186파일 검증은 별도 확인했다.
- 증거: `test-results/deploy-20261110/hashes.json`, `smoke/smoke.json`, `metadata-probes.json`.

## 남은 조건

기존 검토의 실제 학생/학교기기 평가, Suno 이용조건 근거,915px 지도 보조라벨,200%줌 재배치, iOS출력 검증 조건은 유지한다. 자동관찰은 관찰 보조이며 자동 정답/보상 지급 우회가 아님을 기존5개 회귀로 확인했다. 이번 운영 검증으로 로컬검증만 했던 배포 조건은 해소했지만 전 항목10점이라는 뜻은 아니다.

원본 Git 객체에 기존 `._pack` 인덱스 경고가 있어 Wrangler의 dirty 경고도 출력됐다. 실제 `git status --short`는 clean이었고, 업로드 대상은 소스가 아닌 별도 정리 staging이었다. Git 객체 파일은 삭제하지 않았다.

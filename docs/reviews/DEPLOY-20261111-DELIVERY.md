# 납품 빌드 운영 배포 · 2026-11-11

## 배포 완료

- 운영 주소는 https://magnet-city.pages.dev/ 이다.
- 버전 고정 주소는 https://bd7a753b.magnet-city.pages.dev/ 이다.
- 배포 ID는 `bd7a753b-bdf5-4346-8623-9c5b681976fd`다. Cloudflare Pages의 기존 `magnet-city` 프로젝트에서 production 성공과 canonical 일치를 확인했다.
- 실행 소스 커밋은 `5a04801ce400a8762cea93967baa51a262b04617`이다. 원격 `yelmovie/magnet-discovery-lab`의 `codex/magnet-quest-upgrade-20261021`에 푸시하고 SHA 일치를 확인했다.
- Pages의 기존 production branch 값 `main`으로 배포했다. 작업 브랜치의 위 커밋에서 만든 번들을 직접 업로드했다.
- 최종 문서 커밋은 배포 결과·성적표·인계만 갱신한다. 실행 번들은 위 소스 커밋과 대응한다.

## 인증·업로드

내장 드라이브의 기존 CLI 인증 설정은 읽기 전용으로 확인했다. 외장에 복사한 만료 OAuth의 갱신이 거절되어 기존 연결된 Cloudflare 계정으로 프로젝트와 권한을 확인했다. 해당 프로젝트의 임시 Pages 업로드 토큰으로 설치된 Wrangler 4.155.0의 업로드 명령을 실행하고, 같은 계정의 Pages API에서 배포를 생성했다. 토큰 값은 출력·커밋하지 않았다.

빌드 후 생긴 AppleDouble `dist/._sw.js` 한 개를 빌드 산출물에서 제거하고, 188개 파일의 깨끗한 목록을 확인했다. 정적 파일 187개와 `_headers` 설정이다. 업로드 manifest에는 187개, `._*`/`.DS_Store`는 0개다. 182개 기존 내용은 재사용하고 변경된 5개를 업로드했다. 업로드와 배포는 외장 캐시·로그 및 외장 외 쓰기 차단 환경에서 진행했다.

Git은 기존 `.git/objects/pack/._pack-…idx`의 non-monotonic 경고를 출력했다. 실제 커밋·push 명령은 성공했고 원격 SHA를 별도 확인했다. 기존 Git 객체에는 수정 작업을 수행하지 않았다.

## 운영 검증

| 검사 | 결과 | 근거 |
|---|---|---|
| 정적 파일 SHA-256 | 187/187 일치 | `test-results/deploy-delivery-20261111/hashes.json` |
| 실제 운영 시작·잠금·첫 조립·저장/재접속 | 1280×800, 1024×768 통과 | `test-results/deploy-delivery-20261111/smoke/smoke.json` |
| 고리 3D·수첩·축제·인증서·초기화 | 통과 | 같은 smoke 결과, 합계 8개 |
| 오프라인 재방문 | 통과 | 같은 smoke 결과 |
| 교사 자동재생 차단·재접속·2배 저장 | 1280×800, 1024×768, 915×412 통과 | `test-results/deploy-delivery-20261111/settings/results.json` |
| 새 퍼즐 운영 회귀 | 23개 통과, JS 오류 0건. 자동관찰·드래그·단서·열쇠/발판·광장·재접속을 4크기에서 확인 | `test-results/deploy-delivery-20261111/puzzles/results.json` |
| 응답·헤더 | HTTP 200, HTML MIME, 재검증 캐시 정책, nosniff 확인 | 운영 응답 직접 확인 |

운영 로딩은 캐시 비활성·지연 80ms·대역폭 1.5MB/s에서 2,099ms/1,721ms, 전송량 1,923,374/4,224,149바이트였다. 리소스 전송 시점과 CDN 응답 차이를 포함하며 실제 학교 기기 실측은 별도다.

운영 smoke 8개, 설정 3개, 새 퍼즐 23개를 합해 34개 검증을 통과했다. 모든 브라우저 검증은 격리 컨텍스트의 합성 기록으로 수행했다.

## 복구 기준

직전 운영 배포는 `1ffeda72-e85c-4f62-801f-a286fac62dd9`였음을 배포 전 API로 확인했다. 운영 문제가 발견되면 이 ID를 기준으로 Cloudflare Pages rollback을 검토할 수 있다. 이전 운영 소스 메타데이터는 `32b7b2ac8d4fd7abca9936e5c99046b26830eeac`, dirty=true였다. 저장 버전은 2를 유지하며 이번 코드가 기존 진행 중 저장을 읽는 회귀 검사를 통과했다.

## 남은 조건

최종 성적은 88/100이다. 실제 학생·학교 실기기·iOS 출력·기존 음원 권리 증빙·교사 내용 검수 조건은 `RELEASE-REVIEW-20261111-DELIVERY.md`를 따른다. 소스·빌드·검사·임시파일·배포 로그는 외장 SSD에 뒀다. Codex 및 일반 Chrome 앱 자체의 저장 경로 전환은 이번 작업의 검증 대상과 별도다.

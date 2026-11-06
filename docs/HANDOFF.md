# 밀고 당기는 도시 인계 · 2026-11-06 (배포 후)

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

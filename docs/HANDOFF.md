# 밀고 당기는 도시 인계 · 2026-10-25 (2차 배포 후)

위치: D:\iscreammedia_sc34\5magnet
저장소: yelmovie/magnet-discovery-lab (이번 커밋들은 아직 푸시 안 함)
상태: 납품 마감 디자인 + 3D 보기 수동 운영 배포 완료. 자동 배포 추가 없음.
유지: 5구역·실험10개·현장 의뢰10개·탐구 과정·에셋·음악·복구/축제·학생 원본.
소스: d44669a5acad56380f0b10feb8b63c780349ef6f
운영: https://magnet-city.pages.dev/
배포: bb8057cf-e1c1-4b06-9a8e-ca20bf0c6f36 (2026-10-25 22:48 KST 무렵). 이전 배포 b4c36b1e-… 로 되돌릴 수 있음.
검증: 테스트107개·브라우저39묶음·레이아웃 4해상도44화면·빌드 통과. dist 89개 전부 운영/로컬 SHA-256 동일. 운영 스모크 2해상도×(시작+3D 3종) 통과.
남음: 실제 태블릿 터치·3D 조작 프레임, 학교망 3D 모델 로딩 시간 미검증.
3D: 원본 Meshy GLB는 assets/source/3d-base-20261025/meshy/ (저장소 제외). 다시 압축은 node scripts/pack-glb.mjs, 정점 합치기(weld) 금지 — 텍스처가 찢어진다.
배포 절차: npx vitest run → node scripts/pack-glb.mjs check → npm run build → wrangler pages deploy dist --project-name magnet-city --branch main → node scripts/verify-release.mjs https://magnet-city.pages.dev.
자료: docs/reviews/MAGNET-RELEASE-20261025-2.md, FINAL-CHECK-20261025-2.md, public/assets/3d/README.md, test-results/release-20261025b/.
주의: 실제 학생 저장소를 지우며 시험하지 말 것. TEMP/TMP=D:\DevTemp. graphify-out/은 생성 자료로 커밋 제외.

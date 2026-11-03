# 밀고 당기는 도시 인계 · 2026-11-04 (배포 후)

위치: 맥 /Volumes/T7 Shield/iscreammedia_sc34/5magnet · 윈도우 D:\iscreammedia_sc34\5magnet
저장소: yelmovie/magnet-discovery-lab, 브랜치 codex/magnet-quest-upgrade-20261021 푸시 완료 (main 미병합)
상태: 우편함 조립·주민 음성·탐험 수첩 수동 운영 배포 완료. 자동 배포 추가 없음.
유지: 5구역·실험10개·현장 의뢰10개·탐구 과정·에셋·음악·복구/축제·학생 원본.
소스: c317fc54eb06d0cb6f470ec42757bf2e97be9953
운영: https://magnet-city.pages.dev/
배포: 2495e2f2-afa1-4ee4-b3d2-f4dd96bfd8c7 (2026-11-04). 이전 배포 701affb0-… 로 되돌릴 수 있음.
검증: 테스트217개·브라우저 회귀20개·빌드 통과. dist 153개 전부 운영/로컬 SHA-256 동일. 운영 스모크 2해상도×(시작+고리3D+수첩) 통과.
남음: 발명품 3D 시연(상자·운반기) 진입 버튼 없음, 의도 여부 미확인. 실제 태블릿 터치·3D 조작 프레임, 학교망 3D 모델 로딩 시간 미검증.
3D: 원본 Meshy GLB는 assets/source/3d-base-20261025/meshy/ (저장소 제외). 다시 압축은 node scripts/pack-glb.mjs, 정점 합치기(weld) 금지 — 텍스처가 찢어진다.
배포 절차: npx vitest run → node scripts/pack-glb.mjs check → npm run build → wrangler pages deploy dist --project-name magnet-city --branch main → node scripts/verify-release.mjs https://magnet-city.pages.dev.
자료: docs/reviews/MAGNET-RELEASE-20261104.md, public/assets/3d/README.md, test-results/release-20261104/.
주의: 실제 학생 저장소를 지우며 시험하지 말 것. TEMP/TMP=D:\DevTemp. graphify-out/은 생성 자료로 커밋 제외.

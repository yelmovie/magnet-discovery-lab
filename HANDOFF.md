# 다음 작업 인계

- 목표: 「밀고 당기는 도시」 초4 자석 탐구 앱의 태블릿 개편 마무리.
- 확정: 도시만 2.5D. 5구역·10활동, 질문 하나·큰 조작면·자동 그림 기록·서랍. 기본 학습과 선택 도전 분리.
- 완료: 10월16일 설계를 실제 앱에 반영. v1 백업→v2 이전, 두 발명, 최종 한 구간/전체 선택 복구. 정상 경로 인증서 완주. 자동 검사37개·타입·빌드 통과. 3개 가로 크기×10활동, 세로·키보드·선택 배치 확인.
- 다음: 실제 태블릿·전자칠판·학생·교실망·인쇄 검증. 자세한 상태는 docs/TABLET-IMPLEMENTATION-20261018.md.
- 파일: main.ts 셸/흐름, tablet-activities.ts 활동, distance.ts·delivery.ts 조작, final-mission.ts 최종, trial-records.ts 기록, domain.ts·storage.ts 저장, tablet.css 화면.
- 자료: docs/TABLET-EXPERIENCE-DESIGN-20261016.md 및 독립 시안. 원본 아트·제공 자료 보존, 작은 실행 캐릭터만 파생 생성.
- 주의: localhost와127.0.0.1 저장 분리. 검증 주소는 복구100%. 관리자·재탐구는 원본 보존. Phaser 청크 경고 유지. npm run dev -- --port 5173.

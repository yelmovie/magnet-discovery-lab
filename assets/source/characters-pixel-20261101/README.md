# 자석 캐릭터 픽셀아트 · 2026-11-01

사용자가 승인한 `approved-pair.png`를 기준으로 OpenAI 내장 `image_gen.imagegen`으로 생성했다. 정확한 생성 프롬프트와 참조 파일은 `prompts.json`에 있다. 기존 캐릭터 원본은 보존했다.

| 원본 PNG | 런타임(public/assets/adventure) | 격자 |
| --- | --- | --- |
| mili-poses.png | mili-poses-pixel.webp | 4×1, 프레임 192×256 |
| dangi-poses.png | dangi-poses-pixel.webp | 4×1, 프레임 192×256 |
| mili-walk.png | mili-walk-pixel.webp | 4×4, 프레임 128×128 |
| dangi-walk.png | dangi-walk-pixel.webp | 4×4, 프레임 128×128 |

- 표정 열: 안내 / 관찰·궁금 / 설명·생각 / 축하.
- 걷기 행: 아래(정면) / 왼쪽 / 오른쪽 / 위(뒷모습).
- 걷기 열: 왼발 접지 / 발 모으기 / 오른발 접지 / 발 모으기. 정지할 때 두 번째 열을 사용한다.
- 당이 뒷모습은 파랑이 화면 왼쪽, 빨강이 오른쪽이다. 뒤에는 얼굴과 클립보드를 그리지 않았다.
- `node scripts/prepare-pixel-mascots.mjs`로 투명 영역을 보존하며 프레임 분리·발 기준선 정렬·nearest 리사이즈·lossless WebP 패킹을 재현한다. 두 캐릭터와 각 프레임은 같은 축척을 공유한다.
- 공통 `mascot()`이 시작·도움말·시설 입구·보상·복구 완료·인증서의 표정을 제공한다. 지도는 별도 걷기 시트와 이동 거리 기반 프레임, 각 캐릭터의 실제 이동 방향을 사용한다.
- 검증: `tests/quest.test.ts`, `scripts/pixel-mascot-regression.cjs`. 브라우저 검증은 실제 학생 저장소와 분리된 새 컨텍스트에서 실행한다. 캡처와 결과는 `test-results/pixel-mascots-20261101/`에 저장한다.

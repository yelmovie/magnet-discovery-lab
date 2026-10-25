# 자료·도구·소리 출처

## 도구·라이선스 검토 (2026-10-21)

| 도구·자료 | 쓰는 곳 | 확인한 라이선스·조건 | 판정·기록 |
|---|---|---|---|
| Phaser 3.90.0 | 보존한 이전 도시 구현의 의존성 (새 화면은 브라우저 Canvas·DOM 사용) | MIT · 설치 패키지 package.json/LICENSE | PASS · 기존 의존성 |
| Vite 7.3.6 | 개발 서버·정적 빌드 | MIT · 설치 패키지 package.json/LICENSE | PASS · 개발 도구 |
| TypeScript 5.9.3 | 타입 검사 | Apache-2.0 · 설치 패키지 package.json/LICENSE | PASS · 개발 도구 |
| Vitest 3.2.7 | 자동 검사 | MIT · 설치 패키지 package.json/LICENSE | PASS · 개발 도구 |
| Web Audio API | 효과음 재생·합성 대체음 | 브라우저 기본 API · CC0 효과음 출처는 아래 표에 기록 | PASS · 사용자 제공 배경음·CC0 효과음 |

본 앱과 하위 작업 폴더의 package.json(의존성 폴더 제외)을 확인했으며, 현재 프로젝트에는 Remotion·유료 UI 키트·음악 생성 서비스 의존성을 추가하지 않았다. 이미지·폰트의 개별 출처와 이용 조건은 아래 해당 항목에서 관리한다.

## 배경음과 효과음 재생

- 구현 파일: `src/game-audio.ts`.
- 2026-10-25 사용자가 Suno로 제작해 제공한 연주곡 2종을 연결했다. 메인 테마는 시작·게임 중 반복하고, 파이널 테마는 엔딩·인증서에서 한 번 이어서 재생한다.
- 메인 원본: `assets/source/audio/suno/main-theme-original.mp3` (제공 파일명: `Main_Curious Discovery.mp3`).
- 파이널 원본: `assets/source/audio/suno/finale-theme-original.mp3` (제공 파일명: `Final_Victory in the Town Square.mp3`).
- 배포 음원: `public/audio/music/main-theme.mp3`, `finale-theme.mp3`. 바이트 변경 없이 보관했으며 `tracks.json`에 SHA-256·크기·길이를 기록했다.
- 음악의 출처는 사용자 제공 Suno 생성물이다. 2026-10-25 사용자가 두 곡 모두 Suno **유료 요금제(사용자 표현: premium)** 구독 중에 생성했다고 확인했다. 유료 구독 중 생성한 곡은 상업적 이용 대상으로 본다. 요금제 결제 내역은 저장소에 보관하지 않으며, 필요하면 사용자 Suno 계정에서 확인한다. CC0 효과음 라이선스와 구분한다.
- 배경음·효과음은 각각 켜고 끌 수 있다. 영상 재생과 백그라운드 전환 시 멈추고, 복귀 시 같은 위치에서 이어진다.
- 클릭·집기·놓기·비교·성공·보상·가벼운 충돌·걷기 효과음 8종만 로컬 MP3로 재생한다. 출처와 CC0 라이선스는 아래 기록을 따른다.
- 효과음 파일을 불러오지 못하면 Web Audio API로 짧은 대체 효과음을 합성한다. 특정 곡을 복제하지 않았다.
- 효과음은 한 번에 하나만 재생하며 켜기·끄기를 제공한다. 문서가 숨겨지거나 영상 등에서 일시 중지를 요청하면 멈춘다.

## 교육 내용 확인 자료

- 교육부 고시 제2022-33호 별책 9 과학과 교육과정. 자석의 이용 `[4과09-01]`, `[4과09-02]`, `[4과09-03]`.
- 공식 공개 원문: 충청북도교육청, <https://www.cbe.go.kr/upload/dept-19/na/bbs_1437/2025/12/7FE4CF24-7583-F11C-85FC-22DF81DACFB2.pdf>.
- 앱의 교사용 가이드에는 성취기준 코드와 원문을 그대로 수록한다. 게임만으로 성취기준 전체를 달성했다고 판단하지 않으며 수업·토론·후속 평가와 함께 활용한다.

## 권리 안내

ⓒ 2026 옐샘 & 아이스크림미디어. All rights reserved.

앱 화면 캡처·자체 제작 일러스트·자체 제작 음원은 무단 복제·재배포·전용·상업적 이용을 금지한다.

외부 공개 사진·효과음·폰트의 저작권은 각 원저작자와 소장 기관에 있으며, 각 자료의 공개 라이선스와 이용 조건을 따른다.

## 프로젝트 생성 그림 (2026-10-21)

- 자석도시 지도 1장·활동실 5종·조작 소품 6종: 사용자 요청에 따라 OpenAI imagegen으로 생성. `public/assets/quest/`에 실제 적용. 원본·프롬프트·해시와 알파 검증은 `assets/source/quest/`와 `docs/ART-PROMPTS-20261021.md`에 보관.
- 기존 밀이·당이 캐릭터와 로고는 이전 프로젝트 에셋을 재사용. 신규 배경에 캐릭터를 구워 넣지 않고 실제 조작 장면에서 별도로 표시.

## 개념 영상·보조 캐릭터·효과음 (2026-10-22)

- **개념 영상 5편**: 프로젝트에서 직접 설계·렌더링한 모션 그래픽. `scripts/render-concepts.py`의 Pillow 프레임을 FFmpeg / libx264로 인코딩. 각 12초, 1280×720, 24fps, H.264/AAC, faststart. `public/video/concepts/`에 MP4·WebP 포스터·한국어 VTT·해시 manifest를 제공한다. 영상의 짧은 음은 스크립트에서 직접 합성한다. Windows 맑은 고딕으로 텍스트를 래스터화했으며 폰트 파일은 배포하지 않는다.
- **수리 도우미 자꾸**: `src/coach.ts`에 직접 제작한 SVG 자석 수리 로봇. 기존 밀이·당이와 별개로 실험별 행동·단서를 안내한다. 외부 그림·동물 캐릭터·추종 동작은 사용하지 않는다.
- **효과음**: Kenney, *Interface Sounds 1.0*, CC0 1.0 Universal. 공식 출처: https://kenney.nl/assets/interface-sounds. 원본 ZIP·라이선스: `assets/source/audio/`. 배포본과 라이선스: `public/audio/`. MP3 모노 44.1kHz/96kbps로 변환하고 최대 0.8초·끝 페이드를 적용했다. CC0 음원에는 프로젝트 자체 제작물의 이용 제한을 적용하지 않는다.

| 배포 파일 | Kenney 원본 | 사용 |
|---|---|---|
| click.mp3 | click_003.ogg | 선택·버튼 |
| pick.mp3 | pluck_001.ogg | 물체 잡기 |
| drop.mp3 | drop_002.ogg | 물체 놓기 |
| compare.mp3 | question_002.ogg | 비교 |
| success.mp3 | confirmation_002.ogg | 실험 성공 |
| reward.mp3 | confirmation_004.ogg | 도구 획득 |
| bump.mp3 | error_003.ogg | 다시 관찰할 단서 |
| step.mp3 | tick_001.ogg | 짧은 이동음 |

## 폰트

- Jua (Woowahan Brothers)와 Pretendard (Kil Hyung-jin)의 OFL 1.1 원문을 `public/fonts/`에 동봉. 기존 사용 가능 원본에서 필요한 글리프만 번들.
- 수정한 폰트의 내부 이름은 RFN 준수를 위해 Magnet Quest Display / Magnet Quest Sans로 변경. CSS 별칭은 Magnet Quest Display / Magnet Quest Sans. 자세한 수정·검증은 `docs/reviews/DESIGN-SYSTEM-20261021.md` 참조.

- 시작 화면 로고는 제공된 `public/assets/logo.png`에서 만든 무손실 WebP 배포본이다. 글자·그림은 수정하지 않았고, 알파 및 크림 배경 합성 픽셀 동일성을 확인했다. 재생성: `scripts/prepare-runtime-art.py`.

## 2026-10-24 고도화 생성 이미지
- 재료 6종 아틀라스와 막대자석: 프로젝트 요청에 따라 image_gen으로 신규 생성. 원본은 assets/source/production/, 배포용 무손실 WebP는 public/assets/quest/.
- 생성 프롬프트, 프레임 규격, 실제 투명도 검사와 권리 범위: docs/ART-PRODUCTION-20261024.md. 제3자 캐릭터·상표·기성 이미지 복제는 요청하지 않았다.
- 기존 자석 성취기준 세 문구는 위 충청북도교육청 공개 PDF 99쪽과 2026-10-24 재대조했다.

### 같은 날 추가 제작한 소품·장면·도우미

- `science-equipment.webp` (원형 자석 2종·철판·청소 패드·철 열쇠·나무 받침), `magnetic-gate.webp` (자석 문 장치), `mission-vignettes.webp` (활동 장면 6종), `coach-companion.webp` (수리 도우미 자꾸의 새 생성 일러스트): 사용자 요청에 따라 내장 OpenAI `image_gen`으로 신규 생성했다. 위 2026-10-22 항목의 SVG 도우미 설명은 당시 구현 기록이며, 2026-10-24 고도화 화면에는 이 새 이미지가 적용된다.
- 원본은 `assets/source/production/`, 게임용 RGBA 무손실 WebP와 장비 프레임 JSON은 `public/assets/quest/`. 생성 프롬프트·실제 크기·알파 검사·과학 표현 검수는 `docs/ART-PRODUCTION-20261024.md`, 파일 해시와 프레임 실측은 `assets/source/production/production-20261024-frame-diagnostics.json`에 보관한다.
- 별도 스톡·오픈소스 라이선스를 부여받은 자료로 표시하지 않는다. 사용 권리는 생성 당시 서비스 약관에 따르며, 별도의 법률 검토나 상표·유사성 권리 조사를 수행했다는 뜻은 아니다. `mission-vignettes`의 위쪽 세 번째 원형 자석 장면은 과학 표현 검수에서 제외하여, 올바른 장비 아틀라스를 조합한 장면으로 대체하도록 했다.

## 납품 마감 그림 7종 (2026-10-25)

CSS 사각형·캔버스 단색 도형으로 그리던 소품과 틀을 같은 황동·나무 화풍의 생성 그림으로 바꿨다.

- 생성: Higgsfield 커넥터 `gpt_image_2_5`(quality high, 투명 소품 1k·틀 2k), 사용자 Higgsfield 크레딧 사용. 글자 없는 그림만 요청했다.
- 원본: `assets/source/polish-20261025/*.png` (생성 원본), `*-clean.png` (알파 40 미만 후광 제거·여백 자르기 결과). 배포본 크기·SHA-256은 같은 폴더 `manifest.json`.
- 배포본: `public/assets/quest/` 아래 WebP.

| 배포 파일 | 대체한 것 | 쓰는 곳 |
|---|---|---|
| `prop-paper.webp` | 크림색 사각형 종이 | 거리 실험 종이판, 현장 의뢰 종이, 기록 그림 |
| `prop-rail.webp` | 두 줄 선 레일·이중선 바닥 | 택배 배달 실험, 현장 의뢰 경로 |
| `prop-glass.webp` | 하늘색 직사각형 유리판 | 발명 공방 원격 설계·사용 시험 |
| `prop-letter.webp` | 선으로 그린 봉투 | 발명품 사용 시험(편지) |
| `gauge-frame.webp` | 평면 진행 막대 | 거리 게이지 |
| `certificate-frame.webp` | CSS 이중 테두리 | 연구원 인증서 |
| `notebook-page.webp` | 단색 배경 | 실험 기록 그림 배경 |

## 3D 모델 7종 (2026-10-25)

- 생성: Meshy Image to 3D (사용자 계정에서 직접 생성). 입력 그림은 Higgsfield `gpt_image_2_5`로 만든 `assets/source/3d-base-20261025/` 기준 이미지.
- 원본: `assets/source/3d-base-20261025/meshy/` (저장소 제외, 해시는 `originals.json`). 배포본: `public/assets/3d/`, 원본↔배포 대조표는 같은 폴더 `README.md`.
- 가공: `scripts/pack-glb.mjs` (gltf-transform MIT · meshoptimizer MIT · sharp Apache-2.0). three.js MIT로 화면에 표시.
- 쓰는 곳: 극성 복원 센터 고리 3D 보기, 광장 복구 발명품 작동 시연(자석 잠금 상자·유리 너머 운반기).

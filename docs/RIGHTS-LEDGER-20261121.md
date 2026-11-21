# 권리 장부 · 05 밀고 당기는 도시 (2026-11-21)

운영 빌드에 실려 나가는 그림·영상·음악·효과음·목소리·글꼴이 어디서 왔고 어떤 조건으로 쓰는지 한곳에 모은 장부다. 공통 지침 `_shared/SCORE-110-STAGE31-20261121.md` 2절 ④에 따라 썼다.

## 범위와 읽는 법

- **기준**: 저장소 HEAD `ae96073`(2026-11-21 07:26), 같은 시각의 `dist/`. `dist/`는 `public/` 전체에 빌드된 JS·CSS·`index.html`만 더한 것이라(파일 목록 대조) **`public/`에 있는 미디어가 곧 운영에 나가는 미디어**다. `src/`에서 `import`하는 그림·소리·글꼴 파일은 없다.
- **세는 단위**: 파일이 많은 곳은 폴더·묶음 한 줄. 개수는 미디어 파일 수이고, 같은 묶음의 `manifest.json`·`sources.json`·라이선스 원문은 근거 칸에 적었다.
- **상태 판정 기준** (추측으로 채우지 않았다)
  - **확인됨**: 만든 도구(또는 원본 주소)·날짜·과정 기록이 있고, 이용 조건(라이선스 원문, 또는 요금제·약관 기록)도 기록에 있다.
  - **근거 약함**: 만든 방법이 일부만 적혀 있다. 도구 이름·프롬프트·요금제 중 핵심이 빠졌거나, 기록이 지금 파일과 어긋난다.
  - **확인됨(사용자 확인)**: 이 맥에 생성 로그가 없고(Codex 이미지 기록은 2026-11-05부터) 저장소에도 다른 출처를 가리키는 기록이 없어, 사용자 확인(2026-11-21 「16곳 그림은 전부 Codex(GPT), 영상은 제미나이, 모두 유료 요금제」 → 「전부 맞아」)으로 채웠다. 근거 문서 `_shared/CODEX-IMAGE-RECORDS-20261121.md`.
  - **출처 미확인**: 이 파일(묶음)의 출처 기록을 저장소·`_shared`·`_scratch`에서 찾지 못했다. git 커밋 메시지에도 도구 언급이 없다.
- **2026-11-21 생성 기록 대조**: 출처 미확인 7줄과 그림·영상의 근거 약함 줄을 `_shared/CODEX-IMAGE-RECORDS-20261121.md` 방법(Codex 세션 기록, Claude Code 대화 기록, 외장 프롬프트 파일)으로 다시 대조했다. 기록 시각은 UTC다. 저장소 증거가 Codex가 아닌 출처를 가리키는 줄(G4·G5·G15·G27·V1)은 사용자 확인으로 덮어쓰지 않고 상태를 그대로 두었다.
- "미사용"은 `src/`·`index.html`에서 경로를 부르지 않는데도 `public/`에 있어 함께 배포되는 파일이다.

## 1. 그림 (135개: WebP 132, PNG 1, JPG 1, SVG 1)

| # | 파일(묶음) | 만든 곳 | 만든 날·기록 위치 | 이용 조건 | 근거 파일 경로 | 상태 |
|---|---|---|---|---|---|---|
| G1 | 도시 지도·활동실 배경 6장: `public/assets/quest/city-expedition.webp`, `stage-{life,material,poles,remote,workshop}.webp` | OpenAI 내장 `image_gen.imagegen` (텍스트 프롬프트만, 외부 이미지 없음) | 2026-10-21. 프롬프트 전문·크기·검수: `docs/ART-PROMPTS-20261021.md`. 원본 PNG: `assets/source/quest/` | 프로젝트용 생성물. 생성 당시 서비스 약관을 따름(CREDITS 문구) | `assets/CREDITS.md` 「프로젝트 생성 그림」, `assets/source/quest/asset-manifest.json` | 확인됨 |
| G2 | 생활 소품 6장: `quest/prop-{postal-box,postal-lid,book,cart,aquarium,parcel}.webp` | 같은 도구로 만든 3×2 소품 아틀라스를 잘라 냄 | 2026-10-21. `docs/ART-PROMPTS-20261021.md` 「소품 atlas」·「props-sheet」 프롬프트. 원본 `assets/source/quest/props-sheet*.png` | G1과 같음 | `assets/source/quest/asset-manifest.json` | 확인됨 |
| G3 | 고도화 그림 6장: `quest/material-kit.webp`, `magnet-bar.webp`, `science-equipment.webp`(+프레임 JSON), `magnetic-gate.webp`, `mission-vignettes.webp`, `coach-companion.webp` | OpenAI 내장 `image_gen` | 2026-10-24. 프롬프트·투명도 검사·과학 표현 검수: `docs/ART-PRODUCTION-20261024.md`. 해시·프레임 실측: `assets/source/production/production-20261024-frame-diagnostics.json` | 생성 당시 서비스 약관. "스톡·오픈소스 라이선스 자료로 표시하지 않는다"는 단서가 CREDITS에 있음 | `assets/CREDITS.md` 「2026-10-24 고도화 생성 이미지」 | 확인됨 |
| G4 | 납품 마감 소품·틀 7장: `quest/prop-{paper,rail,glass,letter}.webp`, `gauge-frame.webp`, `certificate-frame.webp`, `notebook-page.webp` | Higgsfield 커넥터 `gpt_image_2_5`(quality high), 사용자 Higgsfield 크레딧. ※ 2026-11-21 대조: 저장소 기록은 Higgsfield라 사용자 확인(그림은 전부 Codex)과 어긋난다. 확인으로 덮어쓰지 않았다 | 2026-10-25. 원본·정리본·SHA-256: `assets/source/polish-20261025/manifest.json` | **요금제·이용 조건 기록 없음** (`_shared/voice-provenance-20261118.md`도 Higgsfield를 같은 빈칸으로 지적) | `assets/CREDITS.md` 「납품 마감 그림 7종」 | 근거 약함 |
| G5 | 학습 장치 그림 10장: `public/assets/learning/*.webp` | Higgsfield `gpt_image_2_5`. ※ 2026-11-21 대조: 저장소 기록은 Higgsfield라 사용자 확인(그림은 전부 Codex)과 어긋난다. 확인으로 덮어쓰지 않았다 | 2026-10-29. 프롬프트 전문: `docs/LEARNING-VISUAL-PROMPTS-20261029.json`. 파일별 생성기·날짜: `public/assets/learning/manifest.json`. 원본 `assets/source/learning-20261029/` | G4와 같음. 요금제·이용 조건 기록 없음 | 커밋 `e58490e` 본문 | 근거 약함 |
| G6 | 밀이·당이 픽셀 캐릭터 4장: `public/assets/adventure/{mili,dangi}-{poses,walk}-pixel.webp` | OpenAI 내장 `image_gen.imagegen`. 사용자 승인 기준 그림 `approved-pair.png` 참조 | 2026-11-01. 프롬프트·참조 파일: `assets/source/characters-pixel-20261101/prompts.json`, 가공: `scripts/prepare-pixel-mascots.mjs` | 생성 당시 서비스 약관. 캐릭터 원형은 사용자 제공 시트(`docs/IMPLEMENTATION.md` 「제공 자료 사용」) | `assets/source/characters-pixel-20261101/README.md` | 확인됨 |
| G7 | 사용자 제공 ChatGPT 그림 5장: `adventure/room.webp`, `adventure/material-room.webp`, `adventure/workshop-room.webp`, `public/assets/material-lab.webp`, `quest/logo.webp` | ChatGPT 이미지 생성(GPT 이미지). 파일 이름이 `ChatGPT Image 2026년 9월 23일 …png`인 그림이라 사용자 확인(그림은 전부 GPT)과 맞다. `assets/source/adventure/{room,material-room,workshop-room}.png`는 `_unused/image-duplicates-20261025/`의 해당 ChatGPT 파일과 SHA-256이 같다. 로고·material-lab은 `docs/IMPLEMENTATION.md`에 원본 파일 이름 기록 | 2026-09-23 생성(파일 이름 기준), 2026-10-15~10-21 적용. 2026-11-05 이전이라 이 맥에 생성 로그 없음. `docs/ADVENTURE-UPDATE-20261015.md`는 "제공된 실험실·재료실·공방 이미지 3종"이라고만 적음 | ChatGPT 유료 요금제(사용자 확인) | `docs/IMPLEMENTATION.md` 60~64행, `assets/CREDITS.md` 「폰트」 아래 로고 문단, `scripts/prepare-runtime-art.py`, 사용자 확인 2026-11-21, `_shared/CODEX-IMAGE-RECORDS-20261121.md` | 확인됨(사용자 확인) |
| G8 | 부품 시트 1장: `adventure/device-parts-v2.webp` | Codex(GPT 이미지) — 사용자 확인. 저장소에는 "새 생성 이미지 4종" 중 "보관함·책·덮개 부품 시트"로만 기록돼 있고 다른 출처를 가리키는 기록은 없다 | 2026-10-15 기록 `docs/ADVENTURE-UPDATE-20261015.md` 29행, 원본 `assets/source/adventure/device-parts-v2.png`, 커밋 `05de2ca`(2026-10-18). 2026-11-05 이전이라 이 맥에 생성 로그 없음 | ChatGPT 유료 요금제(사용자 확인) | `docs/ADVENTURE-UPDATE-20261015.md`, 사용자 확인 2026-11-21, `_shared/CODEX-IMAGE-RECORDS-20261121.md` | 확인됨(사용자 확인) |
| G9 | 지도 공격·피격 스프라이트 8장: `adventure/map-{hero,ally}-reaction{,-v2}.webp`, `adventure/map-villain-{left,right}{,-v2}.webp` | Codex 내장 이미지 도구(GPT 이미지). v1(커밋 `1da2a63`)은 기존 그림을 재구성한 프레임: 밀이·당이는 G6 `mili-walk-pixel`·`dangi-walk-pixel`에서, 악당은 Codex로 만든 악당 컷 시트 `cutouts-01-05.png`에서 잘라 냄. v2(커밋 `b316312`)는 Codex로 새로 그린 시트 | 2026-11-14. v1: Codex 세션 `rollout-2026-11-14T00-29-37-01a1d587…` 11-13 15:55 UTC 「Precise image edit for a static game map mockup」 → `_scratch/villain-concepts-20261114/map-mockup-work/cutouts-01-05.png`, 자르기 스크립트는 세션 `rollout-2026-11-14T01-24-18-01a1d5b9…` 16:28 UTC(상자 `[732,485,804,539]`). v2: 세션 `rollout-2026-11-14T06-05-13-01a1d6ba…` 11-13 21:09 UTC 「SINGLE PRODUCTION SPRITE ATLAS」 → `raw-5.png` 복사 뒤 `pack.cjs 5`. v2 프롬프트 `_scratch/redraw-02-05-20261114/prompts.json`(키 `5`), 배포 확인 `DELIVERY.md` | ChatGPT 유료 요금제(사용자 확인) | 위 세션 기록, `_shared/MAP-VILLAINS-HANDOFF-20261114.md` 116행, `_scratch/map-redraw-20261114/README.md` | 확인됨 |
| G10 | 밀이 전투 시트 2장(+JSON): `quest/mili-combat-sheet.png`, `.webp` — **미사용** | Codex(GPT 이미지) — 사용자 확인. 커밋 `247e000`은 "원본 폴더에 커밋되지 않고 남아 있던 작업 보존"이라 만든 기록이 없고, 이 맥의 Codex 기록(11-05~11-10)과 Claude Code 기록에서도 이 시트를 만든 줄을 찾지 못했다. 다른 출처를 가리키는 기록도 없다 | 2026-11-10 커밋(11-10 08:53 UTC에 이미 미커밋 파일로 있었음). 커밋 당시 "배포본에는 들어가 있지 않다"고 적었으나 지금은 `public/`에 있어 배포됨 | ChatGPT 유료 요금제(사용자 확인) | 커밋 `247e000` 본문, 사용자 확인 2026-11-21, `_shared/CODEX-IMAGE-RECORDS-20261121.md` | 확인됨(사용자 확인) |
| G11 | 우편함·수조·극성 장치 그림 5장: `quest/aquarium-cleaner-parts.webp`, `aquarium-window.webp`, `mailbox-hardware.webp`, `material-tray.webp`, `polarity-parts.webp` | Codex(GPT 이미지) — 사용자 확인. 다른 출처를 가리키는 기록 없음 | 2026-11-04 커밋 `c317fc5`(우편함 조립·수조 얼룩 활동 추가). 2026-11-05 이전이라 이 맥에 생성 로그 없음(11-03·04 Codex 기록, 05 Claude Code 기록에도 없음). 원본 PNG·프롬프트 없음 | ChatGPT 유료 요금제(사용자 확인) | 사용자 확인 2026-11-21, `_shared/CODEX-IMAGE-RECORDS-20261121.md` | 확인됨(사용자 확인) |
| G12 | 우편함 재질·손잡이 2장: `quest/mailbox-wood.webp`, `mailbox-pull-handle.webp` | Codex(GPT 이미지) — 사용자 확인. CREDITS에는 "이 프로젝트용으로 생성한 그림"이라고만 있고 다른 출처를 가리키는 기록 없음 | 2026-11-04 커밋 `c317fc5`. 2026-11-05 이전이라 이 맥에 생성 로그 없음. 프롬프트·원본 없음 | ChatGPT 유료 요금제(사용자 확인) | `assets/CREDITS.md` 「우편함 재질과 손잡이」, 사용자 확인 2026-11-21, `_shared/CODEX-IMAGE-RECORDS-20261121.md` | 확인됨(사용자 확인) |
| G13 | 낱장 종이 1장: `quest/prop-paper-sheet.webp` | 내장 imagegen | 2026-11-04 커밋 `c317fc5`. 프롬프트 전문이 CREDITS에 있음 | 생성 당시 서비스 약관 | `assets/CREDITS.md` 「힘 실험 연구소의 종이」 | 확인됨 |
| G14 | 지도 주민 5명: `quest/resident-{1..5}.webp` | 내장 imagegen으로 한 장에 생성 후 투명 영역을 따라 나눔 | 2026-11-02 원본 `assets/source/quest/restored-residents-20261102.png`, 2026-11-04 적용(`c317fc5`). 프롬프트 기록은 없음 | 생성 당시 서비스 약관 | `assets/CREDITS.md` 「지도에 돌아오는 주민」 | 확인됨 |
| G15 | 주민 대화 초상 5장: `quest/resident-{1..5}-dialogue.webp` | ElevenLabs 이미지 생성(`creative_generate_image`, 모델 `bytedance-seedream-5.5`). Codex 세션 안에서 ElevenLabs 커넥터로 만들었다. **기록이 사용자 확인(그림은 전부 Codex)과 어긋나 확인으로 덮어쓰지 않았다** | 2026-11-12. Codex 세션 `rollout-2026-11-12T19-41-42-01a1cf59…` 11:45 UTC 우체부 시트(「Game dialogue sprite sheet, wide landscape 2:1」), 12:04 UTC 연구원·시계탑지기·수조관리인·발명가 시트 4장, elevenlabsusercontent.com에서 `_scratch/npc-dialogue-plan-20261112/*-sheet.png`로 내려받음, 12:08 UTC sharp로 2프레임씩 잘라 `resident-{1..5}-dialogue.webp` 저장(그때 파일 크기가 지금 파일과 같음). 커밋 `68a2e53`(11-13) | ElevenLabs 유료 요금제 시기(11-12는 Starter, `_shared/voice-provenance-20261118.md` 요금제 표). 이 모델로 만든 그림의 이용 조건 기록은 없음 | 위 세션 기록, `_scratch/npc-dialogue-plan-20261112/HANDOFF-5-16.md` | 근거 약함 |
| G16 | 실험 손 2장: `quest/experiment-hand-{held,released}.webp` | 내장 imagegen | 2026-11-03 원본·프롬프트: `assets/source/quest/experiment-hands.json`, 가공 `scripts/prepare-hand-images.cjs` | 생성 당시 서비스 약관 | `assets/CREDITS.md` 「실험에서 잡고 놓는 손」 | 확인됨 |
| G17 | 철 너트 1장: `quest/material-iron-nut.webp` | Codex 기본 이미지 생성 도구 | 2026-11-05 생성, 11-06 적용(`c3ec848`). 프롬프트 요지가 CREDITS에 있음 | 생성 당시 서비스 약관 | `assets/CREDITS.md` 「힘 실험 연구소 · 철 너트」 | 확인됨 |
| G18 | 공방 주민·물건 예시 10장: `quest/workshop-resident-{eraser,pins,bag,door,cup}.webp`, `quest/workshop-example-{…}.webp` | Codex 기본 이미지 생성 도구, 한 장씩 | 2026-11-05 생성, 11-06 적용(`c3ec848`). 공통 프롬프트 요지가 CREDITS에 있음 | 생성 당시 서비스 약관 | `assets/CREDITS.md` 「시민 발명 공방」 두 절 | 확인됨 |
| G19 | 공방 대화 초상 5장: `quest/workshop-dialogue-{eraser,pins,bag,door,cup}.webp` | Codex 내장 이미지 도구(GPT 이미지). 주민마다 초상 1장과 입 모양만 바꾼 편집 1장 | 2026-11-13. Codex 세션 `rollout-2026-11-13T18-17-46-01a1d432…` 09:25~09:27 UTC 초상 5장(「Create one standalone transparent game dialogue portrait」), 09:30~09:32 UTC 입 모양 5장(「Change only the lips of this exact illustrated person」), 09:34 UTC 원본을 `assets/source/workshop-dialogue/*-{idle,talk}.png`로 복사, 09:35 UTC 두 장을 900×500으로 합쳐 WebP 저장. 커밋 `d69e19f` | ChatGPT 유료 요금제(사용자 확인) | 위 세션 기록, `_shared/codex-image-records-20261121/index.jsonl` | 확인됨 |
| G20 | 마을 복구 그림 6장: `quest/town-restored-{post,lab,tower,aqua,workshop}.webp`, `quest/town-plaza-emblem.webp` | Codex 기본 이미지 생성 도구, 한 장씩 | 2026-11-05 생성, 11-06 적용(`c3ec848`). 프롬프트 요지 CREDITS. 내장 원본은 적용 확인 뒤 정리했다고 기록 | 생성 당시 서비스 약관 | `assets/CREDITS.md` 「마을 시설 복구 그림」 | 확인됨 |
| G21 | 열쇠 구출·극 문·광장 장치 그림 9장: `quest/key-rescue-{iron-key,workbench}.webp`, `quest/pole-door-{closed,open}.webp`, `quest/plaza-device-{distance,glass,iron,poles}.webp`, `quest/stage-plaza-device.webp` | Codex 내장 이미지 도구(GPT 이미지) | 2026-11-13, 커밋 `d69e19f`. 극 문: Codex 세션 `rollout-2026-11-13T16-23-50-01a1d3ca…` 08:01 UTC 닫힘(「Create one transparent PNG cutout game prop」), 08:02 UTC 열림(「Edit this exact isolated clockmaker's … door prop into its OPEN state」), 08:03 UTC 둘 다 248×590 WebP로 저장(내장 원본은 정리). 열쇠 구출: 세션 `rollout-2026-11-13T17-05-58-01a1d3f1…` 08:07 UTC 실험대(「Create ONE image asset for a Korean elementary science browser game」 → `assets/source/key-rescue/workbench-gap.png`), 08:10 UTC 철 열쇠(「One single isolated game sprite: a small old workshop door KEY」 → `iron-key.png`), 08:15~08:18 UTC 잘라 WebP 저장. 광장: 세션 `rollout-2026-11-13T18-17-46-01a1d432…` 09:27~09:29 UTC 장치 4장(「One single isolated game prop … civic-machine」 등), 09:29 UTC 배경(「Single wide 16:9 background for the final stage」), 09:30 UTC 원본을 `assets/source/plaza-device/`로 복사하고 WebP 저장 | ChatGPT 유료 요금제(사용자 확인) | 위 세션 기록, `_shared/codex-image-records-20261121/index.jsonl` | 확인됨 |
| G22 | 광장 철판 1장: `quest/plaza-iron-part.webp` | GPT 이미지(`gpt-imagegen` 스킬 = ChatGPT 앱의 Codex 이미지 도구) | 2026-11-19. Claude Code 대화 `4fbc969a…` 11:57 UTC `gpt-image.sh`(「A single flat rectangular iron machine part, seen perfectly straight-on」 → `.tmp/iron-part/iron-part-front.png`), 11:59 UTC 잘라 폭 420 WebP로 저장. 커밋 `395bb5a` | ChatGPT 유료 요금제(사용자 확인) | `_shared/codex-image-records-20261121/index-claude.jsonl`, 커밋 `395bb5a` 본문 | 확인됨 |
| G23 | 타이틀 배경 1장: `quest/city-title.webp` | 기존 그림을 줄여 다시 압축: G1 `quest/city-expedition.webp`(OpenAI 내장 image_gen)를 폭 1440, 품질 79 WebP로 | 2026-11-14 커밋 `747e284`. Codex 세션 `rollout-2026-11-13T21-43-10-01a1d4ee…` 11-13 16:16 UTC 변환 명령. 같은 명령으로 다시 만들어 보니 크기(297,798바이트)와 픽셀이 지금 파일과 같다(이번에 대조) | G1과 같음 | 위 세션 기록, G1 근거 | 확인됨 |
| G24 | 3D 달리기 길 그림 4장: `public/assets/run-stage/{street-tile,shop-row,props-sheet,city-skyline}.webp` | GPT 이미지(`gpt-imagegen` 스킬 = ChatGPT 앱의 Codex 이미지 도구) | 2026-11-17. 프롬프트 전문·검수: `docs/RUN-STAGE-3D-PLAN-20261117.md` 268~288행. 원본 `assets/source/run-stage-20261117/`, 가공 `scripts/prepare-run-stage-art.mjs` | 생성 당시 서비스 약관 | 같은 문서 | 확인됨 |
| G25 | 성취 카드 그림 12장: `public/assets/reward-cards/card-{1..6}-*.webp`, `thumb-{1..6}-*.webp` | ChatGPT 앱의 Codex 내장 이미지 도구. 밀이·당이 자세 그림과 장소 배경을 화풍 참고로 붙임 | 2026-11-18. 카드 설계·프롬프트: `_scratch/reward-cards-20261118/specs/05.json`, 생성 기록: `_scratch/reward-cards-20261118/queue.log`(05 card 1~6) | 프로젝트를 위해 생성한 이미지 | `assets/CREDITS.md` 「성취 카드」 | 확인됨 |
| G26 | 공유 썸네일 1장: `public/og-image-v1.jpg` (1200×600) | 기존 그림 두 장을 합친 공유용 그림: 배경은 G1 도시 지도(`city-expedition`)를 확대·흐리게 한 것, 가운데는 G7 로고(`quest/logo.webp`). 둘 다 GPT 이미지. 합성 명령 기록은 찾지 못해 그림을 눈으로 대조했고, 만든 곳은 사용자 확인으로 채움 | 2026-11-06 커밋 `a909f33`(Claude 공동 작성). 11-05 Codex 기록과 05 Claude Code 기록에서 만든 명령은 찾지 못함 | 원본 그림과 같음(ChatGPT 유료 요금제(사용자 확인)) | `README.md` 74행, 사용자 확인 2026-11-21, `_shared/CODEX-IMAGE-RECORDS-20261121.md` | 확인됨(사용자 확인) |
| G27 | 3D 모델 2개: `public/assets/3d/ring-magnet.glb`, `ring-stand.glb` | Meshy Image to 3D(사용자 계정). 입력 그림은 Higgsfield `gpt_image_2_5`. 압축 `scripts/pack-glb.mjs`(gltf-transform MIT, meshoptimizer MIT, sharp Apache-2.0). ※ 2026-11-21 대조: 저장소 기록은 Meshy·Higgsfield라 사용자 확인(그림은 전부 Codex)과 어긋난다. 확인으로 덮어쓰지 않았다 | 2026-10-25 생성, 11-06 재압축. 프롬프트 `docs/3D-PROMPTS-20261025.md`, 입력 그림 `assets/source/3d-base-20261025/manifest.json`, 원본 해시 `meshy/originals.json` | **Meshy 요금제 기록 없음.** Meshy는 요금제에 따라 생성물 권리 조건이 달라 생성 시점 요금제 확인이 필요하다. 입력 그림도 G4와 같은 Higgsfield 빈칸 | `public/assets/3d/README.md`, `assets/CREDITS.md` 「3D 모델 7종」 | 근거 약함 |
| G28 | 코드로 그린 그림: `public/favicon.svg`(도형 3개를 직접 쓴 SVG), 실험대·도우미·아이콘 SVG와 캔버스 그림(`src/`), 우편함·수조 장치 살펴보기의 Colorfigures 엔진 | 프로젝트 자체 코드. Colorfigures는 April Zhu 제작 MIT 엔진을 게임에 맞춰 사용 | favicon 2026-10-18(`05de2ca`), Colorfigures 2026-11-06 | 자체 제작물. Colorfigures는 MIT, 원문 동봉 | `public/licenses/colorfigures.txt`, `assets/CREDITS.md` 「우편함·수조관 장치 살펴보기」 | 확인됨 |

## 2. 영상 (MP4 7개 + 포스터·끝 장면 WebP 9개 + 자막 VTT 5개)

| # | 파일(묶음) | 만든 곳 | 만든 날·기록 위치 | 이용 조건 | 근거 파일 경로 | 상태 |
|---|---|---|---|---|---|---|
| V1 | 인트로·엔딩 영상 2편과 포스터·끝 장면 4장: `public/video/story/{intro,final}.mp4`, `{intro,final}-poster.webp`, `{intro,final}-end.webp` | 원본: 사용자가 준 AI 생성 영상 2편(무음). **영상 생성 도구 이름 기록 없음.** 컷 기준 그림 6장은 Codex image_gen. 편집: `scripts/render-story-videos.mjs`(SVG 효과·FFmpeg, 효과음은 자체 합성 + Kenney CC0 `reward.mp3`). 2026-11-18 영상 안 자막: `_shared/caption-motion-20261118/burn.py`(ffmpeg + libass, 주아체 OFL). ※ 2026-11-21 대조: 사용자 확인은 「영상은 제미나이」인데 지시문 `omni-prompts.txt`는 「옴니에 붙여넣을 제작 지시」라고 적어, 기록상 다른 서비스일 수 있다. 「옴니」가 무엇인지 확인 전이라 덮어쓰지 않았다 | 원본 2026-11-01 수령(해시 `assets/source/video/story/sources.json`), 지시문 `assets/source/video/storyboards/v3-20261031/omni-prompts.txt`·`image-prompts.json`, 편집 기록 `docs/STORY-VIDEO-20261101.md`, 자막 큐 `docs/film-captions-20261118/`, 자막 적용 커밋 `6e9cf2e` | CREDITS에 "영상 생성 도구·요금제는 사용자 확인 후 이 줄에 적는다"가 아직 빈칸 | `assets/CREDITS.md` 「인트로·엔딩 영상」, `_shared/FULLSCREEN-CAPTION-FILMS-20261118.md` | 근거 약함 |
| V2 | 개념 영상 5편과 포스터·자막: `public/video/concepts/stage-{1..5}.mp4`, `.webp`, `.vtt` | 프로젝트 자체 모션 그래픽. `scripts/render-concepts.py`(Pillow 프레임 → FFmpeg libx264), 짧은 음은 스크립트 합성, 그림은 프로젝트 그림 재사용, 글자는 나눔스퀘어 네오 Bold(OFL) | 2026-10-22 첫 제작, 11-04 다시 렌더, 11-14 글꼴을 나눔스퀘어 네오로 교체(`8be2eb3`). 해시: `public/video/concepts/manifest.json` | 자체 제작물. 글꼴 OFL(F1) | `assets/CREDITS.md` 「개념 영상·보조 캐릭터·효과음」(※ "Windows 맑은 고딕" 문구는 11-14 이전 기록으로 지금 스크립트와 다름) | 확인됨 |

## 3. 음악 (MP3 2개)

| # | 파일(묶음) | 만든 곳 | 만든 날·기록 위치 | 이용 조건 | 근거 파일 경로 | 상태 |
|---|---|---|---|---|---|---|
| M1 | 배경음 2곡: `public/audio/music/main-theme.mp3`, `finale-theme.mp3` | Suno. 사용자가 만들어 제공(`Main_Curious Discovery.mp3`, `Final_Victory in the Town Square.mp3`), 바이트 변경 없음 | 2026-10-25 적용(`c56d5cb`). 원본 `assets/source/audio/suno/`, SHA-256·길이 `tracks.json`, 기록 `docs/SUNO-MUSIC-20261025.md` | 유료 요금제 구독 중 생성(사용자 확인, CREDITS는 "premium", `_shared` 음성 출처 문서는 "Premier"로 표기). 결제 내역은 저장소에 없음 | `assets/CREDITS.md` 「배경음과 효과음 재생」, `_shared/voice-provenance-20261118.md` 요금제 표 | 확인됨 |

## 4. 효과음 (MP3 28개)

| # | 파일(묶음) | 만든 곳 | 만든 날·기록 위치 | 이용 조건 | 근거 파일 경로 | 상태 |
|---|---|---|---|---|---|---|
| S1 | 기본 조작음 8개: `public/audio/{click,pick,drop,compare,success,reward,bump,step}.mp3` | Kenney *Interface Sounds 1.0* (원본 이름 대응표 있음), MP3 변환·0.8초 이하·끝 페이드 | 2026-10-22. 원본 ZIP·라이선스 `assets/source/audio/` | CC0 1.0. 원문 `public/audio/Kenney-License.txt` 동봉 | `assets/CREDITS.md` 효과음 표, `public/audio/sources.json` `files` | 확인됨 |
| S2 | 장치 실험음 4개: `snap.mp3`, `lid.mp3`, `pad.mp3`, `crate.mp3` | Kenney *Impact Sounds 1.0* | 2026-11-04(`c317fc5`) | CC0 1.0. 원문 `public/audio/Impact-License.txt` 동봉 | `assets/CREDITS.md` 「장치 실험 효과음」, `sources.json` `impact` | 확인됨 |
| S3 | 지도 악당 소리 8개: `map-{zap,clank-one,clank-two,hit-heavy,exit,bump,appear,victory}.mp3` | 과학34 공통 효과음 라이브러리(`_shared/sfx-library-20261117`)에서 복사. 원본은 Freesound 제작자 6명(danielpodlovics, saturdaysoundguy, martian, checholio, javapimp, mickleness)과 Kenney RPG·Impact 팩 | 2026-11-14~17. 파일별 제목·제작자·원본 주소: `public/audio/sources.json` `mapEncounters` | CC0 1.0. 라이브러리에서 2026-11-17 원본 페이지 재확인 | `_shared/sfx-library-20261117/CREDITS.md`, `sources.json` (※ `assets/CREDITS.md` 본문에는 이 8개 표가 없고 `sources.json`에만 있음) | 확인됨 |
| S4 | 성취 카드 소리 5개: `card-{whoosh,reveal,epic,slot,complete}.mp3` | 같은 라이브러리. 원본 Freesound qubodup, ZenithInfinitiveStudios, CogFireStudios, DeltaCode, el_boss | 2026-11-18. `sources.json` `rewardCards` | CC0 1.0 (2026-11-17 재확인) | `assets/CREDITS.md` 「성취 카드」 | 확인됨 |
| S5 | 지도·달리기 길 소리 3개: `map-open.mp3`, `map-twinkle.mp3`, `run-jump.mp3` | 같은 라이브러리. 원본 Kenney `open_001`, Freesound 1urker, qubodup | 2026-11-19. `sources.json` `mapAndRun` | CC0 1.0 (2026-11-17 재확인) | `assets/CREDITS.md` 「지도 발자국·입구등 열림·달리기 길 소리」 | 확인됨 |

파일이 없을 때 쓰는 Web Audio 합성 대체음과 영상 속 합성음은 코드로 만든 소리라 파일이 없다(G28·V1·V2와 같은 자체 제작).

## 5. 목소리 (MP3 178개)

| # | 파일(묶음) | 만든 곳 | 만든 날·기록 위치 | 이용 조건 | 근거 파일 경로 | 상태 |
|---|---|---|---|---|---|---|
| A1 | 캐릭터 대사 36개: `public/audio/voices/resident-{1..4}-*.mp3`(16), `el-resident-5-*.mp3`(4), `workshop-*.mp3`(5), `mascot-{mili,dangi}-title.mp3`(2), `story-{intro,final}-*.mp3`(9) | ElevenLabs `eleven_v4` 한국어 라이브러리 음성 12종(Klamon, 수진, Grandfather Namchun, SK, Sora, oki, Aria, Sara Kim, Taek, Haemi, MyungIn, Eunhye) | 2026-11-12 생성, 발명가 4개는 11-18 다시 만들고 11-19 Sora로 교체(`395bb5a`). 대사·음성 ID·생성 ID·SHA-256: `public/audio/voices/manifest.json`, 배정 `docs/resident-voices.md` | 유료 요금제(11-17까지 Starter, 11-18부터 Creator). 실제 사람 목소리 복제 없음 | `assets/CREDITS.md` 「캐릭터 한국어 목소리」, `_shared/voice-provenance-20261118.md` 요금제 표·5번 표 | 확인됨 |
| A2 | 화면 대사 읽기 142개: `public/audio/voices/el-*.mp3`(긴급 의뢰 6, 개념 영상 자막 15, 발견·정리 문제 33, 발명 예시 6, 공방 말풍선 12, 자꾸 힌트 33, 악당 말풍선 30, 이야기 카드 2, 기타 5) | ElevenLabs `eleven_v4` (141줄 공식 API, 1줄 MCP flow) | 2026-11-18. 줄별 화자·음성 ID·생성 ID·프롬프트·받아쓰기 점수·SHA-256: `docs/VOICE-FILL-20261118.json` (142줄 전부 실제 파일과 일치함을 이번에 대조) | ElevenLabs Creator(유료, 상업 이용 가능)라고 같은 JSON `plan` 칸에 기록 | 같은 JSON, `src/voice-lines-data.ts` 머리 주석 | 확인됨 |
| A3 | 옛 발명가 목소리 4개: `public/audio/voices/resident-5-{hello,again,news,science}.mp3` — **미사용** (지금 코드는 `el-resident-5-*`를 부름) | 모모 로컬 Qwen3-TTS(preset-06) | 2026-11-12~13. 지금 `manifest.json`에서는 빠졌고, 커밋 `d69e19f` 시점 manifest에 `"model": "qwen3tts"`, `"source": "Momo Jarvis · local synthesis"`와 SHA-256이 있으며 지금 파일 해시와 같음(이번에 대조) | `_shared/voice-provenance-20261118.md`는 Qwen3-TTS를 Apache-2.0 로컬 모델로 적음. 그런데 같은 폴더에 동봉된 `model-license.txt`(OpenRAIL-M)·`source-license.txt`(MIT, Supertone)는 그 전 Supertonic 버전 기록이라 지금 파일과 맞지 않음 | 커밋 `d69e19f`의 `public/audio/voices/manifest.json` | 근거 약함 |

## 6. 글꼴 (WOFF2 7개)

| # | 파일(묶음) | 만든 곳 | 만든 날·기록 위치 | 이용 조건 | 근거 파일 경로 | 상태 |
|---|---|---|---|---|---|---|
| F1 | 나눔스퀘어 네오 3개: `public/fonts/NanumSquareNeoTTF-{bRg,cBd,dEb}.woff2` (화면·캔버스·3D 글자 전부) | 네이버 공식 배포본(hangeul.naver.com, `NaverNanumSquareNeo.zip`), 수정 없음 | 2026-11-10 추가, 11-11 전체 적용. `public/fonts/README.md` | SIL OFL 1.1. 원문 `public/fonts/NanumSquareNeo-OFL.txt`(공식 라이선스 주소·2026-11-10 확인 기록 포함) | `public/fonts/README.md`, `assets/CREDITS.md` 「폰트」 | 확인됨 |
| F2 | 주아·프리텐다드 서브셋 4개: `public/fonts/quest-display-{ko,latin}.woff2`, `quest-body-{regular,bold}.woff2` — **미사용**(README: "더 이상 코드에서 고르지 않음") | Jua(Woowahan Brothers, Google Fonts 배포)·Pretendard(Kil Hyung-jin) 서브셋. 이전 프로젝트(01·02)에서 가져와 내부 이름만 Magnet Quest Display/Sans로 바꿈(RFN 준수) | 2026-10-21. 수정·검증 `docs/reviews/DESIGN-SYSTEM-20261021.md` | SIL OFL 1.1. 원문 `Jua-OFL.txt`, `Pretendard-OFL.txt` 동봉 | `public/fonts/README.md` | 확인됨 |

## 사용자가 줘야 하는 자료

1. **인트로·엔딩 영상(V1) 원본을 만든 영상 생성 도구 이름과 그때 요금제 화면.** CREDITS에 빈칸으로 남아 있다. 사용자 확인(2026-11-21)은 「영상은 제미나이」인데, 지시문은 「옴니에 붙여넣을 제작 지시」라고 적혀 있다. 「옴니」가 제미나이 안의 기능인지 다른 서비스인지 확인해 주면 V1을 채울 수 있다.
2. **Higgsfield 요금제·이용 조건 화면**(2026-10-25, 10-29 생성 시점). 대상: G4 7장, G5 10장, G27 3D 입력 그림.
3. **Meshy 요금제 화면**(2026-10-25 생성 시점, 유료 여부). 대상: G27 3D 모델 2개.
4. **ChatGPT(OpenAI) 구독 요금제 화면.** 장부는 사용자 확인(「다 유료 요금제」)으로 채웠고, 화면 캡처는 납품 때 붙이는 증빙으로 남긴다. 대상: imagegen·Codex 이미지 도구로 만든 그림(G1~G3, G6, G9~G14, G16~G26 중 G15 제외)과 G7의 ChatGPT 그림.
5. ~~2026-09-23 ChatGPT 그림 5장(G7)을 누가 만들어 줬는지~~ — 2026-11-21 사용자 확인(16곳 그림은 전부 GPT, 유료 요금제)으로 채움.
6. **G15 주민 대화 초상 5장의 이용 조건.** 생성 기록(ElevenLabs 이미지 생성 `bytedance-seedream-5.5`, 2026-11-12)과 그날의 유료 요금제(Starter)는 확인됐다. 그래서 3-3a(2026-11-21)에 다시 그리기 목록에서 뺐다. 남은 것은 ElevenLabs 이미지 출력 이용 조건(약관 원문·요금제 화면)이다. G4·G5(Higgsfield)·G27(Meshy)과 같이 납품 증빙 자료로 받는다.
7. ~~G8·G9·G12·G22의 생성 도구 확인~~ — 2026-11-21 생성 기록(G9·G22)과 사용자 확인(G8·G12)으로 채움.
8. **Suno 구독 화면**(2026-10-25 생성 시점). 기록은 사용자 확인뿐이고, 요금제 이름이 "premium"(CREDITS)과 "Premier"(`_shared`)로 다르게 적혀 있다.
9. **ElevenLabs 요금제 화면**(11-12~17 Starter, 11-18 이후 Creator). 계정 조회 기록은 있으나 화면 보관본은 없다.
10. **아이스크림미디어와의 계약서나 납품 조건 메일**에서 AI 생성 그림·음성·음악 사용이 허용되는지, 저작권 귀속이 어떻게 되는지 적힌 부분(앱에는 "기획·제작: 옐샘 & ⓒ 아이스크림미디어"로 표기).

## 상태별 줄 수

| 상태 | 줄 수 | 해당 줄 |
|---|---:|---|
| 확인됨 | 29 | G1, G2, G3, G6, G9, G13, G14, G16, G17, G18, G19, G20, G21, G22, G23, G24, G25, G28, V2, M1, S1, S2, S3, S4, S5, A1, A2, F1, F2 |
| 확인됨(사용자 확인) | 6 | G7, G8, G10, G11, G12, G26 |
| 근거 약함 | 6 | G4, G5, G15, G27, V1, A3 |
| 출처 미확인 | 0 | — |
| **합계** | **41** | |

- 2026-11-21 생성 기록 대조 전후: 출처 미확인 7줄(28장) → 0줄. 근거 약함 10줄 → 6줄(G7·G8·G9·G12·G22는 확인됨으로, G15는 출처 미확인에서 근거 약함으로).
- 기록으로 확인한 줄: G9·G19·G21(Codex 세션 기록), G22(Claude Code `gpt-imagegen` 기록), G23(G1을 줄인 사본, 같은 명령으로 다시 만들어 대조).
- 사용자 확인과 저장소 증거가 어긋나는 줄: G4·G5(Higgsfield), G27(Meshy·Higgsfield), G15(ElevenLabs `bytedance-seedream-5.5`), V1(지시문의 「옴니」). 상태를 바꾸지 않았다.

## 같이 본 것 (고치지 않고 보고만)

- `public/`에 있어 함께 배포되지만 코드가 부르지 않는 파일: G10 밀이 전투 시트(PNG·WebP·JSON), A3 옛 발명가 목소리 4개, F2 옛 글꼴 4개, `voices/model-license.txt`·`source-license.txt`(옛 Supertonic 기록). 납품본에서 빼면 장부가 짧아지고 G10·A3 같은 빈칸도 사라진다.
- `assets/CREDITS.md`의 개념 영상 글꼴 문구("Windows 맑은 고딕")는 2026-11-14(`8be2eb3`) 이후 나눔스퀘어 네오로 바뀐 지금과 다르다.
- `assets/CREDITS.md` 본문에 지도 악당 효과음 8개(S3) 표가 없다. `public/audio/sources.json`에는 있다.
- 앱 설정 화면의 출처 문구(`src/settings-content.ts`)는 효과음을 Kenney만 적고 Freesound CC0 소리(S3~S5)와 ElevenLabs 목소리는 적지 않는다. CC0는 표기 의무가 없어 권리 문제는 아니다.
- 이 저장소 `.git/objects/pack/`에 `._pack-*.idx`(macOS 메타데이터)가 있어 git 명령마다 `non-monotonic index` 경고가 난다. 이번 작업은 "아무것도 지우지 말 것" 범위라 지우지 않았다.

## 사용한 기록

- 저장소: `assets/CREDITS.md`, `public/audio/sources.json`, `public/audio/voices/manifest.json`(지금과 커밋 `d69e19f` 시점), `docs/VOICE-FILL-20261118.json`, `docs/resident-voices.md`, `docs/ART-PROMPTS-20261021.md`, `docs/ART-PRODUCTION-20261024.md`, `docs/LEARNING-VISUAL-PROMPTS-20261029.json`, `docs/3D-PROMPTS-20261025.md`, `docs/RUN-STAGE-3D-PLAN-20261117.md`, `docs/STORY-VIDEO-20261101.md`, `docs/ADVENTURE-UPDATE-20261015.md`, `docs/IMPLEMENTATION.md`, `public/fonts/README.md`, `public/assets/3d/README.md`, `public/assets/learning/manifest.json`, `assets/source/**/manifest.json·prompts.json·README.md`, `assets/source/video/story/sources.json`, `scripts/render-concepts.py`, `scripts/render-story-videos.mjs`, `scripts/prepare-run-stage-art.mjs`, 묶음별 `git log`.
- `_shared`: `voice-provenance-20261118.md`, `sfx-library-20261117/CREDITS.md`, `MAP-VILLAINS-HANDOFF-20261114.md`, `FULLSCREEN-CAPTION-FILMS-20261118.md`, `reward-cards/INTEGRATION.md`, `AUDIO-FIX3-BRIEF-20261120.md`.
- `_scratch`: `redraw-02-05-20261114/`(DELIVERY.md, prompts.json), `map-redraw-20261114/README.md`, `reward-cards-20261118/`(specs/05.json, queue.log), `thumbs-20261118/assets.json`.
- 2026-11-21 대조(읽기만): `_shared/CODEX-IMAGE-RECORDS-20261121.md`와 색인 `_shared/codex-image-records-20261121/`(`index.jsonl`, `index-claude.jsonl`), Codex 세션 원문 `~/.codex/sessions/2026/11/{03,04,05,12,13,14}/`(압축 `.jsonl.zst` 포함), 05 Claude Code 대화 기록, `_scratch/npc-dialogue-plan-20261112/`, `_scratch/villain-concepts-20261114/map-mockup-work/`, `assets/source/video/storyboards/v3-20261031/omni-prompts.txt`. `docs/LEARNING-VISUAL-PROMPTS-20261029.json`·`assets/source/characters-pixel-20261101/prompts.json`은 G5·G6 줄 그대로이고 대상 줄과 이어지는 프롬프트는 없었다.

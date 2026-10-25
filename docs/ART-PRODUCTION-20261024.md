# 2026-10-24 생성 소품 제작 기록

## 결과와 출처

사용자의 교육게임 디자인 고도화·이미지 생성 요청에 따라 **내장 `image_gen` 도구**로 새 소품을 생성했다. 외부 스톡 이미지나 제3자 캐릭터를 사용하지 않았다. 기존 `stage-material.webp`와 `props-sheet.webp`를 눈으로 확인한 뒤, 따뜻한 목재·황동 작업실과 어울리는 질감으로 프롬프트를 작성했다. 기존 파일 자체를 편집하거나 이미지 입력으로 전달하지 않았다.

| 게임용 파일 | 원본 파일 | 크기 | 형식/용량 |
| --- | --- | --- | --- |
| `public/assets/quest/material-kit.webp` | `assets/source/production/material-kit-20261024.png` | 1536 × 1024 | lossless RGBA WebP, 812,892 bytes |
| `public/assets/quest/magnet-bar.webp` | `assets/source/production/magnet-bar-20261024.png` | 1536 × 1024 | lossless RGBA WebP, 512,670 bytes |

원본 PNG는 내장 도구의 기본 생성 폴더에서 프로젝트의 D: 드라이브로 복사했다. 게임용 파일은 Pillow로 손실 없는 WebP 인코딩만 수행했다. 이미지 합성·색상 수정·배경 제거·코드로 그리기는 수행하지 않았다. 완전히 투명한 픽셀의 보이지 않는 RGB 값만 인코더가 최적화하도록 허용했다. 재디코딩 비교에서 **알파 전체와 알파가 0보다 큰 픽셀의 RGB가 원본과 일치**했다.

서비스를 통해 생성한 이미지이며 별도 오픈소스·스톡 라이선스를 부여받은 것으로 표시하지 않는다. 사용 권리는 생성 당시 적용되는 서비스 약관에 따르며, 이 제작 작업에서 별도 법률 검토나 상표·유사성 권리 조사는 수행하지 않았다.

## 이미지 규격과 검수

### 재료 아틀라스

`material-kit.webp`는 3열 × 2행, 셀마다 512 × 512픽셀이다. 좌표 원점은 좌측 상단이다.

| 프레임 | 재료 | x | y | width | height |
| --- | --- | --- | --- | --- | --- |
| 0 | 철 클립 | 0 | 0 | 512 | 512 |
| 1 | 철 못 | 512 | 0 | 512 | 512 |
| 2 | 알루미늄 포일 | 1024 | 0 | 512 | 512 |
| 3 | 나무토막 | 0 | 512 | 512 | 512 |
| 4 | 노란 플라스틱 블록 | 512 | 512 | 512 | 512 |
| 5 | 분홍 고무지우개 | 1024 | 512 | 512 | 512 |

이미지에 글자를 넣지 않아 재료 이름은 접근 가능한 게임 UI 텍스트로 표시할 수 있다. 생성물의 여섯 물체 형태·셀 순서·재료 구분을 육안 확인했다. 각 셀 내부의 주요 물체 실루엣은 이웃 셀과 겹치지 않는다. 철 클립·철 못과, 자석에 붙지 않는 알루미늄 포일·나무·플라스틱·고무를 구분하는 실험용이다. 이름만으로 금속 전체를 자성체로 일반화하지 않도록 게임의 피드백에서 설명해야 한다.

RGBA의 알파 범위는 0–254이며, 전체 1,572,864픽셀 중 완전히 투명한 픽셀은 1,042,353개다. 알파가 127보다 큰 주요 실루엣의 전체 경계는 `(46, 45)–(1503, 930)`이다. 생성 모델의 가장자리에는 소량의 매우 낮은 알파 픽셀이 있을 수 있으므로 충돌 판정은 이미지 알파 대신 게임의 명시적 히트 영역을 사용한다.

일부 이미지 미리보기 도구가 완전히 투명한 픽셀의 RGB를 그대로 보여주어 가로 색 띠처럼 표시했다. 제작 파일을 변경하지 않고 검수 전용 임시 이미지에 흰 바탕 알파 합성을 수행해 확인했으며, 물체 주변·셀 사이·하단에 해당 색 띠가 나타나지 않았다. 의심 좌표 `(500,400)`, `(600,200)`, `(1000,700)`, `(1000,920)` 등의 실제 알파는 모두 0이었다.

### 막대자석

`magnet-bar.webp`의 왼쪽은 빨강, 오른쪽은 파랑이며, N/S 글자는 포함하지 않았다. 극이 바뀌는 게임 상태에 맞춰 N/S는 코드에서 표시한다. 과학 정보가 텍스트로 유지되므로 색만으로 극을 구분하지 않아도 된다.

원본은 여백이 넓다. 주요 자석 실루엣(알파 > 127)의 경계는 `(78, 390)–(1462, 633)`이다. Phaser 이미지 프레임 또는 CSS 배경에서 `x=60, y=370, width=1420, height=285` 영역을 사용하면 여백을 줄여 표시할 수 있다. 전체 이미지를 단순 `object-fit: contain`으로 쓰면 자석이 작아지므로 주의한다.

RGBA의 알파 범위는 0–254이며, 완전히 투명한 픽셀은 1,216,733개다. 자석의 두 색·수평 방향·문자 없음·실제 투명 알파를 확인했다.

## 최종 생성 프롬프트

### material-kit

```text
Use case: scientific-educational. Asset type: premium elementary science adventure game sprite atlas, exactly 3 columns by 2 rows, canvas 1536 x 1024 pixels, six equal square 512 x 512 cells. Create six separate, easily recognizable classroom material specimens, isolated on genuine transparent alpha background. TOP ROW left to right: one large silver steel paper clip (classic double loop paperclip); one silver iron nail with a broad round flat head and pointed end; one slightly crumpled irregular square of thin shiny aluminum foil. BOTTOM ROW left to right: one short rectangular light honey wood block with natural visible grain; one smooth opaque warm yellow rectangular plastic block, subtly rounded corners; one pink rectangular rubber eraser, plain and unwrapped. Each object strictly centered in its own cell, at cell centers (256,256), (768,256), (1280,256), (256,768), (768,768), (1280,768). Each object fully contained inside the central 70% of its square with generous transparent padding, all visually similar sized and clearly separable. No object crosses a cell boundary. Near top-down view with mild three-quarter volume, coherent soft top-left lighting. Style: high-quality painterly game inventory props, delicate hand-painted edges, tactile material texture, warm cream/golden highlights and subtle teal reflected shadows, polished stylized realism suited to a cozy brass-and-wood science workshop for Korean grade 4 learners. Maintain scientifically recognizable differences among steel, aluminum foil, wood, plastic and rubber. Paper clip and nail slim but readable with bright metallic highlights; foil is visibly a thin crinkled sheet, not stone. No cast shadows outside the objects; ambient shading on the objects only. IMPORTANT: actual transparent RGBA background, not a checkerboard illustration, not white, not colored backdrop. No letters, no labels, no border, no grid lines, no badges, no people, no extra objects, no watermark.
```

### magnet-bar

```text
Use case: scientific-educational. Asset type: single draggable magnet sprite for a premium grade 4 science adventure game. Create ONE horizontal classroom bar magnet, centered on a genuinely transparent alpha canvas, 1536 x 1024, no other objects. A simple straight rectangular bar of proportions 5:1, softly beveled corners, left HALF rich coral red and right HALF rich cobalt blue, meeting exactly in the middle. Color covers each half of the physical magnet; both ends are visible metallic edge highlights, not thick caps. NO letters, no N or S, no markings or inscriptions: labels will be added in software. Three-quarter view with only very mild perspective, almost front view; long horizontal axis perfectly level, broad FRONT face available for overlaid labels, thin top edge visible. Full magnet inside middle 85% width, middle 35% height, generous transparent padding on all sides. Premium hand-painted game prop style, crisp tactile painted metal, tasteful soft bevels and subtle worn-edge metallic gleam, warm cream/golden top-left lighting with soft teal shadows on the object itself; matches a cozy wood-and-brass science workshop. Friendly, polished illustrated realism, not photorealism, not flat vector. Clean silhouette, no motion streaks, no glow, no magnetic field lines, no detached shadow, no floor, no background. Required actual transparent RGBA background. No text, no watermark, no frame.
```

두 생성 모두 `transparent_background: true`로 요청했다. 내부 생성 모델명·버전은 도구 결과에 공개되지 않아 추정해서 기재하지 않았다.

## SHA-256

- `material-kit.webp`: `6ca59602e6034009145b8be8823d5d80394efd81fb61656620af662868722826`
- `magnet-bar.webp`: `a9bcad7bf02186ff0f694389b3ee9ccb8ed70b632fd82792b392b148dd129f82`

## 같은 날 추가 제작한 그림 4종

사용자가 병렬 작업으로 속도를 높여 달라고 요청한 뒤, 같은 내장 `image_gen` 도구로 4종을 추가 생성했다. 기존 그림을 덮어쓰지 않고 새 이름으로 저장했다. `transparent_background: true`를 지정했고, 원본을 D: 프로젝트로 복사한 뒤 RGBA WebP를 lossless/method=4로 변환했다. 픽셀 검사에서 알파 전체와 알파가 0보다 큰 픽셀의 RGB가 원본과 같았다. 흰 바탕 알파 합성 검수용 이미지는 프로젝트 배포 파일과 분리해 `D:/DevTemp/5magnet-asset-qa/`에 만들었으며, 실제 게임용 이미지는 합성하거나 배경을 수정하지 않았다.

| 게임용 파일 | 원본 파일 | 실제 크기 | 용량 | alpha > 127 경계 (left, top, right, bottom) |
| --- | --- | --- | --- | --- |
| `public/assets/quest/magnetic-gate.webp` | `assets/source/production/magnetic-gate-20261024.png` | 1536 × 1024 | 1,016,278 bytes | 35, 141, 1502, 890 |
| `public/assets/quest/mission-vignettes.webp` | `assets/source/production/mission-vignettes-20261024.png` | 1536 × 1024 | 1,498,074 bytes | 23, 7, 1532, 1023 |
| `public/assets/quest/coach-companion.webp` | `assets/source/production/coach-companion-20261024.png` | 1254 × 1254 | 1,010,874 bytes | 128, 21, 1198, 1233 |
| `public/assets/quest/science-equipment.webp` | `assets/source/production/science-equipment-20261024.png` | 1536 × 1024 | 932,808 bytes | 40, 91, 1495, 964 |

실측 검사와 SHA-256은 `assets/source/production/production-20261024-frame-diagnostics.json`에도 보관했다. `coach-companion`은 요청한 1024 정사각형과 달리 **1254 정사각형으로 생성**되었으므로 코드에서 실제 규격을 사용한다. 저작·사용 권리 범위는 위 생성물 출처 설명과 같다. 별도 스톡·오픈소스 라이선스를 만들어 붙이지 않았다.

### 장비 프레임과 과학 표현 검수

`science-equipment`는 3 × 2 배치를 요청했지만 나무 기둥의 꼭대기가 y=475에 있어 512픽셀의 고정 셀을 사용하면 윗부분이 잘린다. 실제 실루엣 주위에 8픽셀 여유를 둔 아래 프레임을 사용한다. `public/assets/quest/science-equipment.json`은 같은 값을 담은 Phaser atlas JSON이다. `diagnostics` 필드에 여유가 없는 실제 실루엣 경계도 기록했다.

| ID | 장비 | x | y | width | height |
| --- | --- | --- | --- | --- | --- |
| ringN | 빨강 윗면·파랑 아랫면의 원형 자석 | 32 | 87 | 453 | 324 |
| ringS | 파랑 윗면·빨강 아랫면의 원형 자석 | 545 | 86 | 452 | 325 |
| plate | 은빛 철판 | 1064 | 83 | 439 | 328 |
| pad | 수조 청소 패드 | 33 | 561 | 466 | 366 |
| key | 철 열쇠 | 544 | 512 | 465 | 430 |
| stand | 나무 기둥과 받침 | 1146 | 467 | 300 | 505 |

두 원형 자석의 가운데 구멍은 실제로 투명하다. N/S 표시는 생성 이미지에 없으며 코드에서 제공한다. 흰 배경 합성 검수에서 물체 외부와 구멍에 불필요한 색 띠가 나타나지 않았다. 일부 미리보기 도구에서 보이는 검정·자홍·파랑 사각 무늬는 알파가 0인 픽셀의 RGB가 노출되는 현상이다.

`mission-vignettes`의 배치는 위쪽부터 우편함 / 재료 실험 / 원형 자석 받침, 아래쪽부터 수조와 운반차 / 걸쇠 발명 / 복구한 마을이다. 검수 결과 **위쪽 세 번째 원형 자석 그림은 각 원판 윗면의 극 색을 좌우 반씩 나누어 그렸으므로 극 개념을 설명하는 그림으로 사용하지 않는다.** 해당 장면은 `science-equipment`의 원형 자석과 기둥을 조합하여 표현하도록 UI 담당자에게 전달했다. 위쪽 가운데 트레이가 오른쪽 셀 경계를 약 1픽셀, 아래쪽 왼쪽 철로가 오른쪽 셀 경계를 약 37픽셀 넘어가므로 고정 셀을 사용할 때 장식 가장자리 일부가 잘릴 수 있다. 이미지로 학습 정답을 설명할 때 이 장식의 구도나 색을 근거로 사용하지 않는다.

### 추가 제작 최종 프롬프트

#### science-equipment

```text
Use case: scientific-educational. Asset type: ONE coherent game equipment sprite atlas, 1536x1024, exactly 3 columns x 2 rows of equal 512 square cells. Six isolated objects on genuine transparent alpha, each centered in its cell, generous 12 percent padding, no cell overlap. TOP ROW: (1) thick donut classroom ring magnet, wide horizontal ellipse viewed from slightly above, RED top face and BLUE visible lower rim, real circular through-hole showing transparency, no letters; (2) IDENTICAL ring shape and perspective but BLUE top face and RED lower rim, through-hole transparent; (3) one rectangular brushed STEEL latch plate, silver cool metal, softly beveled edges, two small fixing holes, three-quarter view. BOTTOM ROW: (4) aquarium magnetic cleaning pad, a thick rounded rectangular silver steel top above a dark teal felt cleaning base, viewed from slightly above; (5) one unmistakable plain old-fashioned silver IRON KEY, large bow and single toothed shaft, diagonal three-quarter view; (6) a vertical nonmagnetic light wooden rod mounted on a small honey wood oval foot, straight rod, NO RINGS on it, entire tall stand inside its cell. All props tactile and hand-painted with warm top-left light, golden highlights, cool teal shadows, crisp dimensional edges, premium cozy brass-and-wood science adventure art for grade 4 learners. No outlines resembling flat SVG, no people, no background scene, no cast shadow outside objects, no text, no N/S labels, no numbers, no grids, no watermark. Real transparent RGBA background is essential.
```

#### mission-vignettes

```text
Use case: illustration-story. Asset type: ONE unified set of six storybook mission illustrations arranged as a precisely regular 3-column by 2-row sprite atlas, 1536x1024, equal 512x512 cells, transparent RGBA background, isolated self-contained miniature dioramas, no object crosses a cell border, each scene within central 85% of cell with clean transparent margins. TOP ROW left to right: 1 a warm wooden mailbox with hinged lid propped open, one red-blue bar magnet and silver latch plate revealed inside, a letter nearby; 2 a scientist's little wood tray showing a red-blue bar magnet lifting steel paperclips, with distinct wooden block, yellow plastic block and crumpled aluminum square resting below; 3 three red-blue donut magnets floating spaced apart on a slender wooden vertical rod mounted on a wooden foot, clearly each ring has a hole. BOTTOM ROW: 4 a clean glass aquarium with a little rectangular cleaning pad inside and a red-blue magnet outside, next to a small wooden parcel cart on short rails; 5 a handmade wooden magnetic latch invention with red-blue bar magnet and steel target, neatly arranged beside a rolled cream blueprint and short brass ruler; 6 a joyful tiny restored town square, warm cobblestone path, little functioning postal box, delivery cart and golden star-shaped award, no people. Style cohesive premium painterly dimensional game illustration, friendly proportions, textured honey wood, brushed brass, teal patina and cream highlights, warm natural lighting, crisp readable silhouettes and tactile material finish, matches a detailed cozy inventor-town educational adventure. NO writing, letters, N/S, symbols, labels, diagrams, border, panels, dark background, checkerboard, watermark. These images will appear beside instructional text in a polished children's science game.
```

#### magnetic-gate

```text
Use case: scientific-educational. Asset type: a transparent decorative two-part sliding gate mechanism game sprite. Create ONE miniature horizontal brass-and-wood safety gate for a cozy premium science game, front three-quarter view with very mild perspective. A small honey wood base with short steel guide rail, two separate warm teal vertical sliding leaves facing each other across a clear central open gap; both leaves have an EMPTY smooth rectangular mounting recess at middle height, left leaf facing right, right leaf facing left, for code-rendered magnetic pole markers. No magnets or writing included. Gears and bolts are modest and functional, edges polished, tactile wooden grain and aged gold brass, warm cream top-left light and cool teal shade. Entire object centered in middle 85 percent of a 1536x1024 transparent RGBA image, generous transparent padding. Style hand-painted premium children's adventure game prop, visually rich but clean silhouette, not a flat vector diagram. No characters, background scene, floor, arrows, motion lines, text, letters, numbers, watermark. Do not fill the central gap with anything.
```

#### coach-companion

```text
Use case: stylized-concept. Asset type: ONE friendly science repair robot companion sprite for a premium grade-4 magnet adventure game, transparent RGBA. Small rounded honey-yellow metal robot with broad dark teal glass faceplate, two kind white oval glowing eyes, subtle friendly smile below screen, a small U-shaped magnet antenna whose left tip is muted coral red and right tip cobalt blue, two short brass articulated arms, one arm raised in a calm helpful gesture, two short rounded dark teal feet. NO wheels, no text, no letters, no weapons. Front three-quarter view, facing slightly right towards the learner's work, whole body visible, squat proportions. Detailed hand-painted storybook game art with warm brass edge highlights, soft worn enamel texture, gentle teal shadows, polished tactile materials, rich volume and crisp contour matching a cozy wooden inventor workshop. Friendly and capable, not babyish or aggressive. Centered within central 80 percent of square 1024x1024, transparent background with NO floor or detached shadow, no other items, no frame, watermark, text or symbols.
```

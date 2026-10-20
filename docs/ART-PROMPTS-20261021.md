# 자석도시 탐험 고도화 이미지 자산

작성: 2026-10-21 (KST)

## 생성 및 권리 기록

- 생성 도구: OpenAI built-in `image_gen.imagegen` (CLI/API fallback 미사용).
- 사용자 승인: 고도화 작업에 필요한 이미지 생성·수정·실제 앱 적용을 명시 요청.
- 신규 배경은 별도 외부 이미지·스톡 자료 없이 텍스트 프롬프트로 생성했다.
- 기존 캐릭터 `assets/source/adventure/mili-poses-v2.png`, `dangi-poses-v2.png`를 시각 확인했고, 캐릭터 정체성은 기존 자산을 그대로 재사용한다. 새 배경에 캐릭터를 굽지 않았다.
- 지도와 각 실내는 독립된 한 장씩 생성했다. 도시는 크림 석조·코발트·구리·목재 계열로 통일했다.
- 원본: `assets/source/quest/*.png`, 런타임: `public/assets/quest/*.webp`.
- 원본은 보존하며 WebP 변환과 고정 512px 격자 분할만 Pillow로 처리했다. 배경제거 편집은 imagegen으로 처리했다.
- 생성 결과의 기존 이미지 표시 도구는 투명 영역 RGB까지 보이는 특성이 있어, 알파 픽셀 수치와 실제 밝은 바탕 합성 검수로 재확인했다. `test-results/quest-props-alpha-preview.jpg`는 검수용이며 런타임 자산이 아니다.

## 자산 목록

| 파일(public/assets/quest) | 크기 | 바이트 | 용도 |
| --- | --- | ---: | --- |
| city-expedition.webp | 1672×941 | 552,462 | 도시 탐험 지도 |
| stage-life.webp | 1672×940 | 230,196 | 우편·도서 생활 해결실 |
| stage-material.webp | 1672×941 | 262,006 | 물질 분류 탐구실 |
| stage-poles.webp | 1672×941 | 266,316 | 극성·고리 탐구실 |
| stage-remote.webp | 1672×941 | 246,978 | 비접촉 운반 탐구실 |
| stage-workshop.webp | 1672×941 | 271,730 | 시민 발명 공방 |
| props-sheet.webp | 1536×1024 | ~250,000 | 투명 소품 3×2 atlas |

배경 6장 합계: 1,829,688 bytes. 실험체·자석 극 표시·조작 결과·UI 문구는 실제 앱에서 별도 렌더한다. 시각 장식이 과학 판정을 대신하지 않는다.

## 지도 실제 출입구 좌표

생성된 그림의 시각 검수 기준 정규화 백분율이다. 실제 앱은 작업자가 이미지를 확인하여 추가 조정한다.

| 위치 | x | y |
| --- | ---: | ---: |
| 우편·생활 | 18% | 34% |
| 재활용 물질 | 50% | 25% |
| 극성 탑 | 80% | 40% |
| 수조·운반 | 69% | 67% |
| 시민 공방 | 23% | 65% |
| 중앙 코어 | 50% | 50% |
| 남쪽 시작점 | 50% | 90% |

## 소품 atlas

원본 최종본 `props-sheet-packed.png`, 런타임 `props-sheet.webp`. 1536×1024 = 512×512 정사각 3열×2행. 최초 결과의 수레 손잡이가 셀 경계를 침범한 것을 확인해 imagegen으로 전체 소품의 안전 여백을 재편집했다. 최종 >20 알파 픽셀 기준 최소 안전 여백은 23px다. 최초·알파편집·패킹편집 원본을 모두 보존했다.

| 순서 | 개별 런타임 파일 | 좌표(x,y,w,h) |
| --- | --- | --- |
| 0 | prop-postal-box.webp | 0,0,512,512 |
| 1 | prop-postal-lid.webp | 512,0,512,512 |
| 2 | prop-book.webp | 1024,0,512,512 |
| 3 | prop-cart.webp | 0,512,512,512 |
| 4 | prop-aquarium.webp | 512,512,512,512 |
| 5 | prop-parcel.webp | 1024,512,512,512 |

빈 상자·뚜껑·책·수레·유리 수조·소포만 그렸다. 자석이나 힘의 결과는 이미지에 고정하지 않았다. 물질·접촉·비접촉 실험 판정은 코드에서 제어한다.

## 검수

- 지도: 길 연결·5개 다른 건물·남쪽 진입·중앙 코어·무문자·별도 캐릭터 확인.
- 실내 5종: 동일 시각 언어, 활동 작업대 비어 있음, 배경 장식은 주로 위쪽, 글자/UI/캐릭터 없음 확인.
- 소품: 3×2 정렬·개별 오브젝트·진짜 투명 알파·알파 합성 확인.
- SHA-256/크기/알파 통계는 `assets/source/quest/asset-manifest.json` 기록.
- 실제 앱 반영·태블릿 조작·학습 판정 통합 검수는 루트 구현 담당에서 수행.

## 패킹 보정 프롬프트

```text
Edit this sprite atlas for safe game texture packing. Keep its exact 1536x1024 canvas, exactly the six existing objects and polished style, REAL transparent alpha background, no painted background. The atlas has exact 512x512 cells, three columns and two rows. Current handle of the BOTTOM LEFT CART protrudes a little into the aquarium cell. Fix packing ONLY: scale every object down to 82% of its current visible size around its cell center, then center it inside its own 512x512 cell. Every visible pixel for each object must be at least 32 px away from all four edges of its own cell. All six silhouettes fully inside the correct cells, absolutely no crossing cell boundaries, no cropping, no missing handles or edges. TOP LEFT box body; TOP MIDDLE lid; TOP RIGHT book; BOTTOM LEFT cart; BOTTOM MIDDLE glass aquarium; BOTTOM RIGHT parcel. Keep each object's shape, perspective, colors, details and identity unchanged. The CART's entire handle must remain inside bottom left x=0..511 region. The aquarium must have no little pieces from its neighbor on its left. Real transparent alpha around and between props, and translucent glass. No new objects, magnets, labels, text, border, glows, shadows, ground plane, background, checkerboard art. This is production sprite layout correction, not redesign.
```

## 최종 프롬프트

### city

```text
Use case: stylized-concept. Asset type: production background for a high-quality elementary science adventure game, one continuous scene, landscape 16:9, 2048x1152 if possible.
Create a premium handcrafted 2.5D illustrated JRPG town exploration map of a lively MAGNET SCIENCE CITY. A coherent inviting small city, NOT a forest world. Camera gently overhead about 30 degrees, readable walkable ground plane. Rich delicate hand-painted detail with polished soft volumetric shapes, fine subtle texture, sophisticated cream sandstone, terracotta, muted coral red and cobalt blue accents, luminous honey daylight, warm shadows. High-end Nintendo storybook RPG environment quality, imaginative functional architecture, never plastic generic mobile game icons.
Layout is an explicit production map: leave generous continuous broad cream stone sidewalks joining every location so a separate player character can walk the routes. Five distinct large buildings form an open loop around a central plaza. The entrance/door interaction locations are approximately these normalized coordinates: charming life/post office and library at (25%,30%); recycling-materials laboratory at (51%,18%); red-and-blue polarity repair tower at (80%,30%); glass aquarium and remote transport depot at (80%,70%); citizen invention workshop at (26%,73%). A central circular magnet-city power core/plaza is at (52%,52%). Keep building silhouettes behind their approach path rather than blocking the path. Connect these door locations to the central plaza and to each other with broad continuous simple meandering cream stone paths. Southern spawn plaza at (50%,90%) connects clearly to lower loop and center. Paths occupy substantial visible area (about 40% of ground), pathways remain empty.
City-specific edge dressing: short brick retaining walls, low canal bridge, tiny street lamps, planters, pipes and aerial copper cables, charming shop awnings, small rooftops. Aquarium's water glows clear cyan; workshop shows a beautiful copper gear sign with no letters; post office has a simple envelope symbol (no writing); recycling lab has bins and colored material storage; tower has a red and blue U-shaped architectural arch with NO letters. Core is a clean circular pedestal with a warm glowing mechanical flower-shaped assembly. Keep important buildings all entirely in frame with breathing room. Full bleed environment to edges, no floating island, no white surround, no panels.
No people, no animal characters, no mascots, no crowds. Do not bake any player character into the image. No text, no letters, no numbers, no labels, no logos, no buttons, no UI, no arrows, no dotted routes, no watermark, no black outlines around tile borders. Not a collage or contact sheet.
```

### stage-life

```text
Use case: stylized-concept. Production game background asset, ONE scene, wide landscape 16:9, 2048x1152 if possible. This is a room in a high-end handcrafted magnet science city, premium warm 2.5D storybook JRPG environment. Cream sandstone walls, navy-blue glazed roof trim, warm honey amber light, carefully rendered copper/brass pipes and curved wooden furniture, subtle nuanced brush texture, confident natural lighting, sophisticated coherent palette of cream/gold/soft coral/cobalt. Grounded believable elementary science workshop, adventurous and charming but never babyish. Camera looks gently down into room from front at about 25 degrees. NO people, NO mascots/characters, NO humanoids. Player character and interactive objects are rendered separately by game.
VERY IMPORTANT composition for usable game activity: central 65% of image must be an empty, unmarked, continuous polished warm honey wood tabletop/working surface, spanning x=18%..88%, y=30%..87%. No objects, gadgets, tools, cups, lamps or loose paper covering that central working surface. The empty surface is naturally integrated into real furniture, softly illuminated with a subtle visible woodgrain and gentle shadows at outer edges. It is not a white card, blank grid, giant monitor, UI panel, diagram, cutout white rectangle, or framed board. Scene storytelling and rich detailed thematic decoration appears around the left/right/back perimeter, behind the table, and at the extreme edges, keeping the activity center completely clear. Foreground corner detail allowed only in outer 10%. Full bleed art with no border.
No text, labels, numbers, letter-like markings, writing, UI, buttons, watermark, arrows, instructional diagrams. Do not paint any magnets or scientific result demonstrations on the blank worktable.
Scene: the magnet city's neighborhood postal sorting office with a connected library nook. Warm curved postal cubby shelving with closed rolled parcels and envelopes near the BACK LEFT wall, a small red mail dropbox at extreme far left, beautiful neat books and a brass desk lamp at extreme back right, stained-glass window motif of a simple envelope without writing. Copper mail-delivery tubes curve across the top wall. Quiet cozy brass-and-wood public-service office. The empty tabletop in the center is the surface where students will build and test box closure and a bookmark. Do NOT place the box or bookmark in the picture; those will be interactive objects.
```

### stage-material

```text
Use case: stylized-concept. Production game background asset, ONE scene, wide landscape 16:9, 2048x1152 if possible. This is a room in a high-end handcrafted magnet science city, premium warm 2.5D storybook JRPG environment. Cream sandstone walls, navy-blue glazed roof trim, warm honey amber light, carefully rendered copper/brass pipes and curved wooden furniture, subtle nuanced brush texture, confident natural lighting, sophisticated coherent palette of cream/gold/soft coral/cobalt. Grounded believable elementary science workshop, adventurous and charming but never babyish. Camera looks gently down into room from front at about 25 degrees. NO people, NO mascots/characters, NO humanoids. Player character and interactive objects are rendered separately by game.
VERY IMPORTANT composition for usable game activity: central 65% of image must be an empty, unmarked, continuous polished warm honey wood tabletop/working surface, spanning x=18%..88%, y=30%..87%. No objects, gadgets, tools, cups, lamps or loose paper covering that central working surface. The empty surface is naturally integrated into real furniture, softly illuminated with a subtle visible woodgrain and gentle shadows at outer edges. It is not a white card, blank grid, giant monitor, UI panel, diagram, cutout white rectangle, or framed board. Scene storytelling and rich detailed thematic decoration appears around the left/right/back perimeter, behind the table, and at the extreme edges, keeping the activity center completely clear. Foreground corner detail allowed only in outer 10%. Full bleed art with no border.
No text, labels, numbers, letter-like markings, writing, UI, buttons, watermark, arrows, instructional diagrams. Do not paint any magnets or scientific result demonstrations on the blank worktable.
Scene: the magnet city's artisan recycling materials testing laboratory. Clean sorted storage bins around BACK perimeter, trays of wood blocks, glass bottles and metal hardware on rear shelving only. A small glass-fronted materials cabinet at far right, simple stone sink extreme left, terracotta roof beams and brass material conveyor in background. No hazard, no chemicals, no flames. Central broad clean unmarked real wooden material sorting worktable is completely empty for separate draggable items. Use clear glass, cardboard, wood, rubber and iron textures only in perimeter stored items, never grouped as an instructional diagram.
```

### stage-poles

```text
Use case: stylized-concept. Production game background asset, ONE scene, wide landscape 16:9, 2048x1152 if possible. This is a room in a high-end handcrafted magnet science city, premium warm 2.5D storybook JRPG environment. Cream sandstone walls, navy-blue glazed roof trim, warm honey amber light, carefully rendered copper/brass pipes and curved wooden furniture, subtle nuanced brush texture, confident natural lighting, sophisticated coherent palette of cream/gold/soft coral/cobalt. Grounded believable elementary science workshop, adventurous and charming but never babyish. Camera looks gently down into room from front at about 25 degrees. NO people, NO mascots/characters, NO humanoids. Player character and interactive objects are rendered separately by game.
VERY IMPORTANT composition for usable game activity: central 65% of image must be an empty, unmarked, continuous polished warm honey wood tabletop/working surface, spanning x=18%..88%, y=30%..87%. No objects, gadgets, tools, cups, lamps or loose paper covering that central working surface. The empty surface is naturally integrated into real furniture, softly illuminated with a subtle visible woodgrain and gentle shadows at outer edges. It is not a white card, blank grid, giant monitor, UI panel, diagram, cutout white rectangle, or framed board. Scene storytelling and rich detailed thematic decoration appears around the left/right/back perimeter, behind the table, and at the extreme edges, keeping the activity center completely clear. Foreground corner detail allowed only in outer 10%. Full bleed art with no border.
No text, labels, numbers, letter-like markings, writing, UI, buttons, watermark, arrows, instructional diagrams. Do not paint any magnets or scientific result demonstrations on the blank worktable.
Scene: the magnet city's elegant polarity repair tower inside. Tall curved arched windows reveal blue sky, sophisticated red and cobalt enamel mechanical wall panels at BACK, a pair of large red/blue storage towers at outer edges, round brass suspended pulleys and neat coils on rear wall, polished brass arch details and precise handtools stored far left. No electric hazards. Center is a completely empty broad honey wood worktable for separately controlled magnets and a ring levitation test, with no scientific demonstration shown. Maintain lovely repair atelier atmosphere, highly readable empty center.
```

### stage-remote

```text
Use case: stylized-concept. Production game background asset, ONE scene, wide landscape 16:9, 2048x1152 if possible. This is a room in a high-end handcrafted magnet science city, premium warm 2.5D storybook JRPG environment. Cream sandstone walls, navy-blue glazed roof trim, warm honey amber light, carefully rendered copper/brass pipes and curved wooden furniture, subtle nuanced brush texture, confident natural lighting, sophisticated coherent palette of cream/gold/soft coral/cobalt. Grounded believable elementary science workshop, adventurous and charming but never babyish. Camera looks gently down into room from front at about 25 degrees. NO people, NO mascots/characters, NO humanoids. Player character and interactive objects are rendered separately by game.
VERY IMPORTANT composition for usable game activity: central 65% of image must be an empty, unmarked, continuous polished warm honey wood tabletop/working surface, spanning x=18%..88%, y=30%..87%. No objects, gadgets, tools, cups, lamps or loose paper covering that central working surface. The empty surface is naturally integrated into real furniture, softly illuminated with a subtle visible woodgrain and gentle shadows at outer edges. It is not a white card, blank grid, giant monitor, UI panel, diagram, cutout white rectangle, or framed board. Scene storytelling and rich detailed thematic decoration appears around the left/right/back perimeter, behind the table, and at the extreme edges, keeping the activity center completely clear. Foreground corner detail allowed only in outer 10%. Full bleed art with no border.
No text, labels, numbers, letter-like markings, writing, UI, buttons, watermark, arrows, instructional diagrams. Do not paint any magnets or scientific result demonstrations on the blank worktable.
Scene: the magnet city's aquarium transport maintenance depot. Elegant cyan fish aquarium in back LEFT, at extreme right a small maintenance rail, neatly parked empty wooden delivery cart and rope pulley in back, copper pipework with seafoam and blue glazed tile perimeter, round windows with blue daylight. The aquarium is architectural rear scenery with a few tiny normal fish, NOT foreground. The main central honey wood tabletop is entirely empty and unobstructed, no glass aquarium or cart on that table: real controllable experimental aquarium and cart are separate game objects. Beautiful marine repair atelier, no water spills, no people.
```

### stage-workshop

```text
Use case: stylized-concept. Production game background asset, ONE scene, wide landscape 16:9, 2048x1152 if possible. This is a room in a high-end handcrafted magnet science city, premium warm 2.5D storybook JRPG environment. Cream sandstone walls, navy-blue glazed roof trim, warm honey amber light, carefully rendered copper/brass pipes and curved wooden furniture, subtle nuanced brush texture, confident natural lighting, sophisticated coherent palette of cream/gold/soft coral/cobalt. Grounded believable elementary science workshop, adventurous and charming but never babyish. Camera looks gently down into room from front at about 25 degrees. NO people, NO mascots/characters, NO humanoids. Player character and interactive objects are rendered separately by game.
VERY IMPORTANT composition for usable game activity: central 65% of image must be an empty, unmarked, continuous polished warm honey wood tabletop/working surface, spanning x=18%..88%, y=30%..87%. No objects, gadgets, tools, cups, lamps or loose paper covering that central working surface. The empty surface is naturally integrated into real furniture, softly illuminated with a subtle visible woodgrain and gentle shadows at outer edges. It is not a white card, blank grid, giant monitor, UI panel, diagram, cutout white rectangle, or framed board. Scene storytelling and rich detailed thematic decoration appears around the left/right/back perimeter, behind the table, and at the extreme edges, keeping the activity center completely clear. Foreground corner detail allowed only in outer 10%. Full bleed art with no border.
No text, labels, numbers, letter-like markings, writing, UI, buttons, watermark, arrows, instructional diagrams. Do not paint any magnets or scientific result demonstrations on the blank worktable.
Scene: the magnet city's citizen invention workshop. Polished and imaginative copper gearwork only along back wall, a simple large gear emblem high at back with no letters, organized tools and wooden part drawers in rear corners, beautiful warm forge-like orange lamp light but NO actual fire, cobalt window panes and red upholstered stool near far right edge. A few charming small civic invention prototypes, e.g. little pulley wheel and parcel elevator, on the BACK WALL shelf only. The large central broad warm wood workbench stays entirely empty, ready for the student to assemble an invention using separate game objects. Rich wonderful maker atelier but grounded and uncluttered.
```

### props-sheet

```text
Use case: stylized-concept. Asset type: TRANSPARENT game object sprites in a strictly aligned 3-column by 2-row sprite atlas, 3:2 aspect ratio, 1536x1024 if possible. One sheet with exactly SIX separate game props, each entirely inside its own equal square cell. Transparent empty background with real alpha. There are NO visible cell borders, NO grid lines, NO backgrounds, NO contact sheet labels, NO text, NO numbers, NO watermarks, NO drop-shadow plate or floor. Each object centered, very generous 12% transparent padding from every cell edge, each object fully visible and never touching another cell. Avoid extreme perspective. Soft elevated frontal 3/4 view (a little visible top) consistent across props.
Art style: premium handcrafted warm 2.5D storybook JRPG props matching a sophisticated magnet science city: rounded polished forms, honey wood, cream sandstone, navy/coral accent, fine brass edgework, subtle detailed painterly texture and beautiful dimensional light. High-end commercial game sprites, charming but not baby toys. Thin natural edge definition, no thick cartoon black outline.
Six cells MUST be exactly, reading left to right across top row then bottom row:
TOP LEFT: an open-topped rectangular honey-wood postal sorting box BODY, front and top visible, low sides, polished brass corner protectors, two tiny hinge attachments at back, EMPTY interior, no lid, NO magnet, NO clasp, NO writing.
TOP MIDDLE: its detached flat rectangular honey wood hinged LID only, matching size and wood grain, thin brass rim and hinge pair at rear edge, gently angled so upper face visible. NO box body, NO magnet, NO clasp, no logo, no decoration beyond brass cornerwork.
TOP RIGHT: one partly opened story book, navy blue cover with small brass corner protectors and thick clean cream blank pages, no writing or illustrations or bands, NO bookmark, NO magnet.
BOTTOM LEFT: a small side-on friendly postal delivery CART, honey wood open cargo bed, four dark rounded wheels and copper axle details, short handle, EMPTY bed, NO parcels, NO motor, NO magnet, no writing.
BOTTOM MIDDLE: a small clear glass tabletop AQUARIUM FRAME / empty rectangular glass tank, clean transparent glass walls and thin brushed brass corner edges, empty, NO water, NO fish, NO objects inside, through glass truly transparent where appropriate. Broad front face, slightly top visible. No base table.
BOTTOM RIGHT: one honey-wood parcel CRATE with coral diagonal ribbon, closed rectangular form, simple clean beveled edges and brass corner pins, no text, no icons, no magnets.
Treat sprites as functional interactive objects: no decorative sparkles, no motion streaks, no science diagrams, no colored poles, no horseshoe magnets, no embedded physics effects. All six objects separate and same family.
```

### props-sheet_alpha

```text
Edit the provided image. Use case: background-extraction. The image is a 1536x1024 sprite atlas with six props. REMOVE ALL brown, cream, gray and black background and the large glows, replacing it with REAL fully transparent alpha (0 opacity). Strict object cutouts, transparent everywhere outside the six silhouettes, genuine alpha not checkerboard art. Keep the exact original image dimensions, exact equal 3x2 grid locations and the exact visual identity, position, scale, pose, lighting, colors and shape of all six props. Keep all six objects completely separate with original padding. Clean antialiasing at sprite edges. Preserve brass, wooden parts, pages and glass frames. For the aquarium sprite bottom middle, its glass should be translucent with alpha so background can be seen through the glass. Remove dark reflected background from inside the glass. Do not replace wood or white book pages with transparency. Do NOT introduce any background, drop shadow, glow, ground plane, text, letters, icons, magnets or other new objects. This is game sprite background extraction only.
```

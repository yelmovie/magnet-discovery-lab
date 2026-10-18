# TRD — 밀고 당기는 도시 (Push Pull City)

- 문서 버전: 1.0
- Repository: `push-pull-city`
- Topic ID: `topic-09-magnet`
- 대상: 태블릿 우선 웹앱/PWA
- 화면: 10
- Stage: 5
- 3D 핵심 화면: 01, 06, 09, 10
- 핵심 엔진: Vite + TypeScript + Three.js + Phaser + HTML/CSS/SVG
- 저장: IndexedDB 우선
- 목표 성능: 저사양 태블릿 30fps 우선

## 1. 기술 목표

1. 4학년 학생이 태블릿에서 자연스럽게 조작할 수 있는 터치 우선 구조.
2. 3D는 Page 01, 06, 09, 10에서 학습상 필요한 범위로만 사용.
3. 자기력을 정밀 물리로 오해시키지 않는 교육용 규칙 기반 시뮬레이션.
4. 앞 화면의 실험 데이터가 뒤 화면의 증거·설계 데이터로 연결.
5. Science World 허브에서 독립 단원 모듈로 지연 로딩 가능.
6. 백엔드 없이도 단독 실행·저장 가능.
7. 허브 연동 시 단원은 `MissionResult`만 반환하고 보상 확정은 상위 서비스에 위임.
8. 화면 전환 때 Three.js/Phaser/DOM 이벤트와 GPU 자원을 완전히 정리.

## 2. 권장 기술 스택

```text
Vite
TypeScript
Three.js
Phaser 3
HTML / CSS
SVG
IndexedDB
Web Audio API
PWA / Service Worker
```

### 역할 분리

- **Three.js:** Page 01, 06, 09, 10
- **Phaser:** Page 02, 03, 04, 05, 07, 08
- **HTML/CSS/SVG:** 모든 한글 텍스트, 헤더, 기록판, 버튼, 카드, 접근성 UI
- **IndexedDB:** 진행도, 실험 기록, 설계, 테스트 이력
- **Web Audio:** BGM/SFX
- **Service Worker:** 앱 셸과 저용량 필수 자산만 캐시

대형 물리 엔진은 필수 의존성으로 두지 않는다. 교육용 자석 상호작용은 `MagnetRuleEngine`으로 처리하고 이동은 tween, constrained motion, 간단한 충돌 로직으로 표현한다.

## 3. 권장 프로젝트 구조

Science World 통합 시:

```text
apps/web/src/lessons/topic-09-magnet/
├─ index.ts
├─ MagnetLesson.ts
├─ routes.ts
├─ config/
│  ├─ lesson.manifest.json
│  ├─ stages.json
│  ├─ materials.json
│  ├─ magnet-rules.json
│  ├─ devices.json
│  ├─ inventor-problems.json
│  └─ quality.json
├─ scenes/
│  ├─ DeviceDissectionScene.ts
│  ├─ OnOffCompareScene.ts
│  ├─ MaterialLabScene.ts
│  ├─ DistanceLabScene.ts
│  ├─ PoleDeductionScene.ts
│  ├─ RingGeneratorScene.ts
│  ├─ AquaCleaningScene.ts
│  ├─ MagnetCartScene.ts
│  ├─ InventorBuilderScene.ts
│  └─ ProductTestScene.ts
├─ components/
│  ├─ MagnetManipulator/
│  ├─ ObservationNotebook/
│  ├─ PredictionPanel/
│  ├─ PoleLabeler/
│  ├─ DeviceViewer3D/
│  ├─ RingStacker3D/
│  ├─ DesignWorkbench3D/
│  └─ TestReport/
├─ systems/
│  ├─ MagnetRuleEngine.ts
│  ├─ MaterialReactionSystem.ts
│  ├─ PoleDeductionSystem.ts
│  ├─ AquaCouplingSystem.ts
│  ├─ CartPuzzleSystem.ts
│  ├─ DesignValidationSystem.ts
│  ├─ ProductTestEngine.ts
│  ├─ ProgressSystem.ts
│  └─ LessonAudioSystem.ts
├─ state/
│  ├─ magnetLessonStore.ts
│  ├─ persistence.ts
│  └─ migrations.ts
├─ contracts/
│  ├─ MagnetLessonState.ts
│  ├─ ExperimentRecord.ts
│  ├─ DeviceDesign.ts
│  └─ MissionResult.ts
└─ ui/
   ├─ overlays/
   ├─ modals/
   └─ styles/
```

단독 Repository라면 위 내용을 `src/` 아래로 평탄화할 수 있다.

## 4. 화면 모드 매트릭스

| Page | 화면명 | 렌더링 | 엔진 | 3D 필수도 |
|---|---|---|---|---|
| 01 | 도시 물건 해부실 | 실시간 3D 고정 작업대 | Three.js | 핵심 |
| 02 | 자석 ON/OFF 비교실 | 2.5D UI | Phaser + DOM | 불필요 |
| 03 | 재료 반응 실험대 | 2D 실험 | Phaser | 불필요 |
| 04 | 거리와 힘 실험대 | 2D 실험 | Phaser + DOM | 불필요 |
| 05 | 극 추리 실험실 | 2.5D 실험 | Phaser | 불필요 |
| 06 | 부유 고리 발전기 | 실시간 3D | Three.js | 핵심 |
| 07 | 아쿠아 청소 구조실 | 2.5D 레이어 | Phaser | 불필요 |
| 08 | 무접촉 카트 제어실 | 아이소메트릭 2.5D | Phaser | 권장 |
| 09 | 발명 설계실 | 실시간 3D 작업대 | Three.js | 핵심 |
| 10 | 작동 시험실 | 실시간 3D 테스트 챔버 | Three.js | 핵심 |

## 5. 전역 상태 모델

```ts
type ScreenId =
  | "screen-01-dissection"
  | "screen-02-onoff"
  | "screen-03-material"
  | "screen-04-distance"
  | "screen-05-poles"
  | "screen-06-rings"
  | "screen-07-aqua"
  | "screen-08-cart"
  | "screen-09-design"
  | "screen-10-test";

interface MagnetLessonState {
  schemaVersion: "1.0.0";
  lessonId: "topic-09-magnet";
  currentScreen: ScreenId;
  unlockedStage: 1 | 2 | 3 | 4 | 5;
  completedScreens: ScreenId[];
  stageStars: Record<1 | 2 | 3 | 4 | 5, 0 | 1 | 2 | 3>;

  deviceInvestigations: DeviceInvestigation[];
  experimentRecords: ExperimentRecord[];
  poleRecords: PoleRecord[];
  ringRuns: RingRun[];
  aquaRuns: AquaRun[];
  cartRuns: CartRun[];

  design?: DeviceDesign;
  testRuns: ProductTestRun[];

  misconceptionFlags: MisconceptionFlag[];
  hintCount: number;
  retryCount: number;
  finalCoreUnlocked: boolean;
  updatedAt: string;
}
```

## 6. 핵심 데이터 계약

### 6.1 재료

```ts
type MaterialId =
  | "iron"
  | "aluminum"
  | "plastic"
  | "wood"
  | "rubber"
  | "glass"
  | "paper";

interface MaterialSpec {
  id: MaterialId;
  labelKo: string;
  magnetic: boolean;
  appearanceTags: string[];
}
```

`magnetic`는 이 단원에 등장하는 교육용 샘플 물체의 판정값이다. 복합제품 전체를 재료 이름만으로 일반화하지 않는다.

### 6.2 자석

```ts
type MagnetPole = "N" | "S";

interface MagnetSpec {
  id: string;
  kind: "bar" | "ring" | "disc" | "horseshoe" | "module";
  poles: {
    a: MagnetPole;
    b: MagnetPole;
  };
  strengthProfileId: string;
}
```

### 6.3 상호작용 결과

```ts
type MagnetInteractionType = "attract" | "repel" | "none";

interface MagnetInteractionResult {
  type: MagnetInteractionType;
  visualStrength: 0 | 1 | 2 | 3;
  reason:
    | "magnet_magnetic_object"
    | "same_poles"
    | "different_poles"
    | "nonmagnetic_object"
    | "too_far_for_game_profile";
}
```

`visualStrength`는 내부 애니메이션 강도용이다. 학생에게 N, mT, 실제 힘 수치로 노출하지 않는다.

## 7. MagnetRuleEngine

정밀 전자기학 계산 대신 초등 학습용 상태 판정 엔진을 사용한다.

```ts
interface MagnetRuleInput {
  source: MagnetSpec;
  target:
    | { type: "material"; spec: MaterialSpec }
    | { type: "magnet"; spec: MagnetSpec; facingPole: MagnetPole };
  sourceFacingPole?: MagnetPole;
  distanceBand: "near" | "slightly_apart" | "far";
  barrier?: "none" | "paper" | "thin_plastic" | "thin_glass";
}
```

판정 원칙:
1. 자석 ↔ 자성 물체: `attract`
2. 자석 ↔ 비자성 물체: `none`
3. 자석 ↔ 자석, 같은 극: `repel`
4. 자석 ↔ 자석, 다른 극: `attract`
5. 얇은 비자성 판은 그 자체가 상호작용을 단순 ON/OFF하는 정답 스위치가 아니다.
6. 거리가 증가하면 게임 프로필상 반응 연출이 약해지거나 사라질 수 있으나 정량 법칙처럼 설명하지 않는다.
7. `far` 임계값은 Page별 조작 밸런스 값으로 관리한다.

## 8. 단원 상태 흐름

```text
Stage 1
01 Device Dissection
→ 02 ON/OFF Compare
→ Stage Complete

Stage 2
03 Material Lab
→ 04 Distance Lab
→ Stage Complete

Stage 3
05 Pole Deduction
→ 06 Ring Generator
→ Stage Complete

Stage 4
07 Aqua Cleaning
→ 08 Magnet Cart
→ Stage Complete

Stage 5
09 Inventor Builder
→ 10 Product Test
→ FINAL
→ MissionResult
→ Science World Hub
```

Stage 내 화면은 순차 해금한다. 완료 화면은 재진입 가능하다. Page 09 설계는 Page 10으로 동일 ID와 transform을 유지해 전달한다.

## 9. EventBus 계약

```ts
type MagnetLessonEvent =
  | { type: "DEVICE_INVESTIGATED"; deviceId: string }
  | { type: "DEVICE_CAUSE_CONFIRMED"; deviceId: string }
  | { type: "EXPERIMENT_RECORDED"; recordId: string }
  | { type: "MATERIAL_RULE_INFERRED"; ruleId: string }
  | { type: "POLE_TEST_COMPLETED"; testId: string }
  | { type: "POLE_IDENTIFIED"; magnetId: string }
  | { type: "RING_RUN_COMPLETED"; runId: string }
  | { type: "AQUA_RUN_COMPLETED"; runId: string }
  | { type: "CART_RUN_COMPLETED"; runId: string }
  | { type: "DESIGN_UPDATED"; designId: string }
  | { type: "PRODUCT_TEST_COMPLETED"; runId: string }
  | { type: "DESIGN_REVISED"; designId: string }
  | { type: "STAGE_COMPLETED"; stage: number }
  | { type: "LESSON_COMPLETED"; result: MissionResult };
```

Three.js/Phaser Scene은 전역 DOM을 직접 조작하지 않고 EventBus와 Store를 통해 UI와 상태를 연결한다.

## 10. Page 01 — DeviceDissectionScene (3D)

### 카메라
- PerspectiveCamera
- 3/4 기본 시점
- OrbitControls 또는 커스텀 제한 회전
- pan 비활성화
- 수평 회전 약 ±70°
- 수직 회전 약 ±25°
- pinch zoom 제한

### 입력
- 1 finger drag: 물건 회전
- pinch: zoom
- hotspot tap: 문/덮개/가동 부품
- marker drag: 예상 자석 위치
- reset view: 기본 카메라

### 모델 구조

```text
DeviceRoot
├─ Body
├─ MovablePart
├─ MagnetAnchorA
├─ MagnetAnchorB
├─ InteractionHotspots
└─ OptionalXrayGroup
```

### X-ray
실시간 clipping/boolean 반복 계산보다 외피 투명화 또는 모델 variant를 우선한다.

### 완료 조건
- 2개 이상 장치 조사
- 각 장치 사용 동작 1회 이상
- 자석 위치 추론
- 기능-위치 근거 1개 이상

## 11. Page 02 — OnOffCompareScene

```ts
interface DeviceStateCompare {
  deviceId: string;
  stateA: "magnet_on";
  stateB: "magnet_off";
  observedEffects: string[];
  selectedCauseId?: string;
}
```

두 상태를 모두 재생하기 전에는 제출을 비활성화한다. Page 01의 `deviceInvestigations`에서 장치 정보를 읽는다.

## 12. Page 03 — MaterialReactionSystem

세션 구성:
- 철 물체 2개 이상
- 비자성 비금속 2개 이상
- 알루미늄 등 `금속처럼 보이는 비자성 예시` 1개 이상
- 총 6~8개

반응 애니메이션:
- attract: 짧은 흔들림 → 자석 방향 이동
- none: 과장된 실패 연출 없이 움직임 없음 + 관찰 강조

예측은 학습 기록용이며 정답 점수 패널티로 사용하지 않는다.

## 13. Page 04 — DistanceLabScene

### 거리 구간

```ts
type DistanceBand = "near" | "slightly_apart" | "far";
```

숫자 단위 대신 시각 레일과 한국어 라벨을 사용한다.

### 배리어

```ts
type BarrierType = "none" | "paper" | "thin_plastic" | "thin_glass";
```

배리어는 단원에서 다루는 얇은 비자성 판 예시다. `판이 있으면 무조건 힘이 차단된다`는 규칙으로 구현하지 않는다.

### 기록

```ts
interface ExperimentRecord {
  id: string;
  screen: "screen-03-material" | "screen-04-distance";
  targetId: string;
  prediction?: string;
  result: "attract" | "repel" | "none";
  distanceBand?: DistanceBand;
  barrier?: BarrierType;
  createdAt: string;
}
```

## 14. Page 05 — PoleDeductionSystem

미지 자석은 중립 외관으로 하여 색으로 극을 추측할 수 없게 한다.

```ts
interface PoleTest {
  referenceMagnetId: string;
  referencePole: MagnetPole;
  unknownMagnetId: string;
  unknownEnd: "a" | "b";
  result: "attract" | "repel";
}
```

난이도:
- 미지 자석 4개
- 기본 허용 테스트 8회
- 6회 이하 완료 시 효율 보너스
- 초과해도 계속 진행

첫 실험에서 정답 극을 공개하지 않는다. 마지막 라벨 제출 때 판정한다.

## 15. Page 06 — RingGeneratorScene (3D)

정밀 rigid-body 부상 계산 대신 상태 기반 레이아웃.

```ts
interface RingState {
  ringId: string;
  orientation: 0 | 180;
  topPole: MagnetPole;
  bottomPole: MagnetPole;
  slotIndex: number;
}
```

인접 고리 판정:
- 마주 보는 극 같음 → `repelGap`
- 마주 보는 극 다름 → `contact`
- 잘못된 슬롯/충돌 → snap back

애니메이션:
- contact: ease-in snap
- repelGap: spring-like tween
- 최대 고리 5개
- 카메라는 3/4 고정에 가까운 제한 회전

## 16. Page 07 — AquaCouplingSystem

2개 레이어:
- 외부 조종 자석
- 내부 청소 패드

```ts
interface AquaCouplingState {
  connected: boolean;
  couplingScore: number;
  cleanCoverage: number;
  separationCount: number;
  pointerSpeed: number;
}
```

`couplingScore`는 게임 내부 조작 안정도이며 실제 자력 물리량으로 노출하지 않는다.

청소 판정:
- offscreen canvas에 cleaning mask
- 청소 패드 brush가 지나간 영역 제거
- coverage 퍼센트 계산
- 목표 90% 이상

## 17. Page 08 — CartPuzzleSystem

아이소메트릭 grid 기반.

```ts
type TileType =
  | "road"
  | "wall"
  | "pit"
  | "goal"
  | "metal_gate"
  | "safe_zone";

interface CartState {
  cell: { x: number; y: number };
  facingPole: MagnetPole;
  velocityState: "idle" | "moving";
}
```

입력:
- 조종 자석을 카트 주변 anchor에 drag
- 자석 orientation 180° flip
- 첫 실패 전에는 힘 방향 정답 preview를 제공하지 않음

퍼즐:
- 각 구간 2~4단계 행동
- 적어도 한 구간은 장애물 선행 이동
- 전체 정답 경로 자동 표시 금지
- 2개 이상의 학습적으로 타당한 해결 경로 허용

## 18. Page 09 — InventorBuilderScene (3D)

완전 자유 CAD 대신 anchor/snap 기반 모듈 조립.

### 부품 계약

```ts
interface PartDefinition {
  id: string;
  category:
    | "body"
    | "cover"
    | "handle"
    | "wheel"
    | "plate"
    | "rod"
    | "sponge"
    | "string"
    | "magnet";
  allowedAnchors: string[];
  maxCount: number;
}
```

### 배치 데이터

```ts
interface PlacedPart {
  instanceId: string;
  partId: string;
  anchorId?: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  magnet?: {
    poleForward: MagnetPole;
    poleBackward: MagnetPole;
  };
}
```

터치:
- tap: 선택
- drag: 작업대/anchor 이동
- 회전 버튼 또는 two-finger: 90° step rotate
- magnet flip: 180°
- undo/redo

제한:
- 최대 동시 부품 8개
- 자유 스케일 금지
- 90° 기반 회전
- 충돌 불가능 배치 시 ghost warning
- 3D 텍스트 금지

## 19. Page 10 — ProductTestEngine (3D)

Page 09의 `DeviceDesign`을 그대로 로드한다.

```ts
interface DeviceDesign {
  id: string;
  problemId: string;
  intendedBehavior:
    | "magnet_to_iron"
    | "magnet_to_magnet_attract"
    | "magnet_to_magnet_repel";
  parts: PlacedPart[];
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

### 테스트 규칙

```ts
interface ProductTestRule {
  problemId: string;
  requiredRelations: Array<
    | {
        type: "magnet_near_magnetic_target";
        maxDistanceBand: "near" | "slightly_apart";
      }
    | {
        type: "facing_poles";
        relation: "same" | "different";
      }
    | {
        type: "magnet_anchor_present";
        anchorId: string;
      }
  >;
}
```

### 결과

```ts
interface ProductTestRun {
  id: string;
  designId: string;
  passed: boolean;
  checks: {
    id: string;
    passed: boolean;
    observationKo: string;
  }[];
  revisionIndex: number;
  createdAt: string;
}
```

실패 시 `정답 위치`를 공개하지 않는다. 작동하지 않은 관계만 알려 준다.

첫 시험 성공도 허용한다. 성공했다면 힘이 작용한 위치/관계를 표시해야 최종 제출할 수 있다.

## 20. Page 09 → 10 설계·테스트 연결

Page 09 → Page 10:
1. `DeviceDesign` 저장
2. schema validation
3. design snapshot ID 생성
4. test scene lazy load
5. 동일 transform으로 assembly recreate
6. TEST

Page 10 → Page 09 수정:
1. test result 저장
2. editor state 복원
3. 변경
4. `revisionIndex + 1`
5. 재시험

## 21. 오개념 감지

```ts
type MisconceptionFlag =
  | "ALL_METAL_MAGNETIC"
  | "SAME_POLES_ATTRACT"
  | "DIFFERENT_POLES_REPEL"
  | "COLOR_ONLY_POLE_GUESS"
  | "MAGNET_TOO_FAR_FROM_TARGET"
  | "DESIGN_NO_FUNCTIONAL_RELATION";
```

오개념은 벌점용이 아니라 후속 조작형 재실험을 선택하는 데 사용한다.

## 22. 저장 및 오프라인

IndexedDB 권장.

저장 시점:
- 각 Page 완료
- 실험 기록 추가
- 극 라벨 확정
- Ring run 완료
- Aqua/Cart run 완료
- Page 09 부품 변경 debounce 저장
- TEST 완료
- Stage 완료

```ts
interface PersistedEnvelope<T> {
  schemaVersion: string;
  savedAt: string;
  data: T;
}
```

localStorage는 음량, 모션 감소, quality profile 같은 작은 설정만 사용한다.

## 23. Science World 허브 계약

```ts
interface MissionResult {
  lessonId: "topic-09-magnet";
  attemptId: string;
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  metrics: {
    investigatedDevices: number;
    materialExperiments: number;
    poleTests: number;
    poleEfficiencyBonus: boolean;
    aquaSeparationCount: number;
    cartPuzzleRetries: number;
    designTestCount: number;
    designRevisionCount: number;
    hintCount: number;
  };
}
```

단원은 별/코어를 직접 지급하지 않는다. 상위 `RewardService`가 결과를 받아 보상을 확정한다.

## 24. 권장 에셋 정책

### 3D GLB
- `device_bookmark_magnet.glb`
- `device_tablet_cover_magnet.glb`
- `device_storage_latch_magnet.glb`
- `device_magnetic_holder.glb`
- `magnet_ring_redblue.glb`
- `generator_ring_rod.glb`
- `inventor_workbench.glb`
- `part_case.glb`
- `part_cover.glb`
- `part_handle.glb`
- `part_wheel.glb`
- `part_iron_plate.glb`
- `part_rod.glb`
- `part_sponge.glb`
- `part_string.glb`
- `part_magnet_module.glb`
- `test_chamber.glb`

### 2D/SVG
- material item sprites
- N/S pole labels
- observation notebook icons
- distance band markers
- aqua stain masks
- cart tiles
- evidence cards
- stage badges

모든 한글 제목/버튼/설명은 DOM/CSS/SVG로 표시한다.

## 25. 3D 좌표 규칙

Science World 공통 규칙과 맞춘다.

- Three.js 오른손 좌표계
- Y-up
- 이동 평면 X/Z
- 바닥 y=0
- 1 unit = 1 meter 취급
- 회전값은 radian

GLB pivot 보정은 원본 파일을 수정하지 않고 wrapper를 사용한다.

```text
EntityRoot
└─ VisualCorrectionGroup
   └─ ImportedGLB
```

Page 09 배치 데이터는 `EntityRoot` transform 기준으로 저장한다.

## 26. 성능 예산

저사양 태블릿 30fps 우선.

- pixel ratio cap:
  - low 1.0
  - medium 1.25
  - high 1.5
- 표시 triangles 권장:
  - Page 01: low 80k 이하
  - Page 06: low 60k 이하
  - Page 09/10: low 150k 이하
- 실시간 그림자:
  - low OFF
  - medium/high 핵심 광원 1개 이하
- postprocessing 기본 OFF
- HDR은 high 선택
- 대부분 텍스처 512/1024
- Page/Stage별 asset group lazy load
- 전체 3D 에셋 Service Worker precache 금지

Dispose 필수:
- `geometry.dispose()`
- `material.dispose()`
- `texture.dispose()`
- controls dispose
- RAF cancel
- resize/pointer listener 제거
- Phaser Scene shutdown/destroy
- audio node stop/disconnect

## 27. 터치 입력 규칙

- 최소 터치 영역 44px, 권장 48px
- hover 금지
- drag threshold 8~12px
- long press가 필요하면 500~650ms
- `touch-action: none`은 게임 viewport에만
- pinch 중 UI 버튼 오동작 방지
- 3D drag와 OrbitControls 동시 활성 금지
- 부품 선택 중 카메라 회전 잠금
- undo는 한 손가락으로 항상 접근 가능

## 28. 접근성

- N/S: 글자 + 형태 + 색
- 성공/실패: 아이콘 + 텍스트 + 모션
- 소리만으로 필수 정보 전달 금지
- 모션 감소 옵션
- BGM/SFX 개별 볼륨
- 주요 DOM control에 `aria-label`
- 3D hotspot의 DOM mirror 또는 순차 탐색 대체
- 색각에 의존하는 재료/극 판별 금지

## 29. 오디오

BGM:
- stage1: 도시 조사
- stage2: 실험 연구소
- stage3: 극성 발전소
- stage4: 원격 제어
- stage5: 발명 공방

SFX:
- attach
- repel
- rotate
- ring_float
- ring_snap
- aqua_clean
- coupling_break
- cart_move
- part_snap
- test_start
- test_success

첫 사용자 제스처 이후 AudioContext를 resume한다. 화면 전환 시 BGM 중복 인스턴스를 방지한다.

## 30. 오류/Fallback

- WebGL 불가: Page 01/06/09/10을 저사양 2.5D fallback 또는 최소 기능 모드로 제공
- 모델 로드 실패: proxy mesh + 기능 유지
- 오디오 실패: 무음 진행 가능
- IndexedDB 실패: session/local fallback + 저장 제한 안내
- portrait: 가로 회전 권장 안내, 필수 제출 기능은 막지 않음

## 31. QA

### 기능
- 10화면 진입/퇴장
- Stage 순차 해금
- 재접속 복원
- material reaction 판정
- pole rule 판정
- ring orientation
- aqua coverage
- cart multiple-solution
- Page 09 → 10 transform 동일성
- revision history
- MissionResult 생성

### 교육 QA
- 철이 아닌 모든 금속이 자석에 붙는 것처럼 표현하지 않는지
- 얇은 판이 자석 힘을 무조건 차단하는 것으로 표현하지 않는지
- 같은 극/다른 극 규칙이 정확한지
- 자기장/전자석을 필수 정답으로 요구하지 않는지
- 거리와 힘을 정밀 수치 법칙처럼 제시하지 않는지
- Page 10이 특정 하나의 발명품 정답만 강요하지 않는지
- 자석을 사용하지 않아도 통과하는 설계가 없는지

### 디바이스
- Android Chrome
- Samsung Internet 보조 확인
- iPad Safari
- Desktop Chrome
- 터치 + 마우스 양쪽

### 메모리 반복 테스트

```text
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 09 → 10
```

3회 반복 후 리소스 사용량이 회차마다 지속 증가하지 않는지 확인한다.

## 32. 개발 우선순위

### Vertical Slice
1. 공통 Store/EventBus/Persistence
2. Page 03 Material Lab
3. Page 05 Pole Deduction
4. Page 06 Ring Generator 3D
5. Page 09/10 최소 조립 → TEST 연결

검증:
- MagnetRuleEngine
- Phaser ↔ Three.js 전환
- 터치 회전/드래그
- Page 09 design serialization
- Page 10 recreation
- dispose
- 저장/복원

### 2차
Page 01, 02, 04

### 3차
Page 07, 08

### 4차
보상, 적응형 재실험, 최종 카드, 허브 계약

## 33. 완료 정의

- PRD의 5 Stage / 10 Page 구현
- Page 01, 06, 09, 10의 4개 핵심 3D 정상
- `MagnetRuleEngine` 단위 테스트
- 모든 필수 조작 터치 지원
- 모든 필수 학습 정보 텍스트 접근 가능
- low profile 30fps 목표
- Page별 lazy loading
- Scene dispose 확인
- IndexedDB 복원
- Page 09/10 설계 데이터 일치
- MissionResult 반환
- 유아형 단순 OX/짝맞추기만으로 Stage 통과 불가

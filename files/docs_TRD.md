# TRD — 밀고 당기는 도시 MVP

버전: 1.0 · 2026-09-23 · 구현 전 기술 설계

요구사항의 기준은 [PRD](PRD.md), 화면과 에셋의 기준은 [DESIGN](DESIGN.md)이다. 아래 디렉터리·타입·상수는 구현 계약이며 현재 생성된 앱 코드가 아니다.

## 1. 기술 구성

| 영역 | 선택 | 이유 |
|---|---|---|
| 개발·빌드 | Vite + TypeScript, strict | 기존 설계 방향 유지, 정적 웹 배포 |
| 게임 | Phaser 3 계열 | 도시 이동과 2D 상호작용을 한 게임 인스턴스로 관리 |
| UI | HTML/CSS, 필요한 단순 아이콘은 SVG | 읽기 쉬운 한글, 버튼·기록·인쇄·키보드 접근성 |
| 상태 | 타입이 있는 단일 Store와 command/reducer | 학습 상태를 장면 오브젝트와 분리 |
| 저장 | IndexedDB, 작은 저장소 모듈 | 진행·실험·설계 데이터를 비동기 트랜잭션으로 저장 |
| 테스트 | Vitest, Playwright | 순수 규칙·저장과 실제 플레이 흐름 검증 |
| 배포 | 정적 빌드 | MVP에 서버와 계정 없음 |

Three.js, 3D 모델, 범용 강체 물리, UI 프레임워크는 추가하지 않는다. 개발 시작 시 Phaser 3와 호환되는 안정 패키지 버전을 확인하고 lockfile로 고정한다. 여기서 특정 버전이 현재 최신이라고 가정하지 않는다.

Phaser 공식 문서는 여러 미니게임도 보통 단일 Game 인스턴스로 관리한다고 설명한다. 본 설계도 Scene만 바꾼다. [Phaser Game](https://docs.phaser.io/phaser/concepts/game)

## 2. 책임 경계

```text
DOM UI / Phaser Scene
         ↓ 사용자 command
ActivityController → 순수 과학 규칙 / 완료 판정
         ↓ domain event
Store (단일 상태 원본)
    ├─ Scene / DOM에 필요한 view model 제공
    └─ Repository에 저장 스냅샷 전달
```

- Scene은 시각화·히트 영역·포인터 변환을 담당한다. 자체적으로 증거나 잠금을 확정하지 않는다.
- Controller는 조작이 허용되는지 검증하고 실험 결과를 만든다.
- Store는 완료한 활동, 증거, 설계와 화면 상태를 보유한다.
- Repository는 JSON 직렬화 가능한 스냅샷만 저장한다. Phaser 객체·DOM 노드·타이머는 저장하지 않는다.
- DOM과 Canvas가 서로의 내부 상태를 직접 변경하지 않는다.
- 이벤트 구독은 반환된 해제 함수로 관리하고 Scene shutdown 때 타이머·트윈·입력을 정리한다.

## 3. 구현 디렉터리 계획

```text
src/
  app/             bootstrap, router, store, commands, selectors
  domain/          ids, progress, evidence, rules, validation
  content/         missions, dialogue, materials, city, inventionTemplates
  scenes/          CityScene, ActivityScene, FinalCoreScene
  activities/      s01 ... s10 (controller, view, schema)
  ui/              shell, dialogue, notebook, controls, report, certificate
  storage/         repository, indexedDb, migrations
  assets/          manifest (원본 경로 → 런타임 자산 ID)
  styles/          tokens, shell, components, print
public/assets/
  brand/ city/ characters/ activities/ audio/
tests/
  unit/ integration/ e2e/
```

각 활동은 Scene 클래스를 무조건 하나씩 복제하지 않고 공통 ActivityScene에 controller/view를 장착한다. 공통화는 입력·레이아웃·기록 UI까지만 하고 열 가지 실험 로직을 거대한 조건문으로 합치지 않는다.

## 4. 라우팅과 진행 규칙

```ts
type StageId = 'M01' | 'M02' | 'M03' | 'M04' | 'M05';
type ScreenId = 'S01' | 'S02' | 'S03' | 'S04' | 'S05'
  | 'S06' | 'S07' | 'S08' | 'S09' | 'S10';
type EvidenceId = 'E01' | 'E02' | 'E03' | 'E04' | 'E05';
type Route =
  | { kind: 'title' }
  | { kind: 'city' }
  | { kind: 'activity'; screen: ScreenId; mode: 'main' | 'practice' }
  | { kind: 'report' }
  | { kind: 'core' }
  | { kind: 'ending' }
  | { kind: 'certificate' };
```

- URL에 잠긴 화면 ID를 넣어도 Store의 개방 조건을 검사하여 도시로 돌려보낸다.
- M01은 항상 개방. M02~M05는 직전 장 Evidence 존재를 요구한다.
- 장의 후반 활동은 앞 활동 완료가 필요하다. S10→S09 수정 왕복은 허용한다.
- 보고서와 코어는 증거 5개가 필요하다. 코어 진입 전 reportReviewed를 요구한다.
- ending/certificate는 final.completedAt이 있어야 열 수 있다.
- 도시 시설 상태와 복구율을 중복 저장하지 않는다. 증거·final에서 계산한다.
- 복구율 함수: final 완료면 100, 아니면 증거 수 0~5에 대응하는 `[0,20,40,60,80,95]`.
- 하나의 completeStage 처리에서 증거 생성·활동 완료·resumePoint 변경을 묶고 저장한다. 더블 탭은 같은 runId와 evidenceId로 중복 방지한다.
- 최종 가동도 세 조건 확인 → final.completedAt 설정 → 저장 성공 확인 → 엔딩 전환 순서다. 저장 실패 시 현재 완료 상태는 메모리에 유지하며 재시도를 제공한다.
- 도시 복구 애니메이션은 상태의 표현이다. 건너뛰거나 중단해도 저장된 완료 상태를 잃지 않는다.

## 5. 저장 모델

```ts
interface SaveV1 {
  schemaVersion: 1;
  contentVersion: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  settings: { sound: boolean; reducedMotion: boolean; nickname?: string };
  resumePoint: Route;
  city: { player: { x: number; y: number }; introSeen: boolean };
  activities: Partial<Record<ScreenId, ActivitySnapshot>>;
  evidence: Partial<Record<EvidenceId, EvidenceSnapshot>>;
  inventionDrafts: Partial<Record<'box-latch' | 'remote-picker', DesignSnapshot>>;
  practice: Partial<Record<StageId, PracticeSnapshot>>;
  final: { reportReviewed: boolean; core: CoreSnapshot; completedAt?: string };
}
```

`ActivitySnapshot`은 screen별 판별 유니온으로 구현한다. 아래 필수 내용을 런타임 스키마로 검사하고 `any`로 저장하지 않는다.

| 화면 | 복원에 필요한 상태 |
|---|---|
| S01 | 선택 장치, 장치별 예상·확인 위치와 관찰 여부 |
| S02 | S01 장치 참조, 자석 있음/없음 실행 결과, 역할 연결 |
| S03 | 선택 재료, 재료별 예상·실험 결과 |
| S04 | 거리, 판 유무, 조건별 기록, 비교 완료 |
| S05 | seed와 미지 자석의 실제 극, 기준 방향, 실험 기록, 답 배치 |
| S06 | 고리별 위쪽 극, 시험 결과, 이유 연결 |
| S07 | 청소 마스크, 외부 자석·내부 패드 좌표, 연결 상태, 분리 횟수 |
| S08 | 구간, 카트 위치, 조작 자석 위치·극, 통과 구간과 밀기·끌기 기록 |
| S09 | 선택 문제, 부품·위치·극, 설계 revision, undo 스택 |
| S10 | 시험한 설계 ID/revision, 시험 결과, 원인 코드, 이유 연결 |

EvidenceSnapshot은 생성 시점의 관련 활동 결과·schema/content 버전·생성 날짜를 보유하는 불변 스냅샷이다. 원본 실험 데이터에서 파생되는 SVG 또는 HTML 썸네일을 생성하며 매 실험마다 이미지 파일을 저장하지 않는다.

저장 검증은 타입뿐 아니라 진행의 일관성도 확인한다. 증거는 E01부터 연속되어야 하고 관련 두 활동 완료 결과를 가져야 한다. final 완료에는 5개 증거와 코어 세 조건이 필요하다. 일치하지 않는 저장은 임의로 완료 처리하거나 초기화하지 않고 복원 오류로 안내한다. 연습 모드의 활동·설계 초안은 PracticeSnapshot 안에서 분리하고 본 진행의 초안과 증거를 덮어쓰지 않는다.

### 저장 정책

- IndexedDB DB `push-pull-city`, object store `saves`, key `main`. 하나의 프로필이며 인증용 개인정보를 요구하지 않는다.
- 확정 배치·뒤집기·시험·완료 시 dirty 처리 후 500ms debounce 저장. 활동 전환과 증거 생성은 저장 완료를 기다린다.
- S07 연속 청소와 S08 이동은 최대 1초 간격 체크포인트를 추가한다. 포인터 종료 시 즉시 최종 좌표를 반영한다.
- pointercancel은 드래그 이전의 확정 배치를 사용한다. 완료된 시험·청소 체크포인트는 되돌리지 않는다.
- S07 마스크는 64×36 이진 격자를 비트 배열로 직렬화한다. 새로고침 때 오염 면적을 다시 무작위 생성하지 않는다.
- DB 트랜잭션 성공 이후에만 '저장됨' 표시. 실패하면 메모리 진행은 유지하고 저장되지 않음과 재시도 버튼 표시.
- DB를 사용할 수 없는 환경은 세션 메모리로 실행한다. 작은 저장소로 몰래 전환하고 영구 저장됐다고 말하지 않는다.
- 마이그레이션은 원본 스냅샷 보존 → 버전별 변환 → 스키마 검증 → 교체 순서. 알 수 없는 미래 버전은 덮어쓰지 않는다.
- 다중 탭은 Web Locks API 사용 가능 시 쓰기 권한을 한 탭에만 부여한다. 미지원 시 revision 검사와 충돌 알림으로 자동 덮어쓰기를 막고 다른 탭을 닫은 뒤 다시 불러오게 한다.
- revision 비교와 다음 revision 쓰기는 같은 IndexedDB readwrite 트랜잭션에서 수행한다. 충돌 시 자동 재시도로 다른 탭의 상태를 덮어쓰지 않는다.
- 진행 전체 초기화는 UI 확인 후 main 저장만 지운다. 사이트 전체 저장소를 clear하지 않는다.

## 6. 도시 렌더링과 이동

### 시점

- 비스듬히 내려다보는 2D 스프라이트 기반 2.5D. 실제 3D 카메라를 만들지 않는다.
- 도로·바닥은 뒤에, 건물·캐릭터는 발밑 기준 y값으로 가림 순서를 정한다.
- 화면 구성은 한 도시 구역. 주요 시설을 찾기 위해 카메라를 오래 스크롤하지 않는다.
- 건물의 충돌 영역은 바닥 면적이다. 지붕 전체 사각형을 이동 장애물로 쓰지 않는다.

### 입력과 길찾기

- 바닥 탭: walkable grid의 목적지로 A* 경로를 계산한다. 막힌 지점은 가장 가까운 도달 가능 지점으로 보정하고 목적지 마커 표시.
- 시설 탭: 건물 center가 아닌 명시된 entrance 좌표로 이동한다.
- 방향키/WASD: 눌리는 동안 충돌을 확인하며 이동. 키보드 조작은 기존 자동 경로를 취소한다.
- DOM 이동 버튼도 방향키와 같은 command를 쓴다. 작은 가상 조이스틱만 강제하지 않는다.
- 입구 trigger 진입 시 캐릭터 정지, 장소 카드 표시. Enter/입장 버튼으로 의도적으로 들어간다.
- 잠긴 시설은 요구 미션을 표시하며 진입 command를 거부한다.
- 대화·모달·화면 전환 중 이동 잠금. 복귀 시 해당 입구 밖 안전한 위치에 배치한다.
- 출발점에서 모든 입구까지의 도달 가능성을 콘텐츠 검사로 확인한다.

## 7. 2D 과학 규칙

정량 물리 시뮬레이션이 아닌 **설명 가능한 정성 규칙 모델**이다. 게임 내 이동량이나 임계값을 현실의 측정값으로 표시하지 않는다. 상수는 콘텐츠 설정에서 조정하고 실제 플레이로 튜닝한다.

```ts
type Pole = 'N' | 'S';
type Relation = 'attract' | 'repel' | 'none';
type ResponseBand = 'strong' | 'weak' | 'none';
```

- 자석-자석: 마주 보는 극이 같으면 repel, 다르면 attract.
- 자석-물체: 이번 데이터에서 철로 명시한 물체는 attract, 그 외 제공 재료는 none. '금속'이라는 이름만으로 판정하지 않는다.
- 거리 반응은 strong/weak/none 세 구간. 화면별 좌표를 공통 실험 거리로 정규화한다.
- 프레임마다 상태를 바꾸는 마법 숫자 대신 `speed * dt`로 이동량을 계산하고 큰 dt를 제한한다.
- 마주 보는 극은 저장된 방향과 상대 위치로 결정한다. 색상이나 배열 index로 대체하지 않는다.
- forceStrength 같은 정밀한 단위를 학생 UI에 노출하지 않는다.
- 과학 규칙은 순수 함수이며 랜덤 효과·트윈·소리와 분리한다.

### 화면별 구현 계약

| 화면 | 핵심 처리와 검증 |
|---|---|
| S01 | 두 장치의 열림/닫힘·내부 레이어 상태와 hotspot 판정. 양 장치 관찰 없으면 완료 불가 |
| S02 | 같은 장치의 조건만 변경하여 결과 기록. 비교는 마지막 화면 상태가 아닌 양 조건의 실행 기록으로 판정 |
| S03 | 자석이 관찰 범위에 진입하면 해당 재료 반응을 계산. 정지 재료도 '반응 없음' 시험 기록을 생성. 거리만 멀었던 상태를 무반응 결과로 기록하지 않음 |
| S04 | 조건 키 `(distanceBand, barrierId)`로 기록. 동일 가까운 거리에서 판 유무, 판 없는 가까움/멀어짐 쌍을 확인 |
| S05 | 미지 자석별 실제 극을 seed와 함께 고정. 기준 N/S 양쪽 시험을 했는지와 최종 라벨을 별도로 검사 |
| S06 | 고리 i의 아래 극은 위 극의 반대. 아래 고리 윗면과 위 고리 아랫면을 비교. 받침+막대로 위치를 제한하고 결과 간격을 애니메이션으로 표현 |
| S07 | 외부 자석과 내부 패드 간 거리가 이탈 임계값을 넘으면 분리. 재결합은 더 작은 임계값을 사용하여 경계 깜빡임 방지. 붙어 있는 패드 이동 경로만 청소 |
| S08 | 레일 1차원 진행 좌표에 자력 방향을 투영. 앞/뒤 배치와 극 관계에 따라 속도 부호 결정. 장애물·구간 경계를 넘지 않도록 clamp. 목표 구간 도착에서만 통과 기록 |
| S09 | 템플릿별 허용 부품/영역, 최대 6개, 스냅·반전·undo. 시험 가능과 작동 성공을 구분 |
| S10 | 현재 설계 revision을 입력으로 evaluateDesign 실행. 결과에 사용한 revision이 달라지면 이전 성공은 현재 설계의 증거가 될 수 없음 |

### S07 청소 비율

`깨끗해진 오염 셀 수 / 초기 오염 셀 수`로 계산한다. 수조 전체 빈 영역은 분모에서 제외한다. 빠른 이동의 두 프레임 사이 경로도 선분으로 샘플링해 청소 판정의 구멍을 막는다. 초기 오염 셀이 0이면 콘텐츠 오류로 처리한다. 85%를 넘으면 완료 안내를 제공하고 계속 청소할 수도 있다.

### S08 카트 구간

콘텐츠에 각 구간의 rail, allowedMagnetZones, obstacles, goal, requiredActions를 명시한다. 구간 1은 앞쪽 접근 영역만, 구간 2는 뒤쪽만, 구간 3은 둘 다 제공한다. 막혀서 진행 불가능한 배치에는 위치 초기화와 undo를 제공한다. 정답 버튼을 누르면 카트가 자동 완주하는 구현은 금지한다.

## 8. 발명과 시험 데이터

```ts
interface DesignSnapshot {
  id: string;
  revision: number;
  templateId: 'box-latch' | 'remote-picker';
  parts: Array<{
    instanceId: string;
    partId: string;
    x: number;
    y: number;
    rotation: 0 | 90 | 180 | 270;
    pole?: Pole;
  }>;
}
interface TestResult {
  designId: string;
  designRevision: number;
  passed: boolean;
  causes: Array<'missing-part' | 'misaligned' | 'too-far'
    | 'same-poles' | 'blocked-path' | 'target-not-reached'>;
  observations: string[];
}
```

- 보관함: 케이스·덮개 각자의 로컬 anchor를 닫힌 상태 좌표로 변환한다. 자석-철판 또는 반대 극 자석 쌍의 정렬·거리 조건이 맞으면 고정한다. 좌우 두 위치와 허용 범위를 제공한다.
- 자석 두 개를 사용하면 회전 후 마주 보는 극을 계산한다. 부품 ID가 존재한다는 이유만으로 성공하지 않는다.
- 원격 도구: 얇은 비자성 판을 사이에 둔 외부 자석 조작으로 철제 부품이 통로를 따라 목표에 도달해야 한다. 가까운 거리 유지와 실제 이동 결과가 필요하다.
- 원격 도구의 서로 다른 유효 배치 위치·경로를 허용한다. 가동 시험은 사용자가 조작하며 완료 상태를 기록한다.
- S09 수정 command마다 revision 증가, 이전 TestResult는 이력으로만 보관한다.
- S10 완료 시 최신 revision의 성공 결과와 이유 연결을 검사하여 E05를 만든다.
- undo 스택은 현재 초안의 최근 20개 확정 조작으로 제한한다. 재시험 기록은 최근 20개와 첫 성공 요약을 유지한다.

## 9. 화면·입력 레이아웃

### 공통 셸

- DOM shell이 header, canvas host, controls, notebook/dialog layer를 소유한다.
- 화면 전체 UI를 한 장의 canvas처럼 비율 축소하지 않는다. 버튼의 실제 CSS 크기를 유지한다.
- Canvas 좌표는 container bounding box와 Phaser 좌표 변환을 사용한다. 페이지 offset을 상수로 두지 않는다.
- 활동 canvas는 컨테이너 크기에 맞춰 논리 실험 좌표를 변환하고, 1024×768에서는 긴 기록 패널을 접는다.
- 모달은 DOM 포커스를 가두고 canvas 입력을 비활성화한다. 닫을 때 호출 버튼으로 포커스를 돌려준다.
- 캔버스 위 장식 DOM은 pointer-events none, 실제 버튼만 auto. 동일 클릭이 canvas까지 전달되지 않도록 한다.
- touch-action none은 조작 canvas에만 적용한다. 긴 기록창은 스크롤 가능하다.

### 픽셀아트와 일반 2D 공존

- 도시만 저해상도 렌더 타깃에서 그려 nearest 필터로 표시한다. 일반 2D 활동은 스무딩을 유지한다.
- 게임 전체에 pixelArt 설정을 강제해 일반 배경과 활동 에셋이 거칠어지게 하지 않는다.
- 도시 기본 논리 크기 480×240. 사용 가능한 영역에서 정수 배율을 우선 선택하고 중앙 배치한다. 남는 공간은 도시 배경색으로 채운다.
- 건물 이름·입장 카드·버튼은 렌더 타깃 바깥의 DOM이며 픽셀 폰트로 축소하지 않는다.
- 도시의 세부 배치와 저해상도 가독성은 첫 구현에서 실제 화면으로 확인한다. 불가능하면 DESIGN의 좌표를 조정하되 6개 입구와 UI 크기는 유지한다.

Phaser의 FIT는 비율을 유지해 여백이 생길 수 있고 RESIZE는 캔버스 영역을 부모 크기에 맞춘다. 셸과 canvas host에는 RESIZE를 기본으로 검토하고, 도시 저해상도 뷰는 별도 정수 배율로 배치한다. resize 이후 좌표·입구 카드 앵커를 다시 계산한다. [Phaser Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager)

### 드래그 대체

- 부품을 탭/키보드로 선택 → 위치 영역 탭 또는 방향 버튼 → 배치 확정.
- 거리 조작은 이름 있는 DOM range input 제공.
- 극 뒤집기·고리 뒤집기는 별도 버튼 제공.
- 청소와 카트에는 길게 누를 수 있는 큰 방향 버튼을 제공해 drag와 동일한 위치 command를 보낸다.
- DOM에 현재 선택·극·시험 반응을 텍스트로 제공한다. 모든 프레임을 live region으로 읽지 않는다.
- 화면 리사이즈·방향 전환·포커스 이탈 시 입력 상태를 해제하여 계속 걷거나 드래그가 붙잡힌 상태를 방지한다.

## 10. 에셋 로딩·음향·성능 목표

- 메인은 로고와 배경, 도시는 도시 번들, 각 활동은 해당 장 번들을 지연 로딩한다. 원본 수십 장을 초기 로딩하지 않는다.
- 런타임 manifest에 ID, 타입, 파일, 크기, 라이선스/출처 확인 상태를 기록한다.
- 글자가 포함된 샘플 전체 이미지를 배경으로 사용하지 않는다. 필요한 개별 오브젝트 자산을 준비한다.
- 이미지 실패 시 재시도와 간단한 도형 대체를 제공한다. 학습 객체 식별이 불가능하면 해당 활동 진입을 멈추고 원인을 안내한다.
- 음향은 첫 사용자 입력 이후 활성화하며 끄기 설정을 저장한다. 소리가 나지 않아도 진행된다.
- 목표 예산: 첫 진입 전송 5MB 이하, 도시 번들 3MB 이하, 활동별 추가 3MB 이하. 파일 합계로 확인하며 현 시점 달성값이 아니다.
- 목표: 기준 태블릿에서 활성 조작 30fps 이상, 데스크톱 60fps 지향, 조작 시 시각 반응 100ms 이내. 기준 기기 모델은 구현 시 실제 보유 기기를 기록한다.
- 브라우저 탭이 숨겨지면 애니메이션·오디오를 멈추고 복귀 시 경과 시간을 한꺼번에 시뮬레이션하지 않는다.
- 매 장면 전환마다 GPU 리소스를 전부 재생성하지 않는다. 공통 에셋은 유지하고 장 전용 리소스는 캐시 정책에 따라 해제한다.

## 11. 검증 계획

### 순수 규칙·상태 테스트

| ID | 검증 |
|---|---|
| T01 | 같은 극 밀림·다른 극 끌림, 철 반응·알루미늄 무반응, 기준 거리 경계 |
| T02 | S04 세 조건이 없으면 미완료. 판만 바뀐 비교에서 거리 동일 유지 |
| T03 | S05 seed 복원, 실험하지 않고 라벨만 맞히는 우회 차단 |
| T04 | S06 모든 고리 방향 조합에서 마주 보는 면 판정. 고정 바닥 고리 불변 |
| T05 | S07 mask 비율, 경로 보간, 연결 끊김·재결합, 85% 경계 |
| T06 | S08 앞/뒤·극 조합에 따른 이동 부호, 장애물 정지, 밀기·끌기 실사용 확인 |
| T07 | 서로 다른 유효 발명 성공, 같은 극/먼 거리 실패, 오래된 설계 revision의 성공 재사용 차단 |
| T08 | 두 활동 없이 증거 생성 불가, 중복 완료 idempotent, 95/100 구분, 연습 후 증거 보존 |

### 통합·브라우저 검증

- 새 게임 완주: 도시 이동 → 10활동 → 5증거 → 보고 → 코어 → 엔딩 → 인증서.
- 중간 새로고침: S04, S05, S07, S09, S10에서 데이터·배치·실제 극 복원.
- 발명: 첫 시험 성공, 실패→수정→성공, 문제 전환→이전 초안 복귀.
- IndexedDB 쓰기 실패·미지원·손상 데이터·미래 스키마에서 조용한 초기화와 거짓 저장 표시가 없는지 확인.
- 잠긴 화면 직접 접근, 보고서 전 코어, final 이전 인증서 진입 차단.
- 도시 시설 6개 모두 도달, 자동 이동 중 키보드 전환, 건물 가림과 충돌, 모달 중 이동 차단.
- 1024×768 / 1280×800 / 1366×768 / 1920×1080에서 주요 버튼 48px 이상, 겹침·잘림·스크롤 충돌 확인.
- 터치 pointercancel, 화면 회전, 크기 변경 후에도 드래그 좌표 일치.
- 키보드·선택/배치 대체로 대표 활동 수행, N/S 문자·포커스·안내 대비 확인.
- 도시↔활동 20회 왕복 후 이벤트 중복·지속 오디오·누적 리소스 여부 확인.
- 엔딩 건너뛰기·다시 보기·모션 줄이기 모두 인증서에 도달. 인증서 인쇄에 UI 버튼 제외.

자동 E2E는 출시 UI에 정답·완료 우회 기능을 넣지 않는다. 테스트용 콘텐츠 fixture를 별도 빌드 설정에서 사용하고 배포 산출물에서 제외한다.

## 12. 구현 단계

1. 타입·콘텐츠 스키마·Store·저장 → 공통 셸 → 도시 최소 이동 → 1장 두 활동과 증거·복구 연결.
2. 과학 규칙을 독립 검증하고 S03~S06을 추가한다.
3. S07~S08의 연속 조작과 터치 품질, S09~S10의 설계·시험 연결을 완성한다.
4. 보고서·코어·엔딩·인증서를 연결하고 픽셀 자산·배경·효과음을 실제 에셋으로 교체한다.
5. 검증 목록을 실행하고 결과와 미해결 항목을 기록한다.

## 13. 남은 확인 사항

- 실제 수업 태블릿과 전자칠판의 기종·브라우저. 초기 검증은 사용 가능한 데스크톱 브라우저와 뷰포트로 시작하되 실기기 검증을 대체했다고 표시하지 않는다.
- 공식 교육과정 원문 대조와 문구 검토.
- 새 픽셀 타일·캐릭터 걷기 프레임 및 개별 실험 자산의 제작·품질 확인.
- 현 문서는 기술 계약이며 코드 빌드, 성능 측정, 테스트 통과를 의미하지 않는다.

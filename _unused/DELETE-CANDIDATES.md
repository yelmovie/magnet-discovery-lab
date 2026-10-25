# 보존한 이전 구현과 정리 후보 · 2026-10-21

이번 작업에서는 파일을 삭제하거나 사용자 자료를 이동하지 않았다.

| 후보 | 상태·주의 |
|---|---|
| `src/city.ts` | 이전 Phaser 도시. 새 진입점은 `expedition.ts`. 과거 구현 재현용으로 보존. 새 배포 JS에는 포함되지 않음. |
| `src/adventure.ts`의 이전 활동 라우터 | 새 활동은 `mission-play.ts`. `rewardBelt`는 연구 가방에서 계속 사용하므로 파일 전체 삭제 금지. |
| `src/tablet-activities.ts`, `src/delivery.ts`, `src/distance.ts`, `src/workshops.ts` | 일부는 이전 활동이지만 최종 선택 도전이 사용한다. 부분 추출·검증 전 삭제 금지. |
| 이전 `public/assets/adventure/` 배경들 | 옛 최종 화면·기록에서 참조가 남을 수 있어 보존. 실제 경로 검색 후 정리. 캐릭터 시트는 현재도 사용한다. |
| `assets/source/quest/`의 중간 생성본 | 프롬프트·검수 재현용 원본. 런타임은 `public/assets/quest/`의 WebP만 사용. |

최적화는 필요한 배포본을 분리하는 방식으로 적용했다. 새 지도·방·소품 약 2.29 MB, 폰트 약 0.92 MB. 개별 파일·해시는 생성 매니페스트 참조.

## 2026-10-25 납품 점검 추가 후보 (이동·삭제하지 않음)

| 후보 | 용량 | 근거 |
|---|---|---|
| `image/` 중 `samplepages/original-downloads/`와 SHA-256이 같은 33장 | 약 61 MB | 두 폴더에 같은 샘플 원본이 중복. 배포(`public/`)에는 포함되지 않음. 한쪽만 보존하면 된다. |
| `image/`의 나머지 13장 | 약 24 MB | 초기 참고 그림. 코드·문서 참조 확인 후 `_unused/`로 옮길지 결정. |
| `assets/source/polish-20261025/logo-before-resize.webp` | 1.3 MB | 첫 화면 로고 축소 전 배포본(1774×887). 화질 비교용으로만 보관. |

배포 용량에는 영향이 없다. 저장소 크기를 줄이려면 사용자가 보존할 쪽을 정한 뒤 이동한다.

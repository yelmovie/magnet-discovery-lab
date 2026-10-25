# 3D 모델 (배포본)

Meshy image-to-3D로 만든 원본을 `scripts/pack-glb.mjs`로 압축한 파일이다. three.js `GLTFLoader` + `MeshoptDecoder`로 읽는다(`src/three-view.ts`).

| 배포 파일 | Meshy 원본 | 쓰는 곳 | 삼각형 | 크기 |
|---|---|---|---|---|
| `ring-magnet.glb` | `Meshy_AI_Ring_Magnet_1025122842_image-to-3d-texture.glb` | 극성 복원 센터 · 고리 3D 보기 | 52,842 (원본 그대로) | 1.8MB |
| `ring-stand.glb` | `Meshy_AI_Wooden_Stand_1025122856_image-to-3d-texture.glb` | 같은 화면 | 39,592 (원본 그대로) | 2.0MB |
| `box-body.glb` | `Meshy_AI_Wooden_Box_1025122935_image-to-3d-texture.glb` | 광장 복구 · 자석 잠금 상자 작동 | 65,324 (원본의 25%) | 3.0MB |
| `box-lid.glb` | `Meshy_AI_Box_Lid_1025123121_image-to-3d-texture.glb` | 같은 화면 · 뚜껑 | 309,330 (원본 그대로) | 4.5MB |
| `remote-frame.glb` | `Meshy_AI_Wooden_Frame_Stand_1025123339_image-to-3d-texture.glb` | 광장 복구 · 유리 너머 운반기 작동 | 139,024 (원본 그대로) | 3.6MB |
| `remote-handle.glb` | `Meshy_AI_Brass_Slider_Magnet_1025123508_image-to-3d-texture.glb` | 같은 화면 · 자석 손잡이 | 56,318 (원본 그대로) | 2.1MB |
| `remote-tray.glb` | `Meshy_AI_Steel_Carrier_Tray_1025123941_image-to-3d-texture.glb` | 같은 화면 · 철 쟁반 | 377,648 (원본 그대로) | 4.4MB |

원본(합계 175MB)은 `assets/source/3d-base-20261025/meshy/`에 있고 저장소에는 올리지 않는다(`.gitignore`). 파일 크기·SHA-256은 같은 폴더 `originals.json`.

## 찢어짐 없이 줄인 방법

지난 작업에서 블렌더 정리 후 텍스처가 찢어진 원인은 **UV 이음매 정점을 합친 것(weld/merge)**이다. 이번에는 형태를 건드리지 않는 압축만 썼다.

- 정점 합치기 안 함. 겹친 데이터 정리(dedup·prune)만
- meshopt 무손실 압축 + 위치·UV 16비트 양자화(이 크기에서 1마이크로미터 이하 오차)
- 색 텍스처 2048 WebP q90. 노멀·금속 텍스처는 **거의 무손실 WebP 1024** — 손실 압축하면 황동에 금 간 무늬, 나무에 얼룩이 생기는 것을 비교 렌더로 확인했다
- 삼각형 줄이기는 이음매 잠금(`lockBorder`)으로 시험했고, 원본과 같은 각도 비교에서 차이가 안 보인 상자 몸체에만 적용했다. 뚜껑(경첩 음영 변화)·틀(유리면 꺾임)은 원본 그대로 둔다

비교 화면: 개발 서버에서 `/scripts/glb-compare.html?m=box-lid&v=orig,packed` (`views=0:0,90:0`로 여러 각도).

## 다시 만들 때

```bash
node scripts/pack-glb.mjs              # 7개 전부
node scripts/pack-glb.mjs box-lid      # 하나만
node scripts/pack-glb.mjs check        # 배포본 존재·압축·용량(26MB) 확인
```

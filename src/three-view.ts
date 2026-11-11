// Look-and-try 3D card. Loaded on demand so three.js never weighs on the first screen.
// Judgement stays in the 2D experiments; this scene only mirrors the bench.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ringFloating } from './mission-model';

export type Pole = 'N' | 'S';
export type RingPose = { top: Pole; onPole: boolean; lift: number };

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<THREE.Group>>();
const model = (name: string) => {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(`/assets/3d/${name}.glb`).then(g => g.scene));
  return cache.get(name)!.then(scene => {
    const copy = scene.clone(true);
    copy.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return copy;
  });
};

// Measured from the Meshy originals (metres): stand base top, ring thickness, ring outer radius.
const STAND_TOP = 0.0142, RING_H = 0.01, RING_R = 0.0187, FLOAT_GAP = 0.014;
function stage(host: HTMLElement, target: THREE.Vector3, distance: number, motion: boolean, dir = new THREE.Vector3(0.55, 0.42, 0.72)) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  host.append(canvas);
  // Tablets under memory pressure can drop the GPU context; without this the learner sees an empty box.
  const notice = document.createElement('p');
  notice.className = 'view3d-loading'; notice.setAttribute('role', 'status');
  notice.textContent = '3D 그림이 잠시 끊겼어. 창을 닫고 다시 열어 봐. 실험대에서는 그대로 계속할 수 있어.';
  let lost = false, dirty = true;
  const invalidate = () => { dirty = true; };
  const onLost = () => { lost = true; canvas.style.visibility = 'hidden'; host.append(notice); };
  const onRestored = () => { lost = false; canvas.style.visibility = ''; notice.remove(); invalidate(); };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer), env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env; scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight('#fff8e7', '#8a6a44', 1.1));
  const sun = new THREE.DirectionalLight('#fff3dc', 2.2); sun.position.set(0.25, 0.45, 0.3); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -0.2, right: 0.2, top: 0.2, bottom: -0.2, near: 0.05, far: 1.5 }); sun.shadow.bias = -0.0004;
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.22, 48), new THREE.ShadowMaterial({ opacity: 0.22 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 3);
  camera.position.copy(dir).normalize().multiplyScalar(distance).add(target);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target); controls.enablePan = false; controls.enableDamping = motion;
  // Low enough to peek under a ring, never under the table.
  controls.minPolarAngle = 0.3; controls.maxPolarAngle = 1.82; controls.minDistance = distance * 0.45; controls.maxDistance = distance * 1.6;
  controls.update();
  controls.addEventListener('change', invalidate);
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  let raf = 0;
  // A still scene is not drawn again; damping keeps firing 'change' until the camera settles.
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { invalidate(); return; }
    if (lost) return;
    controls.update();
    if (dirty) { dirty = false; renderer.render(scene, camera); }
  };
  raf = requestAnimationFrame(loop);
  const dispose = () => {
    cancelAnimationFrame(raf); observer.disconnect(); controls.dispose();
    canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored); notice.remove();
    scene.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh && !(o as THREE.Sprite).isSprite) return; m.geometry?.dispose(); const mats = Array.isArray(m.material) ? m.material : [m.material]; mats.forEach(mat => { if (!mat) return; Object.values(mat).forEach(v => { if (v instanceof THREE.Texture) v.dispose(); }); mat.dispose(); }); });
    env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
  return { scene, invalidate, dispose };
}

function poleLabel(pole: Pole) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = pole === 'N' ? '#be3d39' : '#2368a3'; g.beginPath(); g.roundRect(8, 8, 112, 112, 24); g.fill();
  g.strokeStyle = '#fffaf0'; g.lineWidth = 8; g.stroke();
  g.fillStyle = '#fffaf0'; g.font = 'bold 76px "NanumSquareNeo", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(pole, 64, 70);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false })); sprite.scale.setScalar(0.0105); sprite.renderOrder = 2;
  return sprite;
}

/** Mirrors the 2D ring bench: rings on the pole stack at the heights the bench produced. */
export async function mountRingView(host: HTMLElement, rings: RingPose[], motion: boolean) {
  const stacked = rings.filter(r => r.onPole).length, peak = STAND_TOP + Math.max(0, ...rings.map(r => r.onPole ? r.lift : 0)) + RING_H;
  const view = stage(host, new THREE.Vector3(stacked < rings.length ? 0.03 : 0, Math.max(0.035, peak * 0.6), 0), 0.22, motion);
  try {
    view.scene.add(await model('ring-stand'));
    let table = 0;
    for (const ring of rings) {
      const mesh = await model('ring-magnet'), holder = new THREE.Group(); holder.add(mesh);
      // The model's top face is N (red). An S-top ring is the same magnet turned over.
      if (ring.top === 'S') { mesh.rotation.x = Math.PI; mesh.position.y = RING_H; }
      if (ring.onPole) holder.position.set(0, STAND_TOP + ring.lift, 0);
      else holder.position.set(0.065 + table++ * 0.045, 0, 0.03);
      const top = poleLabel(ring.top), bottom = poleLabel(ring.top === 'N' ? 'S' : 'N');
      top.position.set(RING_R + 0.008, RING_H, 0); bottom.position.set(RING_R + 0.008, 0, 0);
      holder.add(top, bottom); view.scene.add(holder);
    }
  } catch (error) { view.dispose(); throw error; }
  view.invalidate();
  return view.dispose;
}

/** Ring heights in bench order. Held rings keep the test gap; released rings obey the same rule as the 2D bench. */
export function ringLifts(tops: Pole[], released: boolean): number[] {
  let y = 0;
  return tops.map((top, i) => {
    if (i) y += RING_H + (!released || ringFloating(tops[i - 1], top) ? FLOAT_GAP : 0);
    return y;
  });
}

// Look-and-try 3D cards. Loaded on demand so three.js never weighs on the first screen.
// Judgement stays in the 2D experiments; these scenes only mirror state or demonstrate a device.
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
// The lid was generated tilted 25.5° about X (fitted to its top face). Flattened it is 4.47 × 2.81 cm,
// its rim underside sits 6.2 mm above its lowest point (the magnet). Scale fits the 11.6 × 9.3 cm
// body rim, which tops out at 7.47 cm; the hinge leaves above it are at the back edge.
const LID = { tilt: THREE.MathUtils.degToRad(-25.5), scale: new THREE.Vector3(2.64, 2.2, 3.37), panelBottom: 0.0062, zMin: -0.019 };
const BODY = { top: 0.0747, hingeZ: -0.0465 };

function stage(host: HTMLElement, target: THREE.Vector3, distance: number, motion: boolean, dir = new THREE.Vector3(0.55, 0.42, 0.72)) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
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
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const tickers: ((dt: number) => void)[] = [];
  let raf = 0, last = performance.now();
  const loop = (now: number) => { raf = requestAnimationFrame(loop); if (document.hidden) { last = now; return; } const dt = Math.min(0.05, (now - last) / 1000); last = now; tickers.forEach(t => t(dt)); controls.update(); renderer.render(scene, camera); };
  raf = requestAnimationFrame(loop);
  const dispose = () => {
    cancelAnimationFrame(raf); observer.disconnect(); controls.dispose();
    scene.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh && !(o as THREE.Sprite).isSprite) return; m.geometry?.dispose(); const mats = Array.isArray(m.material) ? m.material : [m.material]; mats.forEach(mat => { if (!mat) return; Object.values(mat).forEach(v => { if (v instanceof THREE.Texture) v.dispose(); }); mat.dispose(); }); });
    env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
  return { scene, tickers, dispose };
}

function poleLabel(pole: Pole) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = pole === 'N' ? '#be3d39' : '#2368a3'; g.beginPath(); g.roundRect(8, 8, 112, 112, 24); g.fill();
  g.strokeStyle = '#fffaf0'; g.lineWidth = 8; g.stroke();
  g.fillStyle = '#fffaf0'; g.font = 'bold 76px "Magnet Quest Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(pole, 64, 70);
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

// Remote frame (metres): glass faces ±Z around z = 0, the brass slot is on the front right post,
// handle travel spans the glass height. The handle model points its magnet to +X, the tray is 8.6 cm long.
const REMOTE = { glassHalf: 0.004, handleX: 0.026, low: 0.04, high: 0.108, handleHalfZ: 0.015, trayHalfZ: 0.0105, gap: 0.03 };

/** The handle slides on the front of the glass; the steel tray behind follows only while the magnet touches the glass. */
export async function mountRemoteDemo(host: HTMLElement, motion: boolean) {
  // From the right side: the frosted glass is opaque in the model, so the handle (front)
  // and the tray (back) are both in view only when the glass is seen nearly edge-on.
  const view = stage(host, new THREE.Vector3(0.01, 0.07, 0), 0.4, motion, new THREE.Vector3(0.95, 0.42, 0.32));
  const handle = new THREE.Group(), tray = new THREE.Group();
  try {
    view.scene.add(await model('remote-frame'));
    const h = await model('remote-handle'); h.rotation.y = Math.PI; handle.add(h);
    tray.add(await model('remote-tray'));
    view.scene.add(handle, tray);
  } catch (error) { view.dispose(); throw error; }
  let level = 0, trayY = REMOTE.low, attached = true, away = 0;
  const handleY = () => REMOTE.low + (REMOTE.high - REMOTE.low) * level;
  const place = () => {
    handle.position.set(REMOTE.handleX, handleY() - 0.01, REMOTE.glassHalf + REMOTE.handleHalfZ + away);
    tray.position.set(REMOTE.handleX, trayY - 0.02, -REMOTE.glassHalf - REMOTE.trayHalfZ);
  };
  place();
  view.tickers.push(dt => {
    away += ((attached ? 0 : REMOTE.gap) - away) * Math.min(1, motion ? dt * 10 : 1);
    // A touching magnet drags the tray with a little lag; pulled away, the tray stays where it is.
    if (attached) trayY += (handleY() - trayY) * Math.min(1, motion ? dt * 6 : 1);
    place();
  });
  return {
    dispose: view.dispose,
    setLevel(value: number) { level = Math.max(0, Math.min(1, value)); },
    setAttached(value: boolean) { attached = value; },
    get trayLevel() { return (trayY - REMOTE.low) / (REMOTE.high - REMOTE.low); },
  };
}

/** The learner lowers the lid; just before it shuts, the magnet pulls it onto the iron plate. */
export async function mountBoxDemo(host: HTMLElement, motion: boolean, onSnap: () => void) {
  const view = stage(host, new THREE.Vector3(0, 0.07, 0), 0.4, motion);
  const hinge = new THREE.Group(), scaler = new THREE.Group();
  try {
    view.scene.add(await model('box-body'));
    const lid = await model('box-lid'); lid.rotation.x = LID.tilt;
    scaler.scale.copy(LID.scale); scaler.position.set(0, -LID.panelBottom * LID.scale.y, -LID.zMin * LID.scale.z);
    scaler.add(lid); hinge.add(scaler); hinge.position.set(0, BODY.top, BODY.hingeZ); view.scene.add(hinge);
  } catch (error) { view.dispose(); throw error; }
  let angle = 70, goal = 70, snapped = false;
  const SNAP = 16;
  const apply = () => { hinge.rotation.x = -THREE.MathUtils.degToRad(angle); };
  apply();
  view.tickers.push(dt => {
    if (angle === goal) return;
    // Snapping accelerates like a pull; ordinary moves follow the slider smoothly.
    const speed = snapped ? 420 : 160, step = motion ? speed * dt : Math.abs(goal - angle);
    angle = angle > goal ? Math.max(goal, angle - step) : Math.min(goal, angle + step); apply();
  });
  return {
    dispose: view.dispose,
    setAngle(value: number) {
      if (value <= SNAP) { goal = 0; if (!snapped) { snapped = true; onSnap(); } }
      else { goal = value; snapped = false; }
      if (!motion) { angle = goal; apply(); }
    },
    get snapped() { return snapped; },
  };
}

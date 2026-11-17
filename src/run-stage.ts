// The 3D delivery course. Loaded on demand so three.js never weighs on the first screen.
// This file only draws and walks: the cart is moved and judged by delivery() in missions-remote.ts.
// Distances are a teaching model. One bench unit is drawn as half a metre.
import * as THREE from 'three';
import { Octree } from 'three/examples/jsm/math/Octree.js';
import type { Activity, Point, Pole } from './domain';
import { opposite } from './domain';
import { deliveryCourse } from './mission-model';
import type { DeliveryState } from './missions-remote';
import type { RunSteer } from './run-input';
import { blobShadow, cell, Runner, standing, Walker } from './run-character';
import { benchPoint, checkpointFor, courseEnd, courseStart, fallLine, lane, pickupLine, pickupSticks, practice, practiceEnd, practiceItems, practiceTip, resumeSpot, UNIT } from './run-stage-rules';

const z = (s: number) => -s * UNIT, sOf = (worldZ: number) => -worldZ / UNIT;
const POLE = { N: '#be3d39', S: '#2368a3' } as const;
const FONT = '"NanumSquareNeo", "Pretendard", sans-serif';
const loader = new THREE.TextureLoader();
async function picture(url: string, pixel = false) {
  const texture = await loader.loadAsync(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (pixel) { texture.magFilter = THREE.NearestFilter; texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter; }
  return texture;
}
const optional = (url: string) => picture(url).catch(() => null);

function drawn(width: number, height: number, paint: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
/** N and S are drawn by code, in the colours of the 2D bench. */
function poleLabel(pole: Pole, size = .42) {
  const texture = drawn(96, 96, g => {
    g.fillStyle = POLE[pole]; g.beginPath(); g.roundRect(6, 6, 84, 84, 20); g.fill();
    g.strokeStyle = '#fffaf0'; g.lineWidth = 7; g.stroke();
    g.fillStyle = '#fffaf0'; g.font = `bold 58px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(pole, 48, 52);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false })); sprite.scale.setScalar(size); sprite.renderOrder = 5;
  return sprite;
}
function sign(text: string, color = '#234f4b', size = .4) {
  const width = 64 + text.length * 44;
  const texture = drawn(width, 96, g => {
    g.fillStyle = '#fffdf0'; g.beginPath(); g.roundRect(4, 4, width - 8, 88, 22); g.fill();
    g.strokeStyle = color; g.lineWidth = 6; g.stroke();
    g.fillStyle = color; g.font = `bold 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, width / 2, 51);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture })); sprite.scale.set(width / 96 * size, size, 1);
  return sprite;
}
/** A bar magnet lying along the course. `rear` is the pole on the end nearer the camera. */
function barMagnet(length: number, thick: number, labelSize = .42) {
  const group = new THREE.Group(), geometry = new THREE.BoxGeometry(thick, thick, length / 2);
  const rear = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial()), front = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial());
  rear.position.z = length / 4; front.position.z = -length / 4; group.add(rear, front);
  const labels: THREE.Sprite[] = [];
  const set = (pole: Pole) => {
    labels.splice(0).forEach(label => { group.remove(label); label.material.map?.dispose(); label.material.dispose(); });
    rear.material.color.set(POLE[pole]); front.material.color.set(POLE[opposite(pole)]);
    for (const [p, at] of [[pole, length / 4], [opposite(pole), -length / 4]] as const) { const label = poleLabel(p, labelSize); label.position.set(0, thick / 2 + labelSize * .7, at); group.add(label); labels.push(label); }
  };
  return { group, set, labels, materials: [rear.material, front.material] };
}
/** Box with its picture repeated every `tile` metres on the top face. */
function slab(s0: number, s1: number, x0: number, x1: number, top: number, depth: number, material: THREE.Material, tile = 0) {
  const width = x1 - x0, length = (s1 - s0) * UNIT, geometry = new THREE.BoxGeometry(width, depth, length);
  if (tile) { const uv = geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / tile, uv.getY(i) * length / tile); }
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set((x0 + x1) / 2, top - depth / 2, z((s0 + s1) / 2));
  return mesh;
}

export interface RunStage {
  held: boolean;
  /** Runner's course position in bench units. */
  readonly s: number;
  /** One line for the learner: a practice prompt or what just happened. */
  readonly message: string;
  readonly flipped: boolean;
  attach(host: HTMLElement): void;
  step(dt: number, steer: RunSteer): Point;
  show(state: DeliveryState): void;
  dispose(): void;
}

export async function createRunStage(a: Activity, onLost: () => void): Promise<RunStage> {
  const [walk, poses, friendWalk, villainLeft, villainRight, kit, ground, skyline] = await Promise.all([
    picture('/assets/adventure/mili-walk-pixel.webp', true), picture('/assets/adventure/mili-poses-pixel.webp', true),
    picture('/assets/adventure/dangi-walk-pixel.webp', true), picture('/assets/adventure/map-villain-left-v2.webp', true),
    picture('/assets/adventure/map-villain-right-v2.webp', true), picture('/assets/quest/material-kit.webp'),
    optional('/assets/run-stage/street-tile.webp'), optional('/assets/run-stage/city-skyline.webp'),
  ]);
  await document.fonts?.ready;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  const canvas = renderer.domElement; canvas.className = 'run-canvas'; canvas.setAttribute('aria-hidden', 'true');
  let lost = false;
  const lose = (event: Event) => { event.preventDefault(); lost = true; onLost(); };
  canvas.addEventListener('webglcontextlost', lose);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#bfe4f1'); scene.fog = new THREE.Fog('#cfe9ee', 26, 70);
  scene.add(new THREE.HemisphereLight('#fff8e7', '#8a7a5c', 1.9));
  const sun = new THREE.DirectionalLight('#fff3dc', 1.5); sun.position.set(-4, 9, 6); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(46, 16 / 9, .1, 140);

  // --- Course: basic shapes. The ground and the practice step are the only things the runner collides with.
  if (ground) { ground.wrapS = ground.wrapT = THREE.RepeatWrapping; ground.anisotropy = 4; }
  const street = new THREE.MeshLambertMaterial(ground ? { map: ground } : { color: '#c9b891' });
  const stone = new THREE.MeshLambertMaterial(ground ? { map: ground, color: '#e9d9bd' } : { color: '#b79f78' });
  const solid = new THREE.Group(), BACK = courseStart - 34, FAR = 96, [stepFrom, stepTo] = practice.step, [gapFrom, gapTo] = practice.gap;
  solid.add(slab(BACK, stepFrom, -2.8, 4.6, 0, 1.2, street, 2), slab(stepFrom, stepTo, -2.8, 4.6, practice.stepHeight, 1.2 + practice.stepHeight, stone, 2),
    slab(stepTo, gapFrom, -2.8, 4.6, 0, 1.2, street, 2), slab(gapTo, FAR, -2.8, 4.6, 0, 1.2, street, 2));
  scene.add(solid);
  const world = new Octree().fromGraphNode(solid);
  scene.add(slab(gapFrom, gapTo, -2.8, 4.6, -2.6, .2, new THREE.MeshBasicMaterial({ color: '#31424a' })));

  const wood = new THREE.MeshLambertMaterial({ color: '#8a6a44' }), steel = new THREE.MeshLambertMaterial({ color: '#7d8a8f' }), cream = new THREE.MeshLambertMaterial({ color: '#f1e3c2' });
  const railFrom = 20, railTo = 74;
  for (const side of [-.45, .45]) scene.add(slab(railFrom, railTo, lane.rail + side - .05, lane.rail + side + .05, .13, .13, steel));
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(1.35, .07, .24), wood, Math.floor((railTo - railFrom) * UNIT / .9));
  for (let i = 0, m = new THREE.Matrix4(); i < sleepers.count; i++) sleepers.setMatrixAt(i, m.makeTranslation(lane.rail, .035, z(railFrom) - .45 - i * .9));
  scene.add(sleepers, slab(16, 58, 1.3, 1.46, .2, .2, cream), slab(railFrom - 1, railFrom, lane.rail - .7, lane.rail + .7, .6, .6, wood), slab(railTo, railTo + 1, lane.rail - .7, lane.rail + .7, .6, .6, wood));
  // Street walls and houses are scenery; the walkway itself is kept by the runner's bounds.
  const palette = ['#e8b98a', '#d9c7a1', '#b9d2c4', '#e3a995', '#c9c2df', '#efd39a'];
  const roof = new THREE.MeshLambertMaterial({ color: '#a8553f' });
  for (let s = BACK, i = 0; s < FAR; i++) {
    const wide = 8 + (i * 5) % 6, tall = 3.2 + (i * 7) % 4 * .8;
    for (const [x, skip] of [[-4.7, false], [6.6, i % 3 === 1]] as const) {
      if (skip) continue;
      const house = new THREE.Mesh(new THREE.BoxGeometry(3.6, tall, wide * UNIT - .5), new THREE.MeshLambertMaterial({ color: palette[(i + (x > 0 ? 3 : 0)) % palette.length] }));
      house.position.set(x, tall / 2, z(s + wide / 2)); scene.add(house);
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.9, .35, wide * UNIT - .3), roof); top.position.set(x, tall + .17, z(s + wide / 2)); scene.add(top);
    }
    s += wide;
  }
  scene.add(slab(BACK, FAR, -2.9, -1.52, .5, .5, cream), slab(BACK, FAR, 4.4, 4.7, .7, .7, cream));
  let backdrop: THREE.Mesh | undefined;
  if (skyline) { backdrop = new THREE.Mesh(new THREE.PlaneGeometry(150, 50), new THREE.MeshBasicMaterial({ map: skyline, fog: false })); scene.add(backdrop); }

  // --- Stations, delivery bays and the glass room.
  const bays = [44, deliveryCourse.goal].map(goal => {
    const paint = new THREE.MeshBasicMaterial({ color: '#ffe197', transparent: true, opacity: .75, depthWrite: false });
    const bay = new THREE.Mesh(new THREE.PlaneGeometry(1.7, deliveryCourse.tolerance * 2 * UNIT), paint); bay.rotation.x = -Math.PI / 2; bay.position.set(lane.rail, .16, z(goal));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.9, 8), wood); post.position.set(3.55, .95, z(goal));
    const pennant = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -.5, 0), new THREE.Vector3(-.8, -.25, 0)]), new THREE.MeshBasicMaterial({ color: '#c46e22', side: THREE.DoubleSide }));
    pennant.position.set(3.55, 1.88, z(goal));
    scene.add(bay, post, pennant);
    return { goal, paint, pennant: pennant.material as THREE.MeshBasicMaterial };
  });
  for (const [text, s, x] of [['출발역', 27, 3.2], ['중간역 · 배달 장소', 44, 3.2], ['보관실 · 배달 장소', deliveryCourse.goal, 3.2]] as const) { const board = sign(text); board.position.set(x, 3, z(s)); scene.add(board); }
  const glass = new THREE.MeshBasicMaterial({ color: '#a9dcea', transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false });
  const frame = new THREE.MeshLambertMaterial({ color: '#5f9fb2' });
  const pane = (x0: number, x1: number, s0: number, s1: number, y0: number, y1: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.06, x1 - x0), y1 - y0, Math.max(.06, (s1 - s0) * UNIT)), glass);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, z((s0 + s1) / 2)); mesh.renderOrder = 3; scene.add(mesh); return mesh;
  };
  const { wall, reach } = deliveryCourse, doorS = reach + .9, roomEnd = 70, HIGH = 2.7;
  pane(1.3, 3.5, wall, wall, 1.45, HIGH); pane(1.3, 1.3, doorS, roomEnd, 0, HIGH); pane(3.5, 3.5, wall, roomEnd, 0, HIGH); pane(1.3, 3.5, roomEnd, roomEnd, 0, HIGH);
  for (const [x, s] of [[1.3, wall], [3.5, wall], [1.3, roomEnd], [3.5, roomEnd], [1.3, doorS], [-1.5, doorS]] as const) { const post = new THREE.Mesh(new THREE.BoxGeometry(.1, HIGH, .1), frame); post.position.set(x, HIGH / 2, z(s)); scene.add(post); }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.3, .1, .1), frame); lintel.position.set(2.4, 1.45, z(wall)); scene.add(lintel);
  // The walkway door is open on the first stretch and closed on the second, as on the bench.
  const door = pane(-1.5, 1.3, doorS, doorS, 0, HIGH), glassSign = sign('유리벽', '#1d7fa0', .46); glassSign.position.set(-.1, HIGH + .4, z(doorS)); scene.add(glassSign);

  // --- Cart: basic shapes, so the N end and the S end are exact.
  const cart = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(1.15, .34, 1.7), new THREE.MeshLambertMaterial({ color: '#b78240' })); body.position.y = .55; cart.add(body);
  const brass = new THREE.MeshLambertMaterial({ color: '#c9973a' }), tyre = new THREE.MeshLambertMaterial({ color: '#33383a' }), wheel = new THREE.CylinderGeometry(.24, .24, .12, 16);
  for (const x of [-.45, .45]) for (const dz of [-.55, .55]) { const w = new THREE.Mesh(wheel, tyre); w.rotation.z = Math.PI / 2; w.position.set(x * 1.25, .37, dz); cart.add(w); }
  for (const dz of [-.86, .86]) { const rim = new THREE.Mesh(new THREE.BoxGeometry(1.2, .1, .06), brass); rim.position.set(0, .76, dz); cart.add(rim); }
  const cartMagnet = barMagnet(1.3, .2); cartMagnet.set('N'); cartMagnet.group.position.set(-.68, .62, 0); cart.add(cartMagnet.group);
  const parcel = new THREE.Group(), box = new THREE.Mesh(new THREE.BoxGeometry(.72, .5, .8), new THREE.MeshLambertMaterial({ color: '#cf9f62' })), tape = new THREE.Mesh(new THREE.BoxGeometry(.74, .52, .14), new THREE.MeshLambertMaterial({ color: '#f1dfb4' }));
  parcel.add(box, tape); scene.add(parcel);
  cart.position.x = lane.rail; scene.add(cart);
  const arrow = new THREE.Group(), arrowPaint = new THREE.MeshBasicMaterial({ color: '#167d76' });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, .7), arrowPaint), head = new THREE.Mesh(new THREE.ConeGeometry(.26, .5, 4), arrowPaint);
  head.rotation.x = -Math.PI / 2; head.position.z = -.6; arrow.add(shaft, head); arrow.position.set(lane.rail, 1.85, 0); scene.add(arrow);
  const link = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: '#167d76', dashSize: .22, gapSize: .16 }));
  link.frustumCulled = false; scene.add(link);
  const spot = new THREE.Mesh(new THREE.RingGeometry(.42, .56, 28), new THREE.MeshBasicMaterial({ color: '#2d7f71', transparent: true, opacity: .8, depthWrite: false }));
  spot.rotation.x = -Math.PI / 2; spot.position.set(.3, .03, 0); scene.add(spot);

  // --- Runner, her hand magnet, the friend and the street goblin.
  const runner = new Runner(world, walk, poses), hand = barMagnet(1.04, .18, .36);
  scene.add(runner.group, hand.group);
  const friend = new Walker(friendWalk, 1.35), friendShadow = blobShadow(.34), trail: THREE.Vector3[] = [];
  scene.add(friend.sprite, friendShadow);
  const goblinArt = { left: villainLeft, right: villainRight };
  for (const art of Object.values(goblinArt)) cell(art, 6, 1, 0, 0);
  const goblin = standing(villainRight, 1.35), goblinShadow = blobShadow(.4); goblin.position.set(0, 0, z(practice.villain)); goblinShadow.position.set(0, .02, z(practice.villain));
  scene.add(goblin, goblinShadow);
  let goblinX: number = lane.left, goblinWay = 1, goblinRest = 0;
  const items = practiceItems.map(item => {
    const map = kit.clone(); map.needsUpdate = true; cell(map, 3, 2, item.atlas % 3, Math.floor(item.atlas / 3));
    const sprite = standing(map, .62), home = new THREE.Vector3(.75, .12, z(item.s)); sprite.position.copy(home); scene.add(sprite);
    return { ...item, sprite, home, stuck: false, told: false };
  });

  const start = resumeSpot(a);
  runner.place(.1, start >= practice.step[0] && start < practice.step[1] ? practice.stepHeight : 0, z(start));
  let held = true, state: DeliveryState | undefined, message = '', messageFor = 0, flipped = false, lastPole: Pole | undefined;
  let safeS = start, doneKey = '', focusZ = z(start), clock = 0;
  const falls = new Map<number, number>();
  const say = (text: string, seconds = 3.2) => { message = text; messageFor = seconds; };
  const magnetPoint = () => benchPoint(sOf(runner.position.z), lane.rail - runner.position.x, held);

  function step(dt: number, steer: RunSteer): Point {
    clock += dt; messageFor = Math.max(0, messageFor - dt);
    const closed = state?.wall === true;
    runner.step(dt, steer, { minX: lane.left, maxX: lane.right, minZ: z(courseEnd(closed)), maxZ: z(courseStart - 2) });
    let s = sOf(runner.position.z);
    if (runner.onFloor) safeS = s;
    if (runner.position.y < -4) {
      // No lives and no game over: back to the last point passed.
      const mark = checkpointFor(safeS), count = (falls.get(mark) || 0) + 1; falls.set(mark, count);
      runner.place(.1, 0, z(mark)); s = mark; safeS = mark; say(fallLine(count), 5);
    }
    // The goblin only makes the runner stumble. The cart and the records are untouched.
    goblinRest = Math.max(0, goblinRest - dt);
    goblinX += goblinWay * dt * 1.25;
    if (goblinX > lane.right - .1 || goblinX < lane.left + .1) { goblinWay *= -1; goblinX = Math.max(lane.left + .1, Math.min(lane.right - .1, goblinX)); }
    goblin.material.map = goblinWay > 0 ? goblinArt.right : goblinArt.left;
    cell(goblin.material.map, 6, 1, goblinRest > 0 ? 4 : 0, 0);
    goblin.position.set(goblinX, Math.abs(Math.sin(clock * 5)) * .06, z(practice.villain)); goblinShadow.position.x = goblinX;
    if (!goblinRest && !runner.busy && Math.hypot(runner.position.x - goblinX, runner.position.z - goblin.position.z) < .75 && runner.position.y < .9) {
      goblinRest = 1.6; runner.flinch(Math.sign(runner.position.z - goblin.position.z) || 1); say('도깨비와 부딪혔어! 괜찮아, 다시 지나가 보자.');
    }
    const magnet = magnetPoint();
    for (const item of items) {
      const at = { x: item.s, y: benchPoint(0, lane.rail - item.home.x, true).y };
      if (!item.stuck && held && pickupSticks(item.id, magnet, at)) { item.stuck = true; say(pickupLine(item.id, item.name), 4); }
      else if (!item.stuck && !item.told && held && Math.abs(s - item.s) < 1.6) { item.told = true; say(pickupLine(item.id, item.name), 4); }
    }
    return magnet;
  }

  function show(next: DeliveryState) {
    if (lost) return;
    const dt = 1 / 60;
    if (lastPole && lastPole !== next.pole) flipped = true;
    if (lastPole !== next.pole) { hand.set(next.pole); lastPole = next.pole; }
    const key = `${next.round}:${next.done}`;
    if (doneKey === `${next.round}:false` && next.done) runner.celebrate();
    // When the second stretch starts beyond the closed door, the runner comes back in front of it.
    if (next.wall && sOf(runner.position.z) > deliveryCourse.reach + .2) runner.place(.1, 0, z(40));
    if (state && next.round !== state.round) held = true;
    doneKey = key; state = next;

    cart.position.z = z(next.car);
    if (next.done) parcel.position.set(3.2, .25, z(next.goal) + .6); else parcel.position.set(lane.rail, .97, z(next.car));
    bays.forEach((item, i) => {
      const live = i === next.round, here = live && (next.atGoal || next.done) || i < next.round;
      item.paint.color.set(here ? '#89bd84' : '#ffe197'); item.paint.opacity = live || here ? .78 : .3;
      item.pennant.color.set(here ? '#25795f' : '#c46e22');
    });
    door.visible = next.wall; glassSign.visible = next.wall;
    const p = runner.position, lift = held ? 1 : .34;
    hand.group.position.set(p.x + .52, p.y + lift, p.z);
    hand.group.rotation.x = held ? 0 : Math.PI / 2;
    hand.materials.forEach(m => { m.transparent = !held; m.opacity = held ? 1 : .55; });
    hand.labels.forEach(label => { label.visible = held; });
    // Iron that stuck travels with the magnet; everything else stays where it lay.
    items.forEach((item, i) => { if (item.stuck) item.sprite.position.set(hand.group.position.x + .1, hand.group.position.y - .34, hand.group.position.z + .2 - i * .1); });
    const pulling = next.forceOn && next.cartMoving;
    arrow.visible = pulling; arrow.position.z = z(next.car); arrow.rotation.y = next.direction > 0 ? 0 : Math.PI;
    arrowPaint.color.set(next.attract ? '#167d76' : '#ac642c');
    link.visible = next.forceOn && !next.done;
    if (link.visible) {
      link.geometry.setFromPoints([hand.group.position.clone(), new THREE.Vector3(lane.rail - .68, .62, z(next.car))]);
      link.computeLineDistances(); (link.material as THREE.LineDashedMaterial).color.set(next.attract ? '#167d76' : '#ac642c');
    }
    spot.visible = next.guide !== null && sOf(p.z) >= practiceEnd - 6;
    if (next.guide !== null) { spot.position.z = z(next.guide); spot.scale.setScalar(1 + Math.sin(clock * 4) * .08); }
    // The friend walks where the runner was a moment ago.
    trail.push(p.clone()); if (trail.length > 26) trail.shift();
    const behind = trail[0], fx = behind.x - .55 - friend.sprite.position.x, fz = behind.z + .5 - friend.sprite.position.z;
    friend.face(fx, fz, Math.hypot(fx, fz) > .012, dt);
    friend.sprite.position.set(behind.x - .55, Math.max(0, behind.y), behind.z + .5); friendShadow.position.set(behind.x - .55, .02, behind.z + .5);
    friendShadow.visible = behind.y > -.3 && !(sOf(behind.z) > practice.gap[0] && sOf(behind.z) < practice.gap[1]);
    // Fixed chase camera. Near the cart it looks between the runner and the cart, so who is in front stays visible.
    const s = sOf(p.z), near = Math.abs(next.car - s) < 22 ? Math.max(-7, Math.min(2.5, (next.car - s) * .45)) : 0;
    focusZ += (z(s + near) - focusZ) * .12;
    camera.position.set(.9, 6.1, focusZ + 8.6); camera.lookAt(1.05, .75, focusZ - 1.2);
    if (backdrop) backdrop.position.set(0, 14, focusZ - 78);
    renderer.render(scene, camera);
  }

  let host: HTMLElement | undefined;
  const fit = () => {
    if (!host) return; const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1.5 ? 54 : 46; camera.updateProjectionMatrix();
    if (state) show(state);
  };
  const observer = new ResizeObserver(fit);
  return {
    get held() { return held; }, set held(value: boolean) { held = value; },
    get s() { return sOf(runner.position.z); },
    get message() { return messageFor > 0 ? message : state && sOf(runner.position.z) < practiceEnd ? practiceTip(sOf(runner.position.z), flipped) : ''; },
    get flipped() { return flipped; },
    attach(next) { observer.disconnect(); host = next; host.append(canvas); observer.observe(host); fit(); },
    step, show,
    dispose() {
      observer.disconnect(); canvas.removeEventListener('webglcontextlost', lose);
      scene.traverse(node => {
        const mesh = node as THREE.Mesh; if (!mesh.geometry && !(node as THREE.Sprite).isSprite) return;
        mesh.geometry?.dispose();
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { if (!material) continue; (material as THREE.MeshBasicMaterial).map?.dispose(); material.dispose(); }
      });
      for (const texture of [walk, poses, friendWalk, villainLeft, villainRight, kit, ground, skyline]) texture?.dispose();
      renderer.dispose(); canvas.remove();
    },
  };
}

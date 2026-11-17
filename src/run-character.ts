// The runner of the 3D course: a standing picture with a capsule for walking, jumping and landing.
// Movement follows the three.js games_fps example (capsule against an octree, five sub-steps a frame).
import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import type { Octree } from 'three/examples/jsm/math/Octree.js';
import type { RunSteer } from './run-input';

const GRAVITY = 28, JUMP = 9.5, RADIUS = .3, BODY = 1.1, STEPS = 5, GROUND_PUSH = 22, AIR_PUSH = 7;
export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

/** One cell of a sprite sheet. Rows count from the top, like the picture. */
export function cell(texture: THREE.Texture, columns: number, rows: number, column: number, row: number) {
  texture.repeat.set(1 / columns, 1 / rows);
  texture.offset.set(column / columns, 1 - (row + 1) / rows);
}
export function standing(texture: THREE.Texture, height: number, aspect = 1) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: .08 }));
  sprite.scale.set(height * aspect, height, 1); sprite.center.set(.5, .07);
  return sprite;
}
export function blobShadow(radius: number) {
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), new THREE.MeshBasicMaterial({ color: '#1d2b2a', transparent: true, opacity: .26, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  return shadow;
}

/** Walk sheets are four columns by four rows: facing the camera, left, right, away. */
export class Walker {
  readonly sprite: THREE.Sprite;
  private time = 0;
  constructor(private walk: THREE.Texture, height: number) { cell(walk, 4, 4, 0, 3); this.sprite = standing(walk, height); }
  face(dx: number, dz: number, moving: boolean, dt: number) {
    this.time = moving ? this.time + dt : 0;
    const row = !moving ? 3 : Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 1 : 2) : dz > 0 ? 0 : 3;
    cell(this.walk, 4, 4, Math.floor(this.time * 9) % 4, row);
  }
}

export class Runner {
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  onFloor = false;
  private capsule = new Capsule(new THREE.Vector3(0, RADIUS, 0), new THREE.Vector3(0, RADIUS + BODY, 0), RADIUS);
  private walker: Walker;
  private cheer: THREE.Sprite;
  private shadow = blobShadow(.42);
  private floor = 0;
  private stunned = 0;
  private cheering = 0;
  constructor(private world: Octree, walk: THREE.Texture, poses: THREE.Texture) {
    this.walker = new Walker(walk, 1.55);
    cell(poses, 4, 1, 3, 0); this.cheer = standing(poses, 1.7, .75); this.cheer.visible = false;
    this.group.add(this.shadow, this.walker.sprite, this.cheer);
  }
  place(x: number, y: number, z: number) {
    this.capsule.start.set(x, y + RADIUS, z); this.capsule.end.set(x, y + RADIUS + BODY, z);
    this.velocity.set(0, 0, 0); this.floor = y; this.sync();
  }
  /** A bump: a short stumble backwards. Nothing else changes. */
  flinch(awayZ: number) { this.stunned = .45; this.velocity.set(0, 3, awayZ * 3.2); this.onFloor = false; }
  celebrate() { this.cheering = 1.6; }
  get busy() { return this.stunned > 0; }
  step(dt: number, steer: RunSteer, bounds: Bounds) {
    this.stunned = Math.max(0, this.stunned - dt); this.cheering = Math.max(0, this.cheering - dt);
    const length = Math.hypot(steer.x, steer.y), free = this.stunned === 0;
    const dx = free && length ? steer.x / length : 0, dz = free && length ? -steer.y / length : 0;
    if (free && steer.jump && this.onFloor) { this.velocity.y = JUMP; this.onFloor = false; }
    const h = dt / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const push = h * (this.onFloor ? GROUND_PUSH : AIR_PUSH);
      this.velocity.x += dx * push; this.velocity.z += dz * push;
      let damping = Math.exp(-6 * h) - 1;
      if (!this.onFloor) { this.velocity.y -= GRAVITY * h; damping *= .1; }
      this.velocity.x += this.velocity.x * damping; this.velocity.z += this.velocity.z * damping;
      this.capsule.translate(this.velocity.clone().multiplyScalar(h));
      this.collide(); this.keepInside(bounds);
    }
    this.sync();
    if (this.onFloor) this.floor = this.position.y;
    const moving = Math.hypot(this.velocity.x, this.velocity.z) > .4;
    this.walker.face(this.velocity.x, this.velocity.z, moving, dt);
    const cheering = this.cheering > 0 && !moving;
    this.cheer.visible = cheering; this.walker.sprite.visible = !cheering;
    this.walker.sprite.material.color.set(this.stunned > 0 && Math.floor(this.stunned * 14) % 2 ? '#ff8a7a' : '#ffffff');
  }
  private collide() {
    const hit = this.world.capsuleIntersect(this.capsule);
    this.onFloor = false;
    if (!hit) return;
    this.onFloor = hit.normal.y > .15;
    if (this.onFloor) this.velocity.y = Math.min(0, this.velocity.y);
    else this.velocity.addScaledVector(hit.normal, -hit.normal.dot(this.velocity));
    if (hit.depth >= 1e-10) this.capsule.translate(hit.normal.multiplyScalar(hit.depth));
  }
  private keepInside(b: Bounds) {
    const p = this.capsule.start, x = Math.max(b.minX, Math.min(b.maxX, p.x)), z = Math.max(b.minZ, Math.min(b.maxZ, p.z));
    if (x !== p.x) this.velocity.x = 0;
    if (z !== p.z) this.velocity.z = 0;
    if (x !== p.x || z !== p.z) this.capsule.translate(new THREE.Vector3(x - p.x, 0, z - p.z));
  }
  private sync() {
    this.position.set(this.capsule.start.x, this.capsule.start.y - RADIUS, this.capsule.start.z);
    this.group.position.copy(this.position);
    // The round shadow stays on the last floor and shrinks while the runner is in the air.
    const lift = Math.max(0, this.position.y - this.floor);
    this.shadow.position.y = this.floor - this.position.y + .02;
    this.shadow.scale.setScalar(Math.max(.45, 1 - lift * .35));
    this.shadow.visible = this.position.y > this.floor - .3;
  }
}

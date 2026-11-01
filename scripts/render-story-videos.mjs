#!/usr/bin/env node
/*
 * Story cut-scene renderer (intro / final) for 밀고 당기는 도시.
 *
 *   source mp4 ──ffmpeg: pick frames → 1280x720 → warm grade + vignette
 *                → hold the last frame with a sub-pixel push-in (perspective) ──┐
 *   per-frame SVG (shapes only — never text) → sharp → raw RGBA → stdin ── overlay → fade-in → H.264
 *   SFX synthesized here (+ CC0 public/audio/reward.mp3) → WAV in scratch ───────────────────→ AAC
 *   then poster / end frames → webp.
 *
 *   node scripts/render-story-videos.mjs [intro|final]       render both (or one) into public/video/story/
 *   node scripts/render-story-videos.mjs --still <sec> <intro|final>   one PNG preview into the scratch dir
 *
 * Coordinates below were measured on the sources scaled to 1280x720; times are OUTPUT seconds.
 */
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/source/video/story');
const OUT = path.join(ROOT, 'public/video/story');
const TMP = process.env.STORY_SCRATCH || path.resolve(ROOT, '../_scratch/story-render');
const FFMPEG = [process.env.FFMPEG, path.join(ROOT, '.tools/ffmpeg/ffmpeg.exe'), 'D:/tools/ffmpeg/ffmpeg.exe']
  .find((p) => p && fs.existsSync(p)) || 'ffmpeg';
const W = 1280, H = 720, FPS = 30, SR = 44100, MAX_BYTES = 4.5e6;

// ---------- tiny animation helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, t0, d) => clamp((t - t0) / d);
const easeOut = (k) => 1 - (1 - k) ** 3;
const smooth = (k) => k * k * (3 - 2 * k);
const win = (t, a, b, fi = 0.4, fo = 0.4) => Math.min(prog(t, a, fi), 1 - prog(t, b - fo, fo));
const bump = (dt, w) => Math.exp(-((dt / w) ** 2));
const rng = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const f1 = (n) => n.toFixed(1);
const f3 = (n) => n.toFixed(3);
function spring(k, zeta = 0.42, w = 13) { // damped spring 0→1 with a little overshoot
  if (k <= 0) return 0;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * k) * (Math.cos(wd * k) + ((zeta * w) / wd) * Math.sin(wd * k));
}
function track(t, keys) { // keys [[t, a, b, ...]] → linear interpolation, held at both ends
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    if (t > keys[i][0]) continue;
    const a = keys[i - 1], b = keys[i], k = (t - a[0]) / (b[0] - a[0]);
    return a.slice(1).map((v, j) => lerp(v, b[j + 1], k));
  }
  return keys.at(-1).slice(1);
}

// ---------- SVG building blocks (game palette from src/quest.css) ----------
const P = { cream: '#fff8e7', gold: '#f4c35c', goldLight: '#ffe7a2', red: '#d94c43', blue: '#2875b7', teal: '#246c70' };
const DEFS = `<defs>
<radialGradient id="mote"><stop offset="0" stop-color="#fffbe9"/><stop offset=".3" stop-color="${P.goldLight}" stop-opacity=".75"/><stop offset="1" stop-color="${P.gold}" stop-opacity="0"/></radialGradient>
<linearGradient id="band"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fffdf5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="bandGold"><stop offset="0" stop-color="${P.goldLight}" stop-opacity="0"/><stop offset=".5" stop-color="#fff0c0"/><stop offset="1" stop-color="${P.goldLight}" stop-opacity="0"/></linearGradient>
<linearGradient id="ray" x2="0" y2="1"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".6"/><stop offset=".4" stop-color="#ffe9b0"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></linearGradient>
</defs>`;
const STAR = 'M0,-1 C.14,-.14 .14,-.14 1,0 C.14,.14 .14,.14 0,1 C-.14,.14 -.14,.14 -1,0 C-.14,-.14 -.14,-.14 0,-1Z';
const sparkle = (x, y, s, rot = 0, o = 1) => (s < 0.3 ? '' :
  `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${f3(o)}"><circle r="${f1(s * 1.4)}" fill="url(#mote)"/><path d="${STAR}" transform="scale(${f1(s)})" fill="#fffaf0"/></g>`);
const fullRect = (fill, o = 1) => `<rect width="${W}" height="${H}" fill="${fill}" opacity="${f3(o)}"/>`;
const radial = (id, cx, cy, r, stops) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}">${
  stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${f3(a)}"/>`).join('')}</radialGradient>${fullRect(`url(#${id})`)}`;

function motes(t, n = 20) { // slow golden dust, opacity ≤ .46
  const r = rng(11); let s = '';
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, y0 = r() * 780, v = 9 + r() * 15, size = 5 + r() * 7, ph = r() * 6.28, f = 0.7 + r() * 1.3;
    const y = (((y0 - v * t) % 780) + 780) % 780 - 30, x = x0 + 16 * Math.sin(t * 0.45 + ph);
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(size)}" fill="url(#mote)" opacity="${f3(0.14 + 0.32 * (0.5 + 0.5 * Math.sin(t * f * 2 + ph)))}"/>`;
  }
  return s;
}
function sweep(t, tc, { gold = false, flash = 0.3 } = {}) { // diagonal light band across a cut + brief flash
  const k = prog(t, tc - 0.24, 0.48);
  if (k <= 0 || k >= 1) return '';
  const x = lerp(-500, W + 500, smooth(k)), fo = flash * bump(t - tc, 0.11);
  return `<rect x="${f1(x - 170)}" y="-600" width="340" height="1920" fill="url(#${gold ? 'bandGold' : 'band'})" opacity="${gold ? 0.6 : 0.45}" transform="rotate(18 ${f1(x)} 360)"/>`
    + (fo > 0.005 ? fullRect(gold ? P.goldLight : '#fffdf5', fo) : '');
}
function burst(t, t0, x, y, { n = 12, r0 = 30, r1 = 300, size = 16, dur = 1.1, spin = 0.26 } = {}) { // ring of sparkles flying out
  const k = prog(t, t0, dur);
  if (k <= 0 || k >= 1) return '';
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI + spin, rad = lerp(r0, r1, easeOut(k));
    s += sparkle(x + rad * Math.cos(a), y + rad * Math.sin(a), size * Math.sin(Math.PI * k) ** 0.6, 90 * k, 1 - k ** 3);
  }
  return s;
}

// ---------- INTRO effects ----------
const CLIPS = [[6.5, 790, 602], [8, 791, 604], [9.5, 792, 606], [10.5, 793, 607]]; // paper-clip cluster on the bar magnet's end
function clueSpot(t) {
  const e = win(t, 6.8, 10.8, 0.45, 0.5); if (e <= 0) return '';
  const [cx, cy] = track(t, CLIPS);
  return radial('spot', cx, cy, 300, [[0.57, '#1c1208', 0], [1, '#1c1208', 0.25 * e]]); // clear inside 170px, ≤25% darker outside
}
function clueFx(t) {
  const e = win(t, 6.8, 10.8, 0.45, 0.5); if (e <= 0) return '';
  const [cx, cy] = track(t, CLIPS), mx = cx - 56, my = cy - 28; // magnet end face, just left of the clips
  let s = '';
  for (let i = 0; i < 3; i++) { // field waves: short arcs leaving the pole toward the clips (stay well short of the wood/aluminium)
    const ph = (t - 6.9) / 1.35 - i / 3; if (ph < 0) continue;
    const k = ph % 1, r = 14 + 60 * easeOut(k), a0 = -0.55, a1 = 1.05;
    s += `<path d="M${f1(mx + r * Math.cos(a0))},${f1(my + r * Math.sin(a0))} A${f1(r)},${f1(r)} 0 0 1 ${f1(mx + r * Math.cos(a1))},${f1(my + r * Math.sin(a1))}" fill="none" stroke="${P.goldLight}" stroke-width="${f1(4 - 2.2 * k)}" stroke-linecap="round" opacity="${f3(e * 0.9 * (1 - k) ** 1.2)}"/>`;
  }
  const sc = spring(prog(t, 6.8, 1.4));
  s += `<g transform="translate(${f1(cx)} ${f1(cy)}) rotate(${f1(16 * (t - 6.8))}) scale(${f3(sc)})" opacity="${f3(e)}"><circle r="64" fill="none" stroke="${P.goldLight}" stroke-opacity=".35" stroke-width="11"/><circle r="64" fill="none" stroke="${P.gold}" stroke-width="4" stroke-dasharray="15 10" stroke-linecap="round"/></g>`;
  for (const [t0, seed] of [[7.0, 3], [8.4, 5]]) {
    const r = rng(seed);
    for (let i = 0; i < 5; i++) {
      const ang = r() * 6.28, rad = 50 + r() * 38, size = 9 + r() * 8, k = prog(t, t0 + i * 0.07, 0.6);
      if (k > 0 && k < 1) s += sparkle(cx + rad * Math.cos(ang), cy + rad * Math.sin(ang) * 0.8, size * Math.sin(Math.PI * k), 90 * k);
    }
  }
  return s;
}
function godRays(t, a) { // shimmering window light from the top-centre, ≤ .18
  if (a <= 0) return '';
  let s = '';
  for (let i = 0; i < 7; i++) {
    const ang = -30 + i * 10 + 1.5 * Math.sin(t * 0.3 + i), w = 70 + (i % 3) * 22;
    const o = a * 0.18 * (0.55 + 0.45 * Math.sin(t * (0.8 + i * 0.13) + i * 1.7));
    s += `<polygon points="-14,0 14,0 ${w},860 ${-w},860" fill="url(#ray)" opacity="${f3(o)}" transform="translate(640 -90) rotate(${f1(ang)})"/>`;
  }
  return s;
}
const bloom = (t, t0) => {
  const k = easeOut(prog(t, t0, 1.4));
  return k <= 0 ? '' : radial('bloom', 640, 340, 760, [[0, P.goldLight, 0.2 * k], [0.55, P.gold, 0.06 * k], [1, P.gold, 0]]);
};

// ---------- FINAL effects ----------
const ARRIVAL = [4.0, 812, 468]; // frame 120: cart settles against the gold stopper (steel plate / brass ball junction)
const AQUA_EDGE = [[5.3, 400], [6.2, 450], [7.0, 500], [7.6, 540], [8.3, 560], [9.0, 530], [9.5, 440], [10.0, 220]];
const TWINKLES = [[6.1, 418, 70], [7.25, 930, 352], [8.35, 1040, 300]]; // aquarium glass, cart handle, post box
const MEDAL = [[10.73, 643, 349, 146], [11.5, 646, 355, 128], [12.27, 646, 363, 114]]; // rim centre x, y, horizontal radius (rim is ~0.9 as tall)
const SCROLL_TOP = 412; // top of the scroll lying in front of the medal (source frame 368)
function bubbles(t) {
  const a = win(t, 5.35, 9.6, 0.5, 0.7); if (a <= 0) return '';
  const [edge] = track(t, AQUA_EDGE), r = rng(21);
  let s = `<clipPath id="aq"><rect width="${f1(Math.max(0, edge - 25))}" height="440"/></clipPath><g clip-path="url(#aq)">`;
  for (let i = 0; i < 16; i++) {
    const x0 = 25 + r() * 330, v = 45 + r() * 45, rad = 3 + r() * 5, ph = r() * 6.28, y0 = r() * 430;
    const y = 440 - ((y0 + v * t) % 430), x = x0 + 5 * Math.sin(t * 2.6 + ph), o = a * 0.65 * clamp(y / 120);
    s += `<g opacity="${f3(o)}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad)}" fill="#eafcff" fill-opacity=".1" stroke="#f2fdff" stroke-width="1.4"/><circle cx="${f1(x - rad * 0.35)}" cy="${f1(y - rad * 0.35)}" r="${f1(rad * 0.28)}" fill="#fff"/></g>`;
  }
  return `${s}</g>`;
}
function impact(t, [t0, x, y]) {
  let s = '';
  for (const [d, r1, wd] of [[0, 110, 7], [0.1, 72, 4]]) {
    const k = prog(t, t0 + d, 0.7);
    if (k > 0 && k < 1) s += `<circle cx="${x}" cy="${y}" r="${f1(10 + r1 * easeOut(k))}" fill="none" stroke="${d ? P.gold : P.goldLight}" stroke-width="${f1(wd * (1 - k) + 1)}" opacity="${f3(0.9 * (1 - k) ** 1.3)}"/>`;
  }
  return s + burst(t, t0, x, y, { n: 8, r0: 14, r1: 95, size: 13, dur: 0.75, spin: 0.2 });
}
function medalRays(t, mx, my, R, a) { // wedges start at the rim so they read as light from behind the medal
  if (a <= 0) return '';
  let s = `<radialGradient id="mr" gradientUnits="userSpaceOnUse" cx="${f1(mx)}" cy="${f1(my)}" r="${f1(R * 3)}"><stop offset=".3" stop-color="${P.goldLight}" stop-opacity="0"/><stop offset=".38" stop-color="${P.goldLight}" stop-opacity="${f3(0.42 * a)}"/><stop offset="1" stop-color="${P.gold}" stop-opacity="0"/></radialGradient><clipPath id="mc"><rect width="${W}" height="${f1(my + 0.85 * R)}"/></clipPath><g fill="url(#mr)" clip-path="url(#mc)">`;
  for (let i = 0; i < 14; i++) {
    const c = ((i / 14) * 360 + 5 * t) * (Math.PI / 180), w = (i % 2 ? 4.5 : 7) * (Math.PI / 180);
    const pt = (ang, rr) => `${f1(mx + rr * Math.cos(ang))},${f1(my + rr * Math.sin(ang))}`;
    s += `<polygon points="${pt(c - w * 0.35, R)} ${pt(c + w * 0.35, R)} ${pt(c + w, R * 3)} ${pt(c - w, R * 3)}" opacity="${i % 2 ? 0.6 : 1}"/>`;
  }
  return `${s}</g>`;
}
function glint(t, t0, mx, my, R, yCut) { // diagonal shine across the medal face (stops above the scroll)
  const k = prog(t, t0, 0.55);
  if (k <= 0 || k >= 1) return '';
  const x = lerp(mx - 1.4 * R, mx + 1.4 * R, smooth(k));
  return `<clipPath id="gc"><ellipse cx="${f1(mx)}" cy="${f1(my)}" rx="${f1(R * 0.94)}" ry="${f1(R * 0.85)}"/></clipPath><clipPath id="gr"><rect width="${W}" height="${f1(yCut)}"/></clipPath>`
    + `<g clip-path="url(#gr)"><g clip-path="url(#gc)"><rect x="${f1(x - R * 0.2)}" y="${f1(my - 2 * R)}" width="${f1(R * 0.4)}" height="${f1(4 * R)}" fill="url(#band)" opacity=".85" transform="rotate(25 ${f1(x)} ${f1(my)})"/></g></g>`;
}
const CONFETTI = [P.red, P.blue, P.gold, P.goldLight, P.cream, P.teal];
function confetti(t, t0, seed, n = 60) { // one burst from the top edge, gone after ~3s (no loop)
  const tau = t - t0;
  if (tau < 0 || tau > 3.2) return '';
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) {
    const x0 = 40 + r() * 1200, y0 = -20 - r() * 70, vx = (r() - 0.5) * 380, v0 = 300 + r() * 220, vt = 200 + r() * 80;
    const life = 2.6 + r() * 0.5, spin = (r() - 0.5) * 720, ph = r() * 6.28, isRect = r() < 0.6, w = 7 + r() * 5, h = 11 + r() * 7;
    if (tau > life) continue;
    const x = x0 + (vx * (1 - Math.exp(-1.8 * tau))) / 1.8 + 16 * Math.sin(tau * 3.2 + ph);
    const y = y0 + vt * tau + ((v0 - vt) * (1 - Math.exp(-2.2 * tau))) / 2.2;
    const flip = Math.cos(tau * 6 + ph), o = 1 - prog(tau, life - 0.45, 0.45);
    const tf = `translate(${f1(x)} ${f1(y)}) rotate(${f1(spin * tau + ph * 57)}) scale(1 ${f3(Math.max(0.15, Math.abs(flip)))})`;
    s += isRect
      ? `<rect x="${f1(-w / 2)}" y="${f1(-h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="1.5" fill="${CONFETTI[i % 6]}" opacity="${f3(o)}" transform="${tf}"/>`
      : `<circle r="${f1(w * 0.55)}" fill="${CONFETTI[i % 6]}" opacity="${f3(o)}" transform="${tf}"/>`;
  }
  return s;
}
const goldPulse = (t, t0) => {
  const k = easeOut(prog(t, t0, 0.9));
  return k <= 0 ? '' : radial('gv', 640, 360, 780, [[0.5, P.gold, 0], [1, '#e2a541', k * (0.15 + 0.07 * Math.sin((t - t0) * 2 * Math.PI * 0.55))]]);
};

// ---------- per-video timelines ----------
// keep: source frames used (select expr), K = their count, F = held frames after them (push-in zoom about zc).
const VIDEOS = {
  intro: {
    src: 'intro-original-20261101.mp4', keep: 'lte(n\\,458)', K: 459, F: 66, zoom: 0.05, zc: [640, 360], ease: 'out', poster: 3.0,
    // source luma starts dropping at 15.3s (fade to black), so the hold uses frame 458 (15.27s)
    overlay: (t) => clueSpot(t) + godRays(t, win(t, 11.72, 99, 0.9, 0)) + bloom(t, 15.3) + motes(t) + clueFx(t)
      + burst(t, 15.4, 640, 350) + sweep(t, 5.2) + sweep(t, 11.72),
    sfx: [['whoosh', 5.2, 1], ['ding', 7.0, 1318.5], ['whoosh', 11.72, 0.9], ['chime', 15.3]],
  },
  final: {
    // the source defocuses at 12.30–12.73s (frames 369–382) and 13.0–13.2s and blurs its background at 13.37–13.43s,
    // so the festival shot ends on sharp frame 368 (12.27s) and that frame is held to the end (5.1s)
    src: 'final-original-20261101.mp4', keep: 'lte(n\\,368)', K: 369, F: 153, zoom: 0.08, zc: [646, 363], ease: 'inout', poster: 3.5,
    overlay: (t, i) => {
      const v = VIDEOS.final, z = zoomAt(v, i), [mx, my, R0] = track(t, MEDAL), R = R0 * z;
      const yCut = my + (SCROLL_TOP - my) * z;
      return medalRays(t, mx, my, R, win(t, 10.73, 99, 0.7, 0)) + goldPulse(t, 12.3) + motes(t) + bubbles(t)
        + TWINKLES.map(([t0, x, y]) => { const k = prog(t, t0, 0.6); return k > 0 && k < 1 ? sparkle(x, y, 18 * Math.sin(Math.PI * k), 60 * k) : ''; }).join('')
        + impact(t, ARRIVAL) + glint(t, 12.2, mx, my, R, yCut) + glint(t, 15.0, mx, my, R, yCut)
        + confetti(t, 11.0, 101) + confetti(t, 13.6, 202) + sweep(t, 5.3, { flash: 0.28 }) + sweep(t, 10.733, { gold: true, flash: 0.4 });
    },
    sfx: [['clack', 4.0], ['ding', 4.06, 1568], ['whoosh', 5.3, 1], ['whoosh', 10.733, 1.5], ['fanfare', 11.0], ['pop', 13.6], ['sparkle', 15.0]],
  },
};
const easeExpr = (v, p) => (v.ease === 'out' ? `sin(${p}*PI/2)` : `(${p}*${p}*(3-2*${p}))`);
function zoomAt(v, i) {
  const p = clamp((i - v.K + 1) / v.F);
  return 1 + v.zoom * (v.ease === 'out' ? Math.sin((p * Math.PI) / 2) : smooth(p));
}
function graph(v, tail = '') {
  const z = `(1+${v.zoom}*${easeExpr(v, `(in/${v.F})`)})`, [cx, cy] = v.zc;
  const x0 = `${cx}-${cx}/${z}`, x1 = `${cx}+${W - cx}/${z}`, y0 = `${cy}-${cy}/${z}`, y1 = `${cy}+${H - cy}/${z}`;
  return [
    `[0:v]select='${v.keep}',setpts=N/${FPS}/TB,scale=${W}:${H}:flags=lanczos,setsar=1,eq=contrast=1.04:saturation=1.08,colorbalance=rm=.03:bm=-.03,vignette=angle=0.42,split[a][b]`,
    `[b]trim=start_frame=${v.K - 1},setpts=N/${FPS}/TB,tpad=stop_mode=clone:stop=${v.F},perspective=x0='${x0}':y0='${y0}':x1='${x1}':y1='${y0}':x2='${x0}':y2='${y1}':x3='${x1}':y3='${y1}':interpolation=cubic:eval=frame,trim=start_frame=1,setpts=N/${FPS}/TB[fz]`,
    '[a][fz]concat=n=2:v=1:a=0[base]',
    `[base][1:v]overlay=format=auto,fade=t=in:st=0:d=0.45,format=yuv420p${tail}[v]`,
  ].join(';');
}
const svg = (v, i) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${DEFS}${v.overlay(i / FPS, i)}</svg>`;
const overlayFrame = (v, i) => sharp(Buffer.from(svg(v, i))).ensureAlpha().raw().toBuffer();

// ---------- SFX (mono generators → stereo mix, peak-normalised to -6 dBFS) ----------
const noise = (seed) => { const r = rng(seed); return () => r() * 2 - 1; };
function svf(fc, q) { // Chamberlin state-variable band-pass, fc may change per sample
  let low = 0, band = 0;
  return (x, f = fc) => { const g = 2 * Math.sin((Math.PI * f) / SR); low += g * band; band += g * (x - low - q * band); return band; };
}
function bellTone(f, dur = 1.2, decay = 0.5, partials = [[1, 1], [2, 0.28], [3, 0.1], [4.2, 0.05]]) {
  const out = new Float32Array(Math.round(dur * SR));
  for (const [m, a] of partials) for (let i = 0; i < out.length; i++) {
    const t = i / SR; out[i] += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp((-t * m) / decay) * Math.min(1, t / 0.004);
  }
  return out;
}
function whoosh(dur = 0.7) {
  const out = new Float32Array(Math.round(dur * SR)), nz = noise(5), bp = svf(400, 1.1);
  for (let i = 0; i < out.length; i++) { const k = i / out.length; out[i] = 2.2 * bp(nz(), 250 + 2300 * Math.sin(Math.PI * k) ** 2) * Math.sin(Math.PI * k ** 0.8) ** 2; }
  return out;
}
function clack() {
  const out = new Float32Array(Math.round(0.14 * SR)), nz = noise(9), bp = svf(2400, 0.35);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = 1.4 * bp(nz()) * Math.exp(-t / 0.012) + 0.6 * Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t / 0.04) + 0.3 * Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t / 0.015);
  }
  return out;
}
function pop() {
  const out = new Float32Array(Math.round(0.16 * SR)); let ph = 0;
  for (let i = 0; i < out.length; i++) { const t = i / SR; ph += (2 * Math.PI * (220 + 700 * Math.exp(-t / 0.02))) / SR; out[i] = Math.sin(ph) * Math.exp(-t / 0.05) * Math.min(1, t / 0.002); }
  return out;
}
function decode(file) { // CC0 mp3 → mono float
  const r = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', `${SR}`, '-'], { maxBuffer: 1 << 26 });
  if (r.status) throw new Error(`decode failed: ${file}`);
  return new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
}
function mixSfx(cues, dur) {
  const n = Math.round(dur * SR), L = new Float32Array(n), R = new Float32Array(n);
  const add = (t0, sig, gain = 1, pan = 0) => { // pan: number or k → pan (-1..1)
    const i0 = Math.round(t0 * SR);
    for (let i = 0; i < sig.length; i++) {
      const j = i0 + i; if (j < 0 || j >= n) continue;
      const p = typeof pan === 'function' ? pan(i / sig.length) : pan, a = ((p + 1) * Math.PI) / 4;
      L[j] += sig[i] * gain * Math.cos(a); R[j] += sig[i] * gain * Math.sin(a);
    }
  };
  const arp = (t0, notes, step, gain, decay) => notes.forEach((f, i) => add(t0 + i * step, bellTone(f, decay * 2.4, decay), gain * (1 - i * 0.08), -0.4 + (0.8 * i) / (notes.length - 1)));
  for (const [kind, t, x = 1] of cues) {
    if (kind === 'whoosh') add(t - 0.4, whoosh(0.7), 0.32 * x, (k) => lerp(-0.6, 0.6, k)); // peaks on the cut, travels with the light band
    if (kind === 'ding') { add(t, bellTone(x, 1.6, 0.55), 0.8); add(t, bellTone(x * 2, 0.9, 0.25), 0.16); }
    if (kind === 'chime') arp(t, [784, 1047, 1319, 1568, 2093], 0.11, 0.42, 0.7);
    if (kind === 'clack') add(t, clack(), 0.5);
    if (kind === 'fanfare') { add(t, decode(path.join(ROOT, 'public/audio/reward.mp3')), 0.9); arp(t + 0.05, [1047, 1319, 1568, 2093], 0.08, 0.3, 0.4); }
    if (kind === 'pop') add(t, pop(), 0.7);
    if (kind === 'sparkle') [3136, 3951, 3520, 4699, 4186].forEach((f, i) => add(t + i * 0.05, bellTone(f, 0.5, 0.14, [[1, 1], [2.01, 0.2]]), 0.22, i % 2 ? 0.5 : -0.5));
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 10 ** (-6 / 20) / peak;
  const b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.round(clamp(L[i] * g, -1, 1) * 32767), 44 + i * 4); b.writeInt16LE(Math.round(clamp(R[i] * g, -1, 1) * 32767), 46 + i * 4); }
  return b;
}

// ---------- render / still ----------
async function render(name, crf) {
  const v = VIDEOS[name], N = v.K + v.F, wav = path.join(TMP, `${name}-sfx.wav`), out = path.join(OUT, `${name}.mp4`);
  fs.writeFileSync(wav, mixSfx(v.sfx, N / FPS));
  const ff = spawn(FFMPEG, ['-v', 'error', '-y', '-i', path.join(SRC, v.src),
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', `${FPS}`, '-i', '-', '-i', wav,
    '-filter_complex', graph(v), '-map', '[v]', '-map', '2:a', '-frames:v', `${N}`,
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', `${crf}`, '-pix_fmt', 'yuv420p', '-r', `${FPS}`,
    '-c:a', 'aac', '-b:a', '96k', '-ar', `${SR}`, '-ac', '2', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = once(ff, 'close');
  ff.stdin.on('error', () => {}); // a failing ffmpeg reports through its exit code
  for (let i = 0; i < N; i += 8) {
    const batch = await Promise.all(Array.from({ length: Math.min(8, N - i) }, (_, j) => overlayFrame(v, i + j)));
    for (const buf of batch) if (!ff.stdin.write(buf)) await Promise.race([once(ff.stdin, 'drain'), closed]);
  }
  ff.stdin.end();
  const [code] = await closed;
  if (code) throw new Error(`ffmpeg exited ${code} (${name})`);
  return out;
}
async function grab(mp4, idx, file) {
  const r = spawnSync(FFMPEG, ['-v', 'error', '-i', mp4, '-vf', `select='eq(n\\,${idx})'`, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], { maxBuffer: 1 << 26 });
  if (r.status || !r.stdout.length) throw new Error(`frame grab failed: ${file}`);
  await sharp(r.stdout).webp({ quality: 82 }).toFile(file);
}
async function still(name, sec) {
  const v = VIDEOS[name], i = Math.min(v.K + v.F - 1, Math.round(sec * FPS)), png = path.join(TMP, `overlay-${name}.png`);
  await sharp(Buffer.from(svg(v, i))).png().toFile(png);
  const out = path.join(TMP, `still-${name}-${sec}.png`);
  const r = spawnSync(FFMPEG, ['-v', 'error', '-y', '-i', path.join(SRC, v.src), '-loop', '1', '-framerate', `${FPS}`, '-i', png,
    '-filter_complex', graph(v, `,select='eq(n\\,${i})'`), '-map', '[v]', '-frames:v', '1', '-update', '1', out], { stdio: 'inherit' });
  if (r.status) throw new Error('still failed');
  console.log(out);
}

fs.mkdirSync(TMP, { recursive: true });
const args = process.argv.slice(2);
if (args[0] === '--still') {
  await still(args[2] || 'intro', Number(args[1]));
} else {
  fs.mkdirSync(OUT, { recursive: true });
  for (const name of args.length ? args : Object.keys(VIDEOS)) {
    if (!VIDEOS[name]) throw new Error(`unknown video: ${name}`);
    let mp4, crf = 23;
    for (;; crf += 2) { mp4 = await render(name, crf); if (fs.statSync(mp4).size <= MAX_BYTES || crf >= 29) break; } // raise crf until it fits
    const v = VIDEOS[name], N = v.K + v.F;
    await grab(mp4, Math.round(v.poster * FPS), path.join(OUT, `${name}-poster.webp`));
    await grab(mp4, N - 1, path.join(OUT, `${name}-end.webp`));
    console.log(`${name}: ${(fs.statSync(mp4).size / 1e6).toFixed(2)} MB, crf ${crf}, ${(N / FPS).toFixed(2)} s`);
  }
}

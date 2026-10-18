export const icon = (name: string, size = 22): string => {
  const paths: Record<string, string> = {
    gear: '<path d="m10 2-.7 2.5-2 .9-2.3-.7-2 3.5 1.7 1.8v2.3L3 14l2 3.5 2.3-.7 2 .9L10 20h4l.7-2.3 2-.9 2.3.7 2-3.5-1.7-1.7V10L21 8.2l-2-3.5-2.3.7-2-.9L14 2z"/><circle cx="12" cy="11" r="3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
    home: '<path d="m3 10 9-7 9 7M6 9v12h12V9M10 21v-7h4v7"/>', book: '<path d="M12 5v16M3 4h5a4 4 0 0 1 4 3 4 4 0 0 1 4-3h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z"/>',
    sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>', mute: '<path d="m11 4-6 5H2v6h3l6 5zM16 9l5 6m0-6-5 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>', lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>', spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
    flask: '<path d="M9 3h6m-5 0v7L4 19q-1 2 2 2h12q3 0 2-2l-6-9V3M7 15h10"/>', print: '<path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>', map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zm6-2v16m6-14v16"/>',
    light: '<path d="M8 15a7 7 0 1 1 8 0v3H8zM9 22h6m-3-11v7"/>', play: '<path d="m8 4 12 8-12 8z"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
};
export function mascot(type: 'mili' | 'dangi' = 'mili', size = 110, pose = 0): string {
  return `<span class="mascot sprite-mascot ${type}" role="img" aria-label="${type === 'mili' ? '밀이' : '당이'}" style="--size:${size}px;--pose:${Math.max(0, Math.min(3, pose))};background-image:url('/assets/adventure/${type}-poses-tablet.webp')"></span>`;
}
export function magnet(pole = 'N', cls = ''): string { return `<div class="bar-magnet ${pole === 'S' ? 'flipped' : ''} ${cls}"><span>N</span><span>S</span></div>`; }
export function objectArt(id: string): string {
  const content: Record<string, string> = {
    clip: '<path d="M63 33 39 71c-15 22-36 4-23-14l29-41c10-15 31-2 20 13L39 67c-5 7-13 1-8-6l23-32" fill="none" stroke="#77929f" stroke-width="7" stroke-linecap="round"/>',
    nail: '<path d="m53 17-6 5-18 60 8-5 22-54" fill="#a1b2ba" stroke="#657f91" stroke-width="2"/><path d="m42 15 26 8" stroke="#627c8c" stroke-width="8" stroke-linecap="round"/>',
    aluminum: '<path d="m16 28 49-12 15 48-49 13z" fill="#cedbe3" stroke="#94aabb" stroke-width="2"/><path d="m22 34 42-10M28 56l39-14" stroke="#edf4f8" stroke-width="5"/>',
    wood: '<rect x="16" y="23" width="64" height="52" rx="5" fill="#cda170"/><path d="M21 37q20-8 52 0M23 50q32-9 49 0M22 64q20-8 50-1" fill="none" stroke="#a77b52" stroke-width="3"/>',
    plastic: '<rect x="20" y="23" width="60" height="53" rx="8" fill="#f3b64b"/><path d="M20 35h60M31 23v12m15-12v12m15-12v12" stroke="#d48a34" stroke-width="3"/><path d="M30 47h40v18H30z" fill="#ffd780"/>',
    rubber: '<path d="m20 32 48-12 12 38-49 16z" fill="#e88583"/><path d="m50 25 18-5 12 38-18 6z" fill="#8bc2d5"/><path d="m25 37 38-9" stroke="#f6b4ac" stroke-width="4"/>',
  };
  return `<svg viewBox="0 0 96 96" role="img" aria-label="${id}">${content[id] || content.clip}</svg>`;
}

import type { Save } from './domain';
import './autoplay-controls.css';

export const autoplaySpeed = (settings: Save['settings']) => settings.autoplaySpeed === 2 ? 2 : 1;

export function autoplaySpeedMarkup(settings: Save['settings']): string {
  return `<label class="autoplay-speed"><span>속도</span><select data-autoplay-speed aria-label="자동재생 속도"><option value="1" ${autoplaySpeed(settings) === 1 ? 'selected' : ''}>1배</option><option value="2" ${autoplaySpeed(settings) === 2 ? 'selected' : ''}>2배</option></select></label>`;
}

export function bindAutoplaySpeed(root: HTMLElement, settings: Save['settings'], changed: () => void) {
  const select = root.querySelector<HTMLSelectElement>('[data-autoplay-speed]');
  const change = () => {
    settings.autoplaySpeed = select?.value === '2' ? 2 : 1;
    changed();
  };
  select?.addEventListener('change', change);
  return () => select?.removeEventListener('change', change);
}

import type { Activity, Save } from './domain';
import { icon } from './art';
export interface Context { screen: number; s: Save; a: Activity; root: HTMLElement; refresh: () => void; touch: () => void; meta: () => void; notify: (text: string) => void }
export interface View { html: string; bind: (c: Context) => (() => void) | void }
export function btn(action: string, label: string, options = '') { return `<button class="btn ${options.includes('primary') ? 'primary' : 'soft'}" data-act="${action}" ${options.includes('disabled') ? 'disabled' : ''}>${label}</button>`; }
export function choice(action: string, label: string, selected: boolean, done = false) { return `<button class="choice ${selected ? 'selected' : ''} ${done ? 'done' : ''}" data-act="${action}" aria-pressed="${selected}">${done ? icon('check', 16) : ''}${label}</button>`; }
export function on(c: Context, action: string, fn: () => void) { c.root.querySelectorAll<HTMLButtonElement>(`[data-act="${action}"]`).forEach(b => b.addEventListener('click', fn)); }
export function update(c: Context) { c.touch(); c.refresh(); }
export function range(c: Context, id: string, fn: (n: number) => void) { const input = c.root.querySelector<HTMLInputElement>(`#${id}`); input?.addEventListener('change', () => fn(Number(input.value))); input?.addEventListener('input', () => { const output = c.root.querySelector(`[data-for="${id}"]`); if (output) output.textContent = input.value; }); }
export function hint(text: string) { return `<div class="experiment-hint">${icon('light', 18)}<span>${text}</span></div>`; }
export function readout(text: string, positive = false) { return `<div class="readout ${positive ? 'positive' : ''}" role="status">${icon(positive ? 'check' : 'eye', 18)}${text}</div>`; }

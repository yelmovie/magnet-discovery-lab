import type { Save } from './domain';
import { normalizedAudioSettings, playEffect, syncAudioSettings, type AudioSettings } from './game-audio';
import { settingsContent as copy } from './settings-content';
import './game-settings.css';

export interface GameSettingsOptions {
  save: Save;
  admin: boolean;
  onChange: (save: Save) => void;
  onAdminToggle: (enabled: boolean) => void;
  onStory: () => void;
  onEnding: () => void;
  onCertificate: () => void;
  onRecords: () => void;
  /** Reset progress but preserve save.settings music/effects/musicVolume/sound. */
  onReset: () => void;
  /** Pause experiment input and map movement while the modal is open. */
  onPause: (paused: boolean) => void;
}

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const paragraphs = (lines: readonly string[]) => lines.map(line => `<p>${escape(line)}</p>`).join('');
const fold = (name: string, body: string, nested = false) => `<details class="settings-fold${nested ? ' settings-fold--nested' : ''}"><summary>${escape(name)}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg></summary><div class="settings-fold-body">${body}</div></details>`;
const closeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
const arrowIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12m-5-5 5 5-5 5"/></svg>';

function markup(options: GameSettingsOptions) {
  const settings = normalizedAudioSettings(options.save.settings as AudioSettings), complete = options.save.final.complete || options.admin;
  const switchRow = (key: 'music' | 'effects', name: string, on: boolean) => `<div class="settings-sound-row"><span id="settings-${key}-label">${name}</span><button class="settings-switch" type="button" data-sound="${key}" aria-labelledby="settings-${key}-label settings-${key}-state" aria-pressed="${on}"><span id="settings-${key}-state">${on ? copy.on : copy.off}</span><i aria-hidden="true"></i></button></div>`;
  const teacher = paragraphs(copy.teacherGuide)
    + fold(copy.standards, `<p>${copy.standardsNotice}</p><dl class="settings-standards">${copy.standardsList.map(([code, text]) => `<div><dt>[${code}]</dt><dd>${text}</dd></div>`).join('')}</dl>`, true)
    + fold(copy.tools, `<p>${copy.toolsDescription}</p><button type="button" class="settings-button settings-admin" data-settings-action="admin" aria-pressed="${options.admin}">${options.admin ? copy.unlocked : copy.unlock}</button><p>${copy.toolsNote}</p>`, true);
  const copyright = paragraphs(copy.copyrightGuide)
    + fold(copy.sources, `<p>${copy.sourcesIntroduction}</p><dl class="settings-sources">${copy.sourceGroups.map(([name, text]) => `<div><dt>${name}</dt><dd>${text}</dd></div>`).join('')}</dl>`, true)
    + paragraphs([copy.copyrightOwner, copy.ownRights, copy.externalRights, copy.educationSources]);
  return `<header class="settings-dialog-heading"><h2 id="settings-dialog-title">${copy.title}</h2><button type="button" class="settings-close-icon" data-settings-action="close" aria-label="${copy.close}">${closeIcon}</button></header>
    <div class="settings-dialog-body">
      <section class="settings-sound" aria-label="${copy.music}">
        ${switchRow('music', copy.music, settings.music)}${switchRow('effects', copy.effects, settings.effects)}
        <label class="settings-volume" for="settings-music-volume"><span>${copy.volume}</span><output id="settings-volume-output" for="settings-music-volume">${Math.round(settings.musicVolume * 100)}%</output><input id="settings-music-volume" type="range" min="0" max="100" step="5" value="${Math.round(settings.musicVolume * 100 / 5) * 5}" ${settings.music ? '' : 'disabled'} /></label>
      </section>
      <div class="settings-replays">
        <button type="button" class="settings-button settings-story" data-settings-action="story">${copy.story}${arrowIcon}</button>
        <div class="settings-replay-row"><button type="button" class="settings-button" data-settings-action="ending" ${complete ? '' : 'disabled aria-describedby="settings-ending-lock"'}>${copy.ending}</button>${complete ? '' : `<p id="settings-ending-lock">${copy.endingLocked}</p>`}</div>
        <div class="settings-replay-row"><button type="button" class="settings-button" data-settings-action="certificate" ${complete ? '' : 'disabled aria-describedby="settings-certificate-lock"'}>${copy.certificate}</button>${complete ? '' : `<p id="settings-certificate-lock">${copy.certificateLocked}</p>`}</div>
      </div>
      ${fold(copy.information, `<dl class="settings-about">${copy.about.map(([name, text]) => `<div><dt>${name}</dt><dd>${text}</dd></div>`).join('')}</dl><button type="button" class="settings-button settings-records" data-settings-action="records">${copy.records}${arrowIcon}</button><p>${copy.recordsNote}</p><p class="settings-signature">${copy.signature}</p>`)}
      ${fold(copy.student, paragraphs(copy.studentGuide))}
      ${fold(copy.teacher, teacher)}
      ${fold(copy.copyright, copyright)}
    </div>
    <footer class="settings-dialog-footer"><button type="button" class="settings-button settings-reset" data-settings-action="reset">${copy.reset}</button><button type="button" class="settings-button settings-primary" data-settings-action="close">${copy.close}</button></footer>`;
}

/** Uses native modal focus handling and Escape. Returns an idempotent cleanup. */
export function openGameSettings(options: GameSettingsOptions): () => void {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const dialog = document.createElement('dialog');
  dialog.className = 'game-settings';
  dialog.setAttribute('aria-labelledby', 'settings-dialog-title');
  dialog.innerHTML = markup(options);
  document.body.append(dialog);
  options.onPause(true);
  let confirmation: HTMLDialogElement | undefined, cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    confirmation?.remove();
    if (dialog.open) dialog.close();
    dialog.remove();
    options.onPause(false);
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  };
  const closeAndRun = (callback: () => void) => { cleanup(); callback(); };
  const changed = () => { syncAudioSettings(options.save.settings as AudioSettings); options.onChange(options.save); };

  function confirmReset() {
    if (confirmation) return;
    confirmation = document.createElement('dialog'); confirmation.className = 'game-settings-reset';
    confirmation.setAttribute('aria-labelledby', 'settings-reset-title');
    confirmation.setAttribute('aria-describedby', 'settings-reset-description');
    confirmation.innerHTML = `<h2 id="settings-reset-title">${copy.resetTitle}</h2><p id="settings-reset-description">${copy.resetDescription}</p><div class="settings-reset-actions"><button type="button" class="settings-button" data-confirm="cancel" autofocus>${copy.resetCancel}</button><button type="button" class="settings-button settings-danger" data-confirm="reset">${copy.resetConfirm}</button></div>`;
    document.body.append(confirmation);
    const dismiss = () => { confirmation?.remove(); confirmation = undefined; dialog.querySelector<HTMLButtonElement>('[data-settings-action="reset"]')?.focus(); };
    confirmation.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
    confirmation.addEventListener('click', event => {
      const action = (event.target as Element).closest<HTMLElement>('[data-confirm]')?.dataset.confirm;
      if (action === 'cancel') dismiss();
      if (action === 'reset') closeAndRun(options.onReset);
    });
    confirmation.showModal();
    confirmation.querySelector<HTMLButtonElement>('[data-confirm="cancel"]')?.focus();
  }

  dialog.addEventListener('close', cleanup);
  dialog.addEventListener('cancel', event => { event.preventDefault(); cleanup(); });
  dialog.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('button');
    if (!target || (target as HTMLButtonElement).disabled) return;
    const soundKey = target.dataset.sound as 'music' | 'effects' | undefined;
    if (soundKey) {
      const audio = options.save.settings as Save['settings'] & AudioSettings;
      const next = !normalizedAudioSettings(audio)[soundKey]; audio[soundKey] = next;
      if (soundKey === 'effects') audio.sound = next;
      target.setAttribute('aria-pressed', String(next));
      target.querySelector('span')!.textContent = next ? copy.on : copy.off;
      if (soundKey === 'music') dialog.querySelector<HTMLInputElement>('#settings-music-volume')!.disabled = !next;
      changed();
      if (soundKey === 'effects' && next) playEffect('click', audio);
      return;
    }
    switch (target.dataset.settingsAction) {
      case 'close': cleanup(); break;
      case 'story': closeAndRun(options.onStory); break;
      case 'ending': if (options.save.final.complete || options.admin) closeAndRun(options.onEnding); break;
      case 'certificate': if (options.save.final.complete || options.admin) closeAndRun(options.onCertificate); break;
      case 'records': closeAndRun(options.onRecords); break;
      case 'admin': closeAndRun(() => options.onAdminToggle(!options.admin)); break;
      case 'reset': confirmReset(); break;
    }
  });
  dialog.querySelector<HTMLInputElement>('#settings-music-volume')!.addEventListener('input', event => {
    const input = event.target as HTMLInputElement;
    (options.save.settings as Save['settings'] & AudioSettings).musicVolume = Number(input.value) / 100;
    dialog.querySelector<HTMLOutputElement>('#settings-volume-output')!.textContent = `${input.value}%`;
    changed();
  });
  dialog.showModal();
  dialog.querySelector<HTMLButtonElement>('.settings-close-icon')?.focus({ preventScroll: true });
  return cleanup;
}

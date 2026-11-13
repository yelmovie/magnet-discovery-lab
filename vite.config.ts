import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { defineConfig } from 'vite';

// Saved on install so a reload still works when the Wi-Fi drops. Everything else is saved on first use.
const OFFLINE_SHELL = /^favicon\.svg$|^assets\/(index|three-view)-|^fonts\/.+\.woff2$|^audio\/[a-z-]+\.mp3$|^assets\/quest\/(logo|city-title|city-expedition)\.webp$|^assets\/adventure\/(mili|dangi)-(poses|walk)-pixel\.webp$/;

export default defineConfig({
  plugins: [{
    // A stylesheet in <head> holds back the first paint, so the boot screen would wait for it.
    // Module scripts still wait for this stylesheet, so the game never renders unstyled.
    name: 'paint-boot-screen-before-stylesheet',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const link = html.match(/[ \t]*<link rel="stylesheet"[^>]*>\r?\n?/)?.[0];
        return link ? html.replace(link, '').replace('</body>', `${link.trim()}</body>`) : html;
      },
    },
  }, {
    name: 'exclude-macos-metadata-from-release',
    apply: 'build',
    writeBundle({ dir }) {
      // Vite copies public/ verbatim. exFAT stores Finder metadata in sidecars.
      if (!dir) return;
      const output = resolve(dir);
      for (const entry of readdirSync(output, { recursive: true, withFileTypes: true })) {
        if (entry.isFile() && (entry.name.startsWith('._') || entry.name === '.DS_Store')) {
          unlinkSync(join(entry.parentPath, entry.name));
        }
      }
    },
  }, {
    name: 'offline-service-worker',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      // Registered after the title has its bandwidth, and only in the built site.
      handler: html => html.replace('</body>', "<script>addEventListener('load',()=>setTimeout(()=>navigator.serviceWorker?.register('/sw.js').catch(()=>{}),2000));</script></body>"),
    },
    writeBundle({ dir }) {
      if (!dir) return;
      const output = resolve(dir), worker = join(output, 'sw.js');
      const files = readdirSync(output, { recursive: true, withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => relative(output, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
        .filter(file => file !== 'sw.js').sort();
      const build = createHash('sha256');
      for (const file of files) build.update(file).update(readFileSync(join(output, file)));
      const shell = ['/', ...files.filter(file => OFFLINE_SHELL.test(file)).map(file => `/${file}`)];
      writeFileSync(worker, readFileSync(worker, 'utf8').replace('__BUILD_ID__', build.digest('hex').slice(0, 12)).replace('/*__PRECACHE__*/[]', JSON.stringify(shell)));
    },
  }],
});

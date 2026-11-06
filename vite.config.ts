import { readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';

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
  }],
});

import { readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [{
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

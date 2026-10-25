// Downloads every file in dist/ from a deployed origin and compares bytes with the local build.
//   node scripts/verify-release.mjs https://magnet-city.pages.dev [out.json]
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const origin = (process.argv[2] || 'https://magnet-city.pages.dev').replace(/\/$/, '');
const out = process.argv[3];
const walk = dir => readdirSync(dir).flatMap(name => { const p = join(dir, name); return statSync(p).isDirectory() ? walk(p) : [p]; });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = walk('dist').map(p => relative('dist', p).replaceAll('\\', '/')).sort();
const rows = [];
for (let i = 0; i < files.length; i += 8) {
  rows.push(...await Promise.all(files.slice(i, i + 8).map(async file => {
    const local = readFileSync(join('dist', file));
    // Cloudflare Pages serves /index.html at /, and redirects *.html paths.
    const url = `${origin}/${file === 'index.html' ? '' : file.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(url, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
    const remote = Buffer.from(await res.arrayBuffer());
    return { file, status: res.status, type: res.headers.get('content-type'), bytes: local.length, same: res.ok && sha(local) === sha(remote), sha256: sha(local) };
  })));
}
const bad = rows.filter(r => !r.same);
if (out) writeFileSync(out, JSON.stringify({ origin, checked: new Date().toISOString(), total: rows.length, mismatched: bad.length, rows }, null, 1));
console.log(`${origin}: ${rows.length - bad.length}/${rows.length} identical`);
bad.forEach(r => console.log(`  DIFF ${r.file} status=${r.status} type=${r.type}`));
process.exitCode = bad.length ? 1 : 0;

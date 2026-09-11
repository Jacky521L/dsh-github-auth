import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
const output = resolve('dist'); await mkdir(output, { recursive: true });
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run with npm run pack.');
for (const name of ['dsh-copilot-auth', 'dsh-github-repo-auth']) {
  const result = spawnSync(process.execPath, [npm, 'pack', '--ignore-scripts', '--pack-destination', output], { cwd: resolve('packages', name), encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr);
  console.log(result.stdout.trim());
}
const files = (await readdir(output)).filter(name => name.endsWith('.tgz')).sort();
for (const name of files) {
  const tar = gunzipSync(await readFile(`${output}/${name}`));
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    const path = header.subarray(0, 100).toString().replace(/\0.*$/, '');
    if (!path) break;
    const size = parseInt(header.subarray(124, 136).toString().replace(/\0.*$/, '').trim(), 8) || 0;
    const body = tar.subarray(offset + 512, offset + 512 + size).toString();
    if (!/^package\/(lib\/[^/]+\.js|package\.json|cordis\.patch\.yml|README\.md|LICENSE|THIRD_PARTY_NOTICES\.md)$/.test(path)) throw new Error(`Unexpected release file: ${path}`);
    if (/C:[\\/]Users[\\/]|D:[\\/]codes[\\/]|(?:gh[pousr]_[A-Za-z0-9_]{25,}|github_pat_[A-Za-z0-9_]{25,})/.test(body)) throw new Error(`Credential or personal path in ${path}`);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
}
const sums = await Promise.all(files.map(async name => `${createHash('sha256').update(await readFile(`${output}/${name}`)).digest('hex')}  ${name}`));
await writeFile(`${output}/SHA256SUMS.txt`, sums.join('\n') + '\n');
console.log('Release file allowlist and credential/path scan passed.');

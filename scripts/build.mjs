import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const names = ['dsh-copilot-auth', 'dsh-github-repo-auth'];
for (const name of names) {
  const base = resolve('packages', name);
  await mkdir(`${base}/lib`, { recursive: true });
  const entries = name === 'dsh-copilot-auth' ? ['index', 'controller'] : ['index', 'controller', 'repo-command', 'no-browser', 'process'];
  await build({ entryPoints: entries.map(entry => `${base}/src/${entry}.ts`), outdir: `${base}/lib`, bundle: true, platform: 'node', target: 'node24', format: 'esm', legalComments: 'eof' });
  const browser = await build({ entryPoints: [`${base}/src/client.tsx`], bundle: true, write: false, platform: 'browser', format: 'cjs', target: 'es2022', external: ['react', 'react/jsx-runtime'], legalComments: 'eof' });
  await writeFile(`${base}/lib/client.js`, `window.__ModuleLoader__.load({id:${JSON.stringify(name)},factory:(require)=>{const module={exports:{}};const exports=module.exports;\n${browser.outputFiles[0].text}\nreturn module.exports;}});\n`);
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) await writeFile(`${base}/${file}`, await readFile(file));
}
console.log('Built both standalone Harness plugins.');

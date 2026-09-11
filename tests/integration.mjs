// Opt-in official Harness profile test. Set DSH_CLI_PATH to the pinned CLI bin.js.
// Never reuse a real user's DSH_HOME or start model requests here.
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import net from 'node:net';
const cli = process.env.DSH_CLI_PATH;
if (!cli) throw new Error('Set DSH_CLI_PATH to Harness 0.1.5-alpha.1 lib/bin.js.');
const base = resolve('.runtime', `integration-${Date.now()}`); await mkdir(base, { recursive: true });
const env = { ...process.env, DSH_HOME: resolve(base, 'home') };
const report = [];
const names = ['dsh-copilot-auth', 'dsh-github-repo-auth'];
const archives = [];
for (const name of names) { const source = resolve('dist', `${name}-0.1.0-beta.1.tgz`); const hash = createHash('sha256').update(await readFile(source)).digest('hex').slice(0, 12); const target = resolve(base, `${name}-${hash}.tgz`); await copyFile(source, target); archives.push(target); }
async function command(args) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, [cli, 'plugin', '--profile', 'web', ...args], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', b => { output += b; }); child.stderr.on('data', b => { output += b; });
    child.on('error', reject); child.on('close', code => code === 0 ? accept() : reject(new Error(output.replace(/token=[A-Za-z0-9_-]+/g, 'token=[redacted]'))));
  });
}
async function inspect(label, expected) {
  const server = net.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const port = server.address().port; await new Promise(resolve => server.close(resolve));
  const child = spawn(process.execPath, [cli, '--profile', 'web', '--host', '127.0.0.1', '--port', String(port), '--no-open'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', errors = ''; child.stdout.on('data', b => { output += b; }); child.stderr.on('data', b => { errors += b; });
  const closed = new Promise(resolve => child.on('close', resolve));
  try {
    let url;
    for (let n = 0; n < 450; n++) {
      if (child.exitCode !== null) throw new Error(errors);
      url = output.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+)/)?.[1];
      if (url) break; await delay(100);
    }
    if (!url) throw new Error('Harness startup timeout: ' + errors);
    // The ready URL can precede the plugin-tree activation assertion.
    await delay(1000);
    const bootstrap = await fetch(url, { redirect: 'manual' });
    const cookie = bootstrap.headers.getSetCookie().map(row => row.split(';')[0]).join('; ');
    const origin = new URL(url).origin;
    const statuses = [];
    for (const name of names) {
      const response = await fetch(origin + '/api/' + name, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: '{"action":"status"}' });
      statuses.push(response.status);
    }
    assert.deepEqual(statuses, expected, label);
    const bundle = JSON.parse(await readFile(resolve(env.DSH_HOME, 'profiles/web/package.json'), 'utf8')).dsh.profile.bundles;
    assert.equal(new Set(bundle).size, bundle.length, 'duplicate bundle registrations');
    report.push({ label, statuses, bundles: bundle }); console.log(`${label}: passed`);
  } finally { child.kill(); await closed; }
}
try {
  await command(['add', ...archives]); await inspect('combined install', [200,200]);
  await command(['add', ...archives]); await inspect('repeat install and restart', [200,200]);
  await command(['remove', names[0]]); await inspect('repository independently after Copilot removal', [404,200]);
  await command(['remove', names[1]]); await command(['add', archives[0]]); await inspect('Copilot independently after repository removal', [200,404]);
  await command(['remove', names[0]]); await inspect('both uninstalled', [404,404]);
  await writeFile(resolve(base, 'report.json'), JSON.stringify(report, null, 2));
  console.log('Official Harness installation matrix passed.');
} catch (error) { console.error(String(error).replace(/token=[A-Za-z0-9_-]+/g, 'token=[redacted]')); process.exitCode = 1; }

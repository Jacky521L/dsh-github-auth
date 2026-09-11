import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as tick } from 'node:timers/promises';
import { RepoController, deviceNotice, parseAccount } from '../packages/dsh-github-repo-auth/lib/controller.js';
import { credentialConfig, run } from '../packages/dsh-github-repo-auth/lib/process.js';

const account = (login = 'test-user', extra = {}) => ({ code: 0, stderr: '', stdout: JSON.stringify({ hosts: { 'github.com': [{ active: true, state: 'success', login, tokenSource: 'keyring', oauthToken: 'never-return-this', ...extra }] } }) });
function setup(loginRun, env = {}) {
  const calls = []; let connected = false;
  const runner = { executable: name => name, run: async (file, args, options) => {
    calls.push({ file, args, options });
    if (args[1] === 'status') return connected ? account() : { code: 1, stdout: '{"hosts":{}}', stderr: '' };
    if (args[1] === 'logout') { connected = false; return { code: 0, stdout: '', stderr: '' }; }
    const result = await loginRun?.(options); if (!result?.code) connected = true;
    return result ?? { code: 0, stdout: '', stderr: '' };
  } };
  return { controller: new RepoController(runner, env), calls, connect: () => { connected = true; } };
}
test('CLI status projects only the active identity and never its token', () => {
  assert.deepEqual(parseAccount(account()), { account: 'test-user', source: 'keyring' });
  assert.equal(JSON.stringify(parseAccount(account())).includes('never-return'), false);
  assert.match(parseAccount(account('x', { state: 'failed' })).error, /invalid/);
});
test('device code can span output chunks and URL stays on official GitHub', () => {
  assert.equal(deviceNotice('First copy your one-time code: ABCD-'), undefined);
  assert.deepEqual(deviceNotice('! First copy your one-time code: ABCD-EFGH\n'), { message: 'Enter this one-time device code on GitHub.', code: 'ABCD-EFGH', url: 'https://github.com/login/device' });
});
test('successful login is checked against CLI state', async () => {
  const { controller, calls } = setup(); await controller.begin(); await tick();
  const state = await controller.status(true); assert.equal(state.configured, true); assert.equal(state.account, 'test-user'); assert.equal(state.outcome, 'authorized');
  assert.ok(calls.some(call => call.args.includes('--web')));
  assert.ok(calls.every(call => !call.args.includes('setup-git') && !call.args.includes('--insecure-storage')));
});
test('duplicate begin shares one process; cancel and retry work', async () => {
  const { controller, calls } = setup(options => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true })));
  await Promise.all([controller.begin(), controller.begin()]); assert.equal(calls.filter(call => call.args[1] === 'login').length, 1);
  await controller.cancel(); assert.equal((await controller.status()).inFlight, false);
  await controller.begin(); assert.equal(calls.filter(call => call.args[1] === 'login').length, 2); await controller.dispose();
});
test('missing dependencies produce actionable state', async () => {
  const controller = new RepoController({ executable: () => undefined, run }, {});
  const state = await controller.status(); assert.equal(state.git, false); assert.equal(state.gh, false);
  await assert.rejects(controller.begin(), /Install Git/);
});
test('environment credential prevents login/logout mutations', async () => {
  const { controller, calls } = setup(undefined, { GH_TOKEN: 'synthetic-test-token' });
  await assert.rejects(controller.begin(), /environment token/);
  assert.equal(calls.length, 0);
});
test('logout detects an account switch and only addresses the displayed account', async () => {
  const { controller, connect, calls } = setup(); connect();
  await assert.rejects(controller.signOut('wrong-user'), /Account changed/);
  await controller.signOut('test-user');
  assert.deepEqual(calls.find(call => call.args[1] === 'logout').args, ['auth', 'logout', '--hostname', 'github.com', '--user', 'test-user']);
});
test('invalid grant, expired device code and network errors do not become success', async () => {
  for (const message of ['expired_token', 'Network connection failed', 'Organization authorization required']) {
    const { controller } = setup(() => ({ code: 1, stdout: '', stderr: message })); await controller.begin(); await tick();
    const state = await controller.status(); assert.match(state.error, new RegExp(message)); assert.notEqual(state.outcome, 'authorized');
  }
});
test('helper is command scoped, host scoped and quotes spaces and apostrophes', () => {
  const args = credentialConfig("C:\\Tools\\GitHub CLI\\it's gh.exe");
  assert.equal(args[0], '-c'); assert.equal(args[1], 'credential.https://github.com.helper=');
  assert.match(args[3], /'\\''/); assert.equal(args.includes('--global'), false);
});
test('process runner propagates cancellation and nonzero exit without invoking a shell', async () => {
  const output = await run(process.execPath, ['-e', 'process.stdout.write("hello");process.exitCode=3']);
  assert.equal(output.code, 3); assert.equal(output.stdout, 'hello');
  const abort = new AbortController();
  const waiting = run(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { signal: abort.signal });
  abort.abort(); await assert.rejects(waiting, /Cancelled/);
});

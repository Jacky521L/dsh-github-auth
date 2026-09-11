import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as tick } from 'node:timers/promises';
import { CopilotController, COPILOT_KEY } from '../packages/dsh-copilot-auth/lib/controller.js';

function setup(flow) {
  const records = new Map([['llm-pi-ai/openai-codex', { kind: 'grant', payload: { access_token: 'unrelated-secret' } }]]);
  const calls = [];
  const ctx = {
    authorization: {
      describe: key => { assert.equal(key, COPILOT_KEY); return { methods: [{ id: 'oauth', label: 'OAuth' }], inFlight: false }; },
      begin: async request => { calls.push(request); await flow?.(request, records); return { status: 'authorized' }; }, cancel: key => assert.equal(key, COPILOT_KEY),
    },
    credentials: { describeRecord: async key => ({ configured: records.has(key), writable: true }), readRecord: async key => records.get(key), deleteRecord: async key => { assert.equal(key, COPILOT_KEY); records.delete(key); } },
    sessionController: { modelCatalog: async () => ({ groups: [{ id: 'github-copilot', models: [{ id: 'a', name: 'Model A' }, { id: 'b' }] }] }) },
  };
  return { ctx, controller: new CopilotController(ctx), records, calls };
}

test('ordinary GitHub account can answer enterprise domain with an empty string', async () => {
  let answer;
  const { controller } = setup(async request => { answer = await request.interaction.prompt({ kind: 'text', message: 'Enterprise domain (blank for GitHub.com)' }); });
  await controller.begin();
  const state = await controller.status(); assert.equal(state.prompt.kind, 'text');
  controller.answer(state.prompt.id, ''); await tick();
  assert.equal(answer, ''); assert.equal((await controller.status()).outcome, 'authorized');
});
test('duplicate login reuses attempt and stale answers are rejected', async () => {
  const { controller, calls } = setup(request => request.interaction.prompt({ kind: 'text', message: 'Domain' }));
  await Promise.all([controller.begin(), controller.begin()]); assert.equal(calls.length, 1);
  const id = (await controller.status()).prompt.id;
  assert.throws(() => controller.answer('old-id', 'x'), /stale/);
  controller.answer(id, ''); assert.throws(() => controller.answer(id, ''), /stale/);
  await tick();
});
test('select answers must match a native option', async () => {
  const { controller } = setup(request => request.interaction.prompt({ kind: 'select', message: 'Account', options: [{ id: 'personal', label: 'Personal' }] }));
  await controller.begin(); const id = (await controller.status()).prompt.id;
  assert.throws(() => controller.answer(id, 'unknown'), /Invalid account/);
  controller.answer(id, 'personal'); await tick();
});
test('cancel removes prompts, codes and waiters and allows retry', async () => {
  const { controller } = setup(request => { request.interaction.notify({ message: 'Device', code: 'ABCD-EFGH' }); return request.interaction.prompt({ kind: 'text', message: 'Domain' }); });
  await controller.begin(); const old = (await controller.status()).prompt.id; await controller.cancel();
  const state = await controller.status(); assert.equal(state.prompt, undefined); assert.equal(state.notice, undefined); assert.equal(state.inFlight, false); assert.equal(state.outcome, 'cancelled');
  await controller.begin(); assert.notEqual((await controller.status()).prompt.id, old); await controller.dispose();
});
test('already-aborted native prompt never gets stuck', async () => {
  const { controller } = setup(request => request.interaction.prompt({ kind: 'text', message: 'Withdrawn', signal: AbortSignal.abort() }));
  await controller.begin(); await tick(); assert.equal((await controller.status()).inFlight, false);
});
test('sign out waits for in-flight commit and clears only Copilot', async () => {
  let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  const { controller, records } = setup(async (_request, records) => { await gate; records.set(COPILOT_KEY, { kind: 'grant' }); });
  await controller.begin(); const logout = controller.signOut();
  await assert.rejects(controller.begin(), /unavailable/); finish(); await logout;
  assert.equal(records.has(COPILOT_KEY), false); assert.equal(records.has('llm-pi-ai/openai-codex'), true);
});
test('model check intersects account grant and native catalog without leaking credentials', async () => {
  const { controller, records } = setup();
  records.set(COPILOT_KEY, { kind: 'grant', payload: { availableModelIds: ['a', 'unknown'], access_token: 'never-in-browser', refresh_token: 'also-secret' } });
  const view = await controller.checkModels(); assert.deepEqual(view.models, [{ id: 'a', name: 'Model A' }]);
  assert.equal(JSON.stringify(view).includes('secret'), false); assert.equal(JSON.stringify(view).includes('never-in-browser'), false);
});
test('expired authorization and network failures remain distinguishable and retryable', async () => {
  let attempt = 0;
  const { controller } = setup(() => { throw new Error(++attempt === 1 ? 'Device code expired' : 'Network connection failed'); });
  await controller.begin(); await tick(); assert.match((await controller.status()).error, /expired/);
  await controller.begin(); await tick(); assert.match((await controller.status()).error, /Network/);
});
test('legacy plugin is detected without replacing or deleting it', async () => {
  const { controller, ctx } = setup(); ctx.piAiOAuth = {};
  assert.equal((await controller.status()).conflict, true); assert.ok(ctx.piAiOAuth);
});

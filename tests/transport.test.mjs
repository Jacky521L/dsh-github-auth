import test from 'node:test';
import assert from 'node:assert/strict';
import { apply as mountCopilot } from '../packages/dsh-copilot-auth/lib/index.js';
import { apply as mountRepository } from '../packages/dsh-github-repo-auth/lib/index.js';

function context() {
  const routes = []; const sections = []; const listeners = new Map(); const emitted = [];
  return { routes, sections, listeners, emitted, ctx: { connection: { fetch: { register: route => routes.push(route) } },
    on: (event, listener) => listeners.set(event, listener), llm: { emitAdaptersUpdated: () => emitted.push('llm/adapters-updated') },
    authorization: { describe: () => undefined }, credentials: { describeRecord: async () => ({ configured: false, writable: true }), readRecord: async () => undefined },
    sessionController: { modelCatalog: async () => ({ default: { provider: 'other', model: 'other-model' }, routableProviders: [], groups: [] }) },
    systemPrompt: { section: section => sections.push(section) },
  } };
}
test('Copilot route rejects arbitrary provider keys, bad bodies and unknown operations', async () => {
  const { ctx, routes } = context(); mountCopilot(ctx);
  assert.equal(routes[0].path, '/api/dsh-copilot-auth');
  for (const body of [{ action: 'logout', key: 'llm-pi-ai/openai-codex' }, { action: 'token' }, [], { action: 'status', token: 'forbidden' }]) {
    const response = await routes[0].fetch(new Request('http://localhost/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    assert.equal(response.status, 400);
  }
  const response = await routes[0].fetch(new Request('http://localhost/api', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{"action":"status"}' })); assert.equal(response.status, 400);
});
test('Copilot catalog follows the latest credential grant', async () => {
  const { ctx, listeners, emitted } = context();
  let grant = ['gpt-5.6-luna'];
  ctx.credentials.readRecord = async () => ({ kind: 'grant', payload: { availableModelIds: grant } });
  ctx.sessionController.modelCatalog = async () => ({ default: { provider: 'github-copilot', model: 'gpt-5.6-sol' }, routableProviders: ['github-copilot', 'other'], groups: [
    { id: 'github-copilot', models: [{ id: 'gpt-5.6-sol' }, { id: 'gpt-5.6-luna' }] },
    { id: 'other', models: [{ id: 'other-model' }] },
  ] });
  const original = ctx.sessionController.modelCatalog;
  mountCopilot(ctx);
  listeners.get('credentials/record-updated')('llm-pi-ai/openai-codex');
  assert.deepEqual(emitted, []);
  listeners.get('credentials/record-updated')('llm-pi-ai/github-copilot');
  assert.deepEqual(emitted, ['llm/adapters-updated']);
  assert.deepEqual((await ctx.sessionController.modelCatalog()).groups.map(group => group.models.map(model => model.id)),
    [['gpt-5.6-luna'], ['other-model']]);
  grant = ['gpt-5.6-sol'];
  assert.deepEqual((await ctx.sessionController.modelCatalog()).groups[0].models.map(model => model.id), ['gpt-5.6-sol']);
  ctx.credentials.readRecord = async () => undefined;
  assert.deepEqual((await ctx.sessionController.modelCatalog()).groups.map(group => group.id), ['other']);
  assert.notEqual(ctx.sessionController.modelCatalog, original);
});
test('repository plugin contributes guidance but no alternative command execution endpoint', async () => {
  const { ctx, routes, sections } = context(); mountRepository(ctx);
  assert.equal(routes[0].path, '/api/dsh-github-repo-auth'); assert.equal(sections.length, 1);
  assert.match(sections[0].text, /normal Harness command tool/); assert.match(sections[0].text, /normal sandbox/);
  const response = await routes[0].fetch(new Request('http://localhost/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"action":"exec","command":"git push"}' })); assert.equal(response.status, 400);
});

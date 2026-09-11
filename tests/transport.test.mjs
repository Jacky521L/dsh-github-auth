import test from 'node:test';
import assert from 'node:assert/strict';
import { apply as mountCopilot } from '../packages/dsh-copilot-auth/lib/index.js';
import { apply as mountRepository } from '../packages/dsh-github-repo-auth/lib/index.js';

function context() {
  const routes = []; const sections = [];
  return { routes, sections, ctx: { connection: { fetch: { register: route => routes.push(route) } }, on: () => {},
    authorization: { describe: () => undefined }, credentials: { describeRecord: async () => ({ configured: false, writable: true }) },
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
test('repository plugin contributes guidance but no alternative command execution endpoint', async () => {
  const { ctx, routes, sections } = context(); mountRepository(ctx);
  assert.equal(routes[0].path, '/api/dsh-github-repo-auth'); assert.equal(sections.length, 1);
  assert.match(sections[0].text, /normal Harness command tool/); assert.match(sections[0].text, /normal sandbox/);
  const response = await routes[0].fetch(new Request('http://localhost/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"action":"exec","command":"git push"}' })); assert.equal(response.status, 400);
});

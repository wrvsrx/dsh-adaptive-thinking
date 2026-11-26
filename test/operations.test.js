import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planEdit, readRoute } from '../operations.js';
import { apply } from '../index.js';

const route = (provider = {}) => ({ providers: { gateway: {
  api: 'anthropic-messages', models: [{ id: 'first' }, { id: 'opus', compat: { allowEmptySignature: true }, reasoningEfforts: { off: null, high: 'high' } }], ...provider,
} } });
const view = (value = route(), user = route()) => ({ ns: 'llm-pi-ai', revision: 42, value, user });
const path = ['providers', 'gateway', 'models', '1', 'compat', 'forceAdaptiveThinking'];

test('changes only the requested model compatibility leaf', () => {
  const v = view();
  assert.deepEqual(planEdit(v, 'gateway', 'opus', 'true'), [{ op: 'set', path, value: true }]);
  assert.deepEqual(planEdit(v, 'gateway', 'opus', 'false'), [{ op: 'set', path, value: false }]);
  assert.deepEqual(planEdit(v, 'gateway', 'opus', 'inherit'), []);
  const v2 = structuredClone(v);
  v2.user.providers.gateway.models[1].compat.forceAdaptiveThinking = true;
  assert.deepEqual(planEdit(v2, 'gateway', 'opus', 'inherit'), [{ op: 'unset', path }]);
  assert.deepEqual(v.user.providers.gateway.models[1].compat, { allowEmptySignature: true });
});

test('finds the stored index by exact id and refuses ambiguous and inherited rows', () => {
  const reversed = route();
  reversed.providers.gateway.models.reverse();
  assert.equal(planEdit(view(route(), reversed), 'gateway', 'opus', 'true')[0].path[3], '0');
  assert.equal(planEdit(view(route(), route({ models: [{ id: 'opus' }, { id: 'opus' }] })), 'gateway', 'opus', 'true'), null);
  assert.equal(planEdit(view(route(), route({ models: [] })), 'gateway', 'opus', 'true'), null);
  assert.equal(planEdit({ ...view(), revision: undefined }, 'gateway', 'opus', 'true'), null);
  assert.equal(readRoute(view(route({ api: 'openai-completions' })), 'gateway'), null);
  assert.equal(readRoute(view(), '__proto__'), null);
});

test('agent tool reads only allowlisted metadata and passes the exact revision on writes', async () => {
  const v = view();
  v.user.providers.gateway.headers = { authorization: 'secret' };
  let definition;
  const writes = [];
  apply({ tools: { register(tool) { definition = tool; } }, settings: {
    describe(opts) { assert.equal(opts.redactSecrets, true); return [v]; },
    async mutate(...args) { writes.push(args); },
  } });
  const status = await definition.execute({ provider: 'gateway' });
  assert.deepEqual(status.models[1], { id: 'opus', mode: 'inherit', editable: true, offersOff: true });
  assert(!JSON.stringify(status).includes('secret'));
  assert.equal((await definition.execute({ provider: 'gateway', model: 'opus', mode: 'true' })).changed, true);
  assert.deepEqual(writes, [['llm-pi-ai', [{ op: 'set', path, value: true }], 42]]);
});

test('agent tool returns a sanitized refusal and does not retry', async () => {
  let definition;
  let calls = 0;
  apply({ tools: { register(tool) { definition = tool; } }, settings: {
    describe: () => [view()], async mutate() { calls++; throw Error('secret'); },
  } });
  const result = await definition.execute({ provider: 'gateway', model: 'opus', mode: 'true' });
  assert.equal(result.ok, false);
  assert(!JSON.stringify(result).includes('secret'));
  assert.equal(calls, 1);
});

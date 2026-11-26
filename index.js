import { NS, readRoute, planEdit } from './operations.js';

export const inject = ['settings', 'tools'];
export function apply(ctx) {
  ctx.tools.register({
    name: 'adaptive_thinking',
    description: 'Read or change the per-model Adaptive Thinking override on a saved custom Anthropic Messages provider. Only change it when the user requests it.',
    parameters: {
      type: 'object', additionalProperties: false, required: ['provider'],
      properties: {
        provider: { type: 'string', description: 'Exact DSH provider ID.' },
        model: { type: 'string', description: 'Exact model ID, required to set mode.' },
        mode: { type: 'string', enum: ['inherit', 'true', 'false'], description: 'Omit to read; true selects the adaptive request mode, false explicitly selects legacy mode, inherit removes the model override.' },
      },
    },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute({ provider, model, mode }) {
      if (typeof provider !== 'string' || provider === '' || (mode !== undefined && typeof model !== 'string')) {
        return { ok: false, reason: 'A provider ID is required; writes also need a model ID.' };
      }
      const view = ctx.settings.describe({ redactSecrets: true }).find(row => row.ns === NS);
      if (mode === undefined) {
        const route = readRoute(view, provider);
        return route ? { ok: true, models: route.models } : { ok: false, reason: 'No explicit Anthropic Messages models on that provider.' };
      }
      const ops = planEdit(view, provider, model, mode);
      if (!ops) return { ok: false, reason: 'The model is not uniquely editable or the mode is invalid.' };
      if (ops.length === 0) return { ok: true, changed: false };
      try {
        await ctx.settings.mutate(NS, ops, view.revision);
        return { ok: true, changed: true, provider, model, mode };
      } catch {
        return { ok: false, reason: 'The settings write was refused. Reopen the model settings and check whether the profile changed or is read-only.' };
      }
    },
  });
}

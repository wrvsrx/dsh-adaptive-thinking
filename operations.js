// Shared by the Host tool and the browser bundle. Only stored model rows are editable.
const NS = 'llm-pi-ai';
const FIELD = 'forceAdaptiveThinking';
const own = (value, key) => value && Object.hasOwn(value, key) ? value[key] : undefined;
const routeOf = (value, provider) => own(own(value, 'providers'), provider);

function readRoute(view, provider) {
  const effective = routeOf(view?.value, provider);
  if (effective?.api !== 'anthropic-messages' || !Array.isArray(effective.models)) return null;
  const stored = routeOf(view.user, provider);
  const models = effective.models.filter(row => typeof row?.id === 'string').map(row => {
    const matches = Array.isArray(stored?.models) ? stored.models.filter(candidate => candidate?.id === row.id) : [];
    const mode = own(matches[0]?.compat, FIELD);
    return { id: row.id, mode: typeof mode === 'boolean' ? String(mode) : 'inherit', editable: matches.length === 1,
      offersOff: own(row.reasoningEfforts, 'off') !== undefined };
  });
  return { revision: view.revision, models };
}

function planEdit(view, provider, id, mode) {
  const route = readRoute(view, provider);
  const models = route?.models.filter(row => row.id === id) ?? [];
  if (models.length !== 1 || !models[0].editable || !Number.isSafeInteger(route.revision)) return null;
  if (!['inherit', 'true', 'false'].includes(mode)) return null;
  if (models[0].mode === mode) return [];
  const index = routeOf(view.user, provider).models.findIndex(row => row?.id === id);
  const path = ['providers', provider, 'models', String(index), 'compat', FIELD];
  return [mode === 'inherit' ? { op: 'unset', path } : { op: 'set', path, value: mode === 'true' }];
}

export { NS, readRoute, planEdit };

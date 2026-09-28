import path from 'node:path';
import { normalizeText } from '../scripts/search-autocomplete.js';
import {
  cleanText, cliOptions, deliveryOrigin, fingerprint, isMain, readConfig, readJSON,
  request, runCLI, validateConfig, validateOutputPaths, writeJSON,
} from './search-index-utils.mjs';

export function collectPhrases(sources, config) {
  const catalog = new Map();
  const seenPaths = new Set();
  for (const { records, defaultType } of sources) {
    for (const record of records) {
      if (!record.path || /noindex/i.test(record.robots || '')
        || config.excludePaths.some((route) => record.path === route
          || record.path === `${route}.html` || record.path.startsWith(`${route}/`))) continue;
      if (seenPaths.has(record.path)) continue;
      seenPaths.add(record.path);
      const seenPhrases = new Set();
      for (const value of [record.title, record.header]) {
        const phrase = cleanText(value || '');
        const normalized = normalizeText(phrase);
        if (normalized.length < config.minimumLength || phrase.length > config.maximumLength
          || seenPhrases.has(normalized)) continue;
        seenPhrases.add(normalized);
        if (!catalog.has(normalized)) {
          catalog.set(normalized, {
            phrase, normalized, sourceCount: 0, types: new Set(),
          });
        }
        const entry = catalog.get(normalized);
        entry.sourceCount += 1;
        entry.types.add(cleanText(record.type) || defaultType);
        if (catalog.size > config.maximumPhrases) {
          throw new Error('maximumPhrases exceeded; preserving the existing catalog');
        }
      }
    }
  }
  return [...catalog.values()].map((record) => ({ ...record, types: [...record.types].sort() }))
    .sort((a, b) => a.normalized.localeCompare(b.normalized, 'en'));
}

export async function fetchPages(config, environment, dependencies = {}) {
  const url = new URL(config.keyPhrases.pageIndexPath, deliveryOrigin(config, environment));
  const records = [];
  let total;
  do {
    url.searchParams.set('offset', records.length);
    url.searchParams.set('limit', '1000');
    const { body } = await request(url.href, { responseType: 'json' }, dependencies);
    if (!Array.isArray(body?.data)) throw new Error('Invalid page query index');
    total = body.total ?? body.data.length;
    if (!Number.isSafeInteger(total) || total < 0
      || (body.data.length === 0 && records.length < total)) {
      throw new Error('Incomplete page query index');
    }
    records.push(...body.data);
  } while (records.length < total);
  return records;
}

export async function buildPhrases(
  config,
  environment,
  { cwd = process.cwd(), ...dependencies } = {},
) {
  validateConfig(config);
  await validateOutputPaths(config, cwd);
  const assets = await readJSON(path.join(cwd, config.outputs[environment]));
  const origin = deliveryOrigin(config, environment);
  if (assets?.environment !== environment || assets?.origin !== origin
    || assets?.fingerprint !== fingerprint(config, environment) || !Array.isArray(assets?.data)) {
    throw new Error('Generate the matching asset index before generating phrases');
  }
  const pages = await fetchPages(config, environment, dependencies);
  const data = collectPhrases([
    { records: pages, defaultType: 'page' }, { records: assets.data, defaultType: 'document' },
  ], config.keyPhrases);
  const result = {
    total: data.length, environment, origin, fingerprint: fingerprint(config, environment), data,
  };
  const changed = await writeJSON(path.join(cwd, config.keyPhrases.outputs[environment]), result);
  return { ...result, changed };
}

if (isMain(import.meta.url)) {
  await runCLI(async () => {
    const options = cliOptions();
    const result = await buildPhrases(await readConfig(options.config), options.environment);
    console.log(`${options.environment}: ${result.total} phrases, ${result.changed ? 'updated' : 'unchanged'}`);
  });
}

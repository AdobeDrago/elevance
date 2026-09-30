import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { buildPhrases, collectPhrases } from './build-search-key-phrases.mjs';
import { deliveryOrigin, fingerprint, writeJSON } from './search-index-utils.mjs';
import { fixture } from './search-test-fixtures.mjs';

const record = (pathValue, title, extras = {}) => ({ path: pathValue, title, ...extras });

test('phrase normalization, source counts/types, exclusions and noindex', async (t) => {
  const { config } = await fixture(t);
  const data = collectPhrases([
    {
      defaultType: 'page',
      records: [
        record('/one', 'Café—Care', { header: 'CAFE care', content: 'Never suggest body text' }),
        record('/two', 'CAFE care'),
        record('/hidden', 'Hidden resource', { robots: 'follow, NOINDEX' }),
        record('/fragments/nav', 'Navigation'),
        record('/search.html', 'Search'),
        record('/tiny', 'Hi'),
        record('/long', 'a'.repeat(121)),
      ],
    },
    {
      defaultType: 'document',
      records: [
        record('/pdfs/care.pdf', 'Cafe care', { type: 'pdf', header: 'New Header' }),
        record('/pdfs/care.pdf', 'Cafe care', { type: 'pdf' }),
      ],
    },
  ], config.keyPhrases);
  assert.deepEqual(data, [
    {
      phrase: 'Café—Care', normalized: 'cafe care', sourceCount: 3, types: ['page', 'pdf'],
    },
    {
      phrase: 'New Header', normalized: 'new header', sourceCount: 1, types: ['pdf'],
    },
  ]);
  assert.throws(() => collectPhrases([{
    defaultType: 'page',
    records: [
      record('/one', 'First'), record('/two', 'Second'),
    ],
  }], { ...config.keyPhrases, maximumPhrases: 1 }), /maximumPhrases/);
});

test('phrase generator selects matching environment sources, paginates, and avoids rewrites', async (t) => {
  const options = await fixture(t);
  for (const env of ['preview', 'live']) {
    await writeJSON(path.join(options.cwd, options.config.outputs[env]), {
      environment: env,
      origin: deliveryOrigin(options.config, env),
      fingerprint: fingerprint(options.config, env),
      data: [record(`/pdfs/${env}.pdf`, `${env} document`, { type: 'pdf' })],
    });
    const origins = [];
    const fetchImpl = async (url) => {
      const parsed = new URL(url);
      origins.push(parsed.origin);
      assert.equal(parsed.pathname, '/query-index.json');
      const offset = Number(parsed.searchParams.get('offset'));
      return Response.json({ total: 2, data: [record(`/page-${offset}`, `${env} page ${offset}`)] });
    };
    const first = await buildPhrases(options.config, env, { ...options, fetchImpl });
    assert.equal(first.total, 3);
    const origin = deliveryOrigin(options.config, env);
    assert.deepEqual(origins, [origin, origin]);
    const output = path.join(options.cwd, options.config.keyPhrases.outputs[env]);
    const before = await stat(output);
    const second = await buildPhrases(options.config, env, { ...options, fetchImpl });
    assert.equal(second.changed, false);
    assert.equal((await stat(output)).mtimeMs, before.mtimeMs);
    const bytes = await readFile(output, 'utf8');
    await assert.rejects(buildPhrases(options.config, env, {
      ...options, wait: async () => {}, fetchImpl: async () => new Response(null, { status: 503 }),
    }));
    assert.equal(await readFile(output, 'utf8'), bytes);
  }
});

test('refuses cross-environment or stale asset indexes', async (t) => {
  const options = await fixture(t);
  await writeJSON(path.join(options.cwd, options.config.outputs.live), {
    environment: 'preview', data: [record('/pdfs/draft.pdf', 'Private draft')],
  });
  await assert.rejects(buildPhrases(options.config, 'live', options), /matching asset index/);
});

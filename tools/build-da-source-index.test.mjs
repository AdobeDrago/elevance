import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, stat, symlink } from 'node:fs/promises';
import path from 'node:path';
import {
  buildAssetIndex, discoverAssets, extractPDF, filenameTitle,
} from './build-da-source-index.mjs';
import {
  fingerprint, outputPaths, request, validateOutputPaths, validateRoots,
} from './search-index-utils.mjs';
import { fixture, mockDA, samplePDF } from './search-test-fixtures.mjs';

test('recursive discovery filters extensions and deduplicates paths and directories', async (t) => {
  const options = await fixture(t);
  const mock = mockDA(options.config);
  const files = await discoverAssets(options.config, options.token, mock);
  assert.equal(files.length, 4);
  assert.ok(files.every((file) => file.startsWith(`${options.config.roots[0]}/`)));
  assert.equal(new Set(files).size, 4);
  assert.equal(mock.calls.length, 2);
  assert.ok(mock.calls.every(({ options: init }) => init.headers.Authorization === 'Bearer test-token'));
  await assert.rejects(
    discoverAssets({ ...options.config, maxFiles: 2 }, options.token, mock),
    /maxFiles/,
  );
  await assert.rejects(
    discoverAssets({ ...options.config, minimumFiles: 5 }, options.token, mock),
    /minimumFiles/,
  );
});

test('real PDF extraction reads all pages, metadata, caps and filename fallback', async (t) => {
  const { config } = await fixture(t);
  const result = await extractPDF(samplePDF(), config);
  assert.equal(result.title, 'Clinical Guide');
  assert.match(result.content, /therapy Second page treatment/);
  const first = await extractPDF(samplePDF(''), { ...config, pdfMaxPages: 1 });
  assert.equal(first.title, '');
  assert.doesNotMatch(first.content, /Second page/);
  assert.equal(filenameTitle('/pdfs/referral_form-2026.PDF'), 'Referral Form 2026');
  const capped = await extractPDF(samplePDF(), { ...config, contentMaxCharacters: 10 });
  assert.equal(capped.content.length, 10);
});

test('preview and live use only their own delivered assets and download tier', async (t) => {
  const options = await fixture(t);
  const mock = mockDA(options.config);
  const preview = await buildAssetIndex(options.config, 'preview', { ...options, ...mock });
  const live = await buildAssetIndex(options.config, 'live', { ...options, ...mock });
  assert.equal(preview.total, 3);
  assert.equal(live.total, 2);
  assert.ok(preview.data.some((record) => record.path.endsWith('preview-only.pdf')));
  assert.ok(!live.data.some((record) => record.path.endsWith('preview-only.pdf')));
  const pdf = live.data.find((record) => record.type === 'pdf');
  assert.match(pdf.content, /treatment criteria/);
  assert.equal(pdf.lastModified, '2026-09-25T16:37:53.000Z');
  const doc = live.data.find((record) => record.type === 'docx');
  assert.equal(doc.title, 'Referral Form');
  assert.equal(doc.content, '');
  const downloads = mock.calls.filter(({ options: init }) => !init.method && !init.headers);
  assert.equal(downloads.filter(({ url }) => url.hostname.endsWith('.aem.page')).length, 2);
  assert.equal(downloads.filter(({ url }) => url.hostname.endsWith('.aem.live')).length, 1);
  assert.ok(downloads.every(({ options: init }) => init.redirect === 'error'));
});

test('unchanged run checks delivery but never downloads/parses or rewrites', async (t) => {
  const options = await fixture(t);
  const mock = mockDA(options.config, { title: '' });
  const first = await buildAssetIndex(options.config, 'preview', { ...options, ...mock });
  assert.equal(first.data[0].title, 'Clinical Guide');
  const output = path.join(options.cwd, options.config.outputs.preview);
  const before = await stat(output);
  mock.calls.length = 0;
  const second = await buildAssetIndex(options.config, 'preview', {
    ...options, ...mock, extractPDF: () => assert.fail('must not parse'),
  });
  assert.equal(second.changed, false);
  assert.equal((await stat(output)).mtimeMs, before.mtimeMs);
  assert.ok(mock.calls.every(({ options: init }) => init.method === 'HEAD' || init.headers));
});

test('unpreview/unpublish removes cached records, including the last document', async (t) => {
  const options = await fixture(t);
  const state = {};
  const mock = mockDA(options.config, state);
  for (const env of ['preview', 'live']) {
    state.removed = [];
    const before = await buildAssetIndex(options.config, env, { ...options, ...mock });
    state.removed = before.data.map((record) => record.path);
    state.missingStatus = 410;
    const after = await buildAssetIndex(options.config, env, { ...options, ...mock });
    assert.equal(after.total, 0);
    assert.equal(after.changed, true);
  }
});

test('any required asset failure preserves complete output byte for byte', async (t) => {
  const options = await fixture(t);
  const state = {};
  const mock = mockDA(options.config, state);
  await buildAssetIndex(options.config, 'live', { ...options, ...mock });
  const output = path.join(options.cwd, options.config.outputs.live);
  const before = await readFile(output, 'utf8');
  state.fail = [`${options.config.roots[0]}/clinical-guide.pdf`];
  await assert.rejects(buildAssetIndex(options.config, 'live', { ...options, ...mock }), /Preserving complete/);
  assert.equal(await readFile(output, 'utf8'), before);
});

test('fingerprints invalidate reuse when extraction settings or environment changes', async (t) => {
  const options = await fixture(t);
  const mock = mockDA(options.config);
  await buildAssetIndex(options.config, 'live', { ...options, ...mock });
  let parses = 0;
  const config = { ...options.config, contentMaxCharacters: 12 };
  await buildAssetIndex(config, 'live', {
    ...options, ...mock, extractPDF: async () => { parses += 1; return { content: 'Updated text' }; },
  });
  assert.equal(parses, 1);
  assert.notEqual(fingerprint(config, 'live'), fingerprint(config, 'preview'));
  assert.notEqual(fingerprint(config, 'live'), fingerprint(options.config, 'live'));
});

test('request retries transient/network failures with bounded backoff and 30s signals', async () => {
  let count = 0;
  const delays = [];
  await request('https://admin.da.live/list/org/site/pdfs', {}, {
    wait: async (delay) => { delays.push(delay); },
    fetchImpl: async (url, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      count += 1;
      if (count === 1) throw new TypeError('network');
      return new Response(null, { status: [0, 0, 429, 503, 200][count] });
    },
  });
  assert.deepEqual(delays, [1000, 2000, 4000]);
  for (const status of [401, 403]) {
    await assert.rejects(request('https://admin.da.live/list/org/site/pdfs', {}, {
      wait: () => assert.fail('must not retry credentials'),
      fetchImpl: async () => new Response(null, { status }),
    }), /credential\/access failure/);
  }
});

test('requires credentials and rejects dangerous roots, output aliases and symlinks', async (t) => {
  const options = await fixture(t);
  await assert.rejects(buildAssetIndex(options.config, 'live', { token: '' }), /DA_IMS_TOKEN/);
  for (const roots of [['/'], ['/pdfs/../'], []]) assert.throws(() => validateRoots(roots));
  const bad = structuredClone(options.config);
  bad.outputs.live = bad.outputs.preview;
  assert.throws(() => outputPaths(bad), /unique safe/);
  bad.outputs.live = '../outside.json';
  assert.throws(() => outputPaths(bad), /unique safe/);
  await symlink('/tmp/outside.json', path.join(options.cwd, options.config.outputs.live));
  await assert.rejects(validateOutputPaths(options.config, options.cwd), /symlink/);
});

test('changed Last-Modified downloads again; absent Last-Modified never reuses text', async (t) => {
  const options = await fixture(t);
  const state = {};
  const mock = mockDA(options.config, state);
  let parses = 0;
  const extract = async () => { parses += 1; return { content: 'Text' }; };
  await buildAssetIndex(options.config, 'live', { ...options, ...mock, extractPDF: extract });
  state.modified = 'Sat, 26 Sep 2026 16:37:53 GMT';
  await buildAssetIndex(options.config, 'live', { ...options, ...mock, extractPDF: extract });
  assert.equal(parses, 2);
  const fetchImpl = async (...args) => {
    const response = await mock.fetchImpl(...args);
    response.headers.delete('last-modified');
    return response;
  };
  await buildAssetIndex(options.config, 'live', { ...options, fetchImpl, extractPDF: extract });
  await buildAssetIndex(options.config, 'live', { ...options, fetchImpl, extractPDF: extract });
  assert.equal(parses, 4);
});

test('directory requests stay serial and asset processing respects configured concurrency', async (t) => {
  const options = await fixture(t);
  const mock = mockDA(options.config);
  const active = { listings: 0, assets: 0 };
  const peaks = { listings: 0, assets: 0 };
  const fetchImpl = async (url, init) => {
    const kind = new URL(url).hostname === 'admin.da.live' ? 'listings' : 'assets';
    active[kind] += 1;
    peaks[kind] = Math.max(peaks[kind], active[kind]);
    await new Promise((resolve) => { setImmediate(resolve); });
    const response = await mock.fetchImpl(url, init);
    active[kind] -= 1;
    return response;
  };
  await buildAssetIndex(options.config, 'preview', { ...options, fetchImpl });
  assert.equal(peaks.listings, 1);
  assert.equal(peaks.assets, options.config.concurrency);
});

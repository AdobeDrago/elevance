/* eslint-env browser */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import {
  decorateAutocomplete, hasMinimumQuery, isPreviewHost, loadPhrases,
  normalizeText, phraseURL, rankPhrases,
} from '../scripts/search-autocomplete.js';
import {
  assetIndexURL, loadSearchData, searchRecords,
} from '../scripts/search-data.js';

const tick = () => new Promise((resolve) => { setTimeout(resolve, 0); });
const suggestion = (phrase, sourceCount = 1) => ({ phrase, sourceCount });

function setupDOM(t, url = 'https://main--elevance-nc--adobedrago.aem.page/search.html') {
  const dom = new JSDOM('<body class="north-carolina"><main></main></body>', { url });
  dom.window.hlx = { codeBasePath: '' };
  const originals = {};
  for (const key of ['window', 'document', 'CustomEvent', 'HTMLElement']) {
    originals[key] = globalThis[key];
    globalThis[key] = dom.window[key];
  }
  t.after(() => {
    dom.window.close();
    for (const key of Object.keys(originals)) {
      if (originals[key] === undefined) delete globalThis[key];
      else globalThis[key] = originals[key];
    }
  });
  return dom;
}

function pressKey(input, value) {
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
}

test('normalizes Unicode, accents, punctuation and whitespace; identifies delivery hosts', () => {
  assert.equal(normalizeText('  CÁFÉ—Ｃare\nForm! '), 'cafe care form');
  assert.equal(hasMinimumQuery('a b'), false);
  for (const host of ['localhost', '127.0.0.1', '[::1]', 'site.localhost', 'main--site--org.aem.page', 'site.hlx.page']) {
    assert.equal(isPreviewHost(host), true);
    assert.equal(phraseURL(host), '/search-key-phrases-preview.json');
    assert.equal(assetIndexURL(host), '/asset-index-preview.json');
  }
  for (const host of ['main--site--org.aem.live', 'provider.healthybluenc.com', 'aem.page.evil.test']) {
    assert.equal(isPreviewHost(host), false);
    assert.equal(phraseURL(host), '/search-key-phrases.json');
    assert.equal(assetIndexURL(host), '/asset-index.json');
  }
});

test('ranks exact, phrase prefix, word prefix, substring, frequency, then alphabetically', () => {
  const records = [suggestion('Scare resources', 50), suggestion('Urgent care', 2),
    suggestion('Care management', 5), suggestion('Care'), suggestion('Care planning', 4),
    suggestion('Care assistance', 5)];
  assert.deepEqual(rankPhrases(records, 'care').map((r) => r.phrase), [
    'Care', 'Care assistance', 'Care management', 'Care planning', 'Urgent care', 'Scare resources',
  ]);
  assert.equal(rankPhrases(Array.from({ length: 20 }, (_, i) => suggestion(`Care ${i}`)), 'care').length, 8);
  assert.deepEqual(rankPhrases(records, 'ca'), []);
  assert.equal(rankPhrases([suggestion('Medical Management Model')], 'model med').length, 1);
});

test('combobox keyboard, pointer, focus, blur and stale async behavior', async (t) => {
  setupDOM(t);
  const container = document.createElement('div');
  const input = document.createElement('input');
  container.append(input);
  document.body.append(container);
  const selected = [];
  input.addEventListener('search-autocomplete-select', (event) => selected.push(event.detail.phrase));
  decorateAutocomplete(input, { load: async () => [suggestion('Care'), suggestion('Care plan')] });
  input.value = 'car';
  input.focus();
  await tick();
  const list = container.querySelector('[role="listbox"]');
  assert.equal(input.getAttribute('role'), 'combobox');
  assert.equal(input.getAttribute('aria-controls'), list.id);
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  pressKey(input, 'ArrowUp');
  assert.equal(input.getAttribute('aria-activedescendant'), list.lastChild.id);
  pressKey(input, 'ArrowDown');
  assert.equal(list.firstChild.getAttribute('aria-selected'), 'true');
  pressKey(input, 'Enter');
  assert.equal(input.value, 'Care');
  assert.deepEqual(selected, ['Care']);
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.hasAttribute('aria-activedescendant'), false);
  input.dispatchEvent(new window.Event('input'));
  await tick();
  pressKey(input, 'Escape');
  assert.equal(list.hidden, true);
  input.dispatchEvent(new window.Event('input'));
  await tick();
  pressKey(input, 'Tab');
  assert.equal(list.hidden, true);
  input.dispatchEvent(new window.Event('input'));
  await tick();
  list.lastChild.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.deepEqual(selected, ['Care', 'Care plan']);
  input.dispatchEvent(new window.Event('input'));
  await tick();
  input.blur();
  assert.equal(list.hidden, true);
  let resolve;
  const lateInput = document.createElement('input');
  container.append(lateInput);
  decorateAutocomplete(lateInput, { load: () => new Promise((done) => { resolve = done; }) });
  lateInput.value = 'car';
  lateInput.focus();
  lateInput.blur();
  resolve([suggestion('Care')]);
  await tick();
  assert.equal(lateInput.getAttribute('aria-expanded'), 'false');
});

test('phrase fetch is cached, including failure, and ordinary inputs remain functional', async (t) => {
  setupDOM(t);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls += 1; throw new Error('offline'); });
  assert.deepEqual(await loadPhrases('/failed-phrases.json'), []);
  assert.deepEqual(await loadPhrases('/failed-phrases.json'), []);
  assert.equal(calls, 1);
  const input = document.createElement('input');
  document.body.append(input);
  decorateAutocomplete(input, { load: async () => { throw new Error('offline'); } });
  input.value = 'care';
  input.focus();
  await tick();
  assert.equal(input.value, 'care');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
});

test('search uses AND terms across all fields and ranks each field as specified', () => {
  const records = [
    { path: '/other/therapy', topic: 'medical' },
    { path: '/body', content: 'medical therapy' },
    { path: '/description', description: 'medical therapy' },
    { path: '/h1', header: 'medical therapy' },
    { path: '/terms', title: 'Therapy medical' },
    { path: '/prefix', title: 'Medical therapy guide' },
    { path: '/exact', title: 'Médical therapy' },
    { path: '/noindex', title: 'medical therapy', robots: 'NOINDEX' },
    { path: '//external.test', title: 'medical therapy' },
    // eslint-disable-next-line no-script-url
    { path: 'javascript:alert(1)', title: 'medical therapy' },
  ];
  assert.deepEqual(searchRecords(records, 'médical  therapy').map((r) => r.path), [
    '/exact', '/prefix', '/terms', '/h1', '/description', '/body', '/other/therapy',
  ]);
  assert.equal(searchRecords(records, 'medical missing').length, 0);
});

test('runtime sources settle independently, deduplicate, filter noindex and cache errors', async (t) => {
  setupDOM(t);
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(String(url));
    if (String(url).includes('/asset-index-preview.json')) throw new Error('temporarily unavailable');
    return Response.json({
      total: 3,
      data: [
        { path: '/care', title: 'Care' }, { path: '/care', title: 'Duplicate' },
        { path: '/draft', title: 'Draft', robots: 'noindex' },
      ],
    });
  });
  const first = await loadSearchData('/partial-query.json', 'localhost');
  assert.equal(first.failedSources, 1);
  assert.equal(first.unavailable, false);
  assert.equal(first.data.length, 1);
  await loadSearchData('/partial-query.json', 'localhost');
  assert.equal(calls.length, 2);
});

test('results page deep links, PDF body search, selection, status and header GET submission', async (t) => {
  setupDOM(t, 'https://provider.healthybluenc.com/search.html?q=therapy');
  window.placeholders = { default: {} };
  t.mock.method(globalThis, 'fetch', async (url) => {
    const value = String(url);
    if (value.includes('search-key-phrases')) return Response.json({ data: [suggestion('Therapy guide')] });
    if (value.includes('asset-index.json')) {
      return Response.json({
        total: 1,
        data: [
          { path: '/pdfs/guide.pdf', title: 'Therapy guide', content: 'Unusual procedure' },
        ],
      });
    }
    return Response.json({ total: 1, data: [{ path: '/care', title: 'Therapy guide' }] });
  });
  const { default: decorate } = await import('../blocks/search/search.js');
  const block = document.createElement('div');
  block.className = 'search';
  document.querySelector('main').append(block);
  await decorate(block);
  await tick();
  const links = [...block.querySelectorAll('.search-result-link')];
  assert.equal(links.length, 2);
  assert.equal(links[0].target, '');
  assert.equal(links[1].target, '_blank');
  assert.equal(links[1].rel, 'noopener noreferrer');
  assert.match(block.querySelector('[role="status"]').textContent, /2 results/);
  const input = block.querySelector('input');
  input.value = 'unusual procedure';
  block.querySelector('form').dispatchEvent(new window.Event('submit', { cancelable: true }));
  await tick();
  assert.equal(block.querySelectorAll('.search-result-link').length, 1);
  assert.equal(new URL(window.location).searchParams.get('q'), 'unusual procedure');
  input.value = 'ther';
  input.focus();
  await tick();
  pressKey(input, 'ArrowDown');
  pressKey(input, 'Enter');
  await tick();
  assert.equal(new URL(window.location).searchParams.get('q'), 'Therapy guide');
  assert.equal(block.querySelectorAll('.search-result-link').length, 2);

  const header = document.createElement('div');
  header.className = 'search overlay';
  header.dataset.searchMode = 'navigate';
  document.body.append(header);
  await decorate(header);
  const form = header.querySelector('form');
  const navInput = header.querySelector('input');
  let submissions = 0;
  form.addEventListener('submit', (event) => {
    submissions += 1;
    assert.equal(form.method, 'get');
    assert.equal(new URL(form.action).pathname, '/search.html');
    assert.equal(new window.FormData(form).get('q'), 'Therapy guide');
    event.preventDefault();
  });
  navInput.value = 'ther';
  navInput.focus();
  await tick();
  pressKey(navInput, 'ArrowDown');
  pressKey(navInput, 'Enter');
  assert.equal(submissions, 1);
  header.dispatchEvent(new window.CustomEvent('search:reset'));
  assert.equal(new URL(window.location).searchParams.get('q'), 'Therapy guide');
  assert.equal(navInput.value, '');
});

test('results status distinguishes partial-source errors from complete unavailability', async (t) => {
  setupDOM(t);
  window.placeholders = { default: {} };
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (/unavailable-ui|asset-index-preview/.test(String(url))) {
      return new Response(null, { status: 503 });
    }
    return Response.json({ total: 1, data: [{ path: '/care', title: 'Care guide' }] });
  });
  const { default: decorate } = await import('../blocks/search/search.js');
  for (const [route, expected] of [
    ['partial-ui', /1 result found.*incomplete/],
    ['unavailable-ui', /Search is temporarily unavailable/],
  ]) {
    const block = document.createElement('div');
    block.className = 'search';
    const source = document.createElement('a');
    source.href = `/${route}.json`;
    block.append(source);
    document.querySelector('main').append(block);
    await decorate(block);
    block.querySelector('input').value = 'care';
    block.querySelector('form').dispatchEvent(new window.Event('submit', { cancelable: true }));
    await tick();
    assert.match(block.querySelector('[role="status"]').textContent, expected);
  }
});

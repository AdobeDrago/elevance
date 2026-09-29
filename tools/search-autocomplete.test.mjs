/* eslint-env browser */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import {
  decorateAutocomplete, hasMinimumQuery, isPreviewHost, loadPhrases,
  normalizeText, phraseURL, preparePhrases, rankPhrases,
} from '../scripts/search-autocomplete.js';
import {
  assetIndexURL, loadSearchData, prepareSearchData, searchRecords,
} from '../scripts/search-data.js';

import { filterResults, resultCategories } from '../scripts/search-filters.js';

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
  const second = await loadSearchData('/partial-query.json', 'localhost');
  assert.equal(second, first);
  assert.equal(second.data, first.data);
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
    ['partial-ui', /1 result for.*incomplete/],
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

test('queries match across fields, ignore repeated terms, and normalize accents', () => {
  const records = [
    { path: '/cross-field', title: 'prior', description: 'authorization' },
    { path: '/accent', title: 'ＣＡＦÉ—resources', content: null },
    {
      path: '/empty', title: null, header: null, content: '',
    },
  ];
  assert.deepEqual(searchRecords(records, 'authorization prior'), [records[0]]);
  assert.deepEqual(searchRecords(records, 'auth auth'), [records[0]]);
  assert.deepEqual(searchRecords(records, 'cafe resources'), [records[1]]);
  assert.deepEqual(searchRecords(records, 'prior missing'), []);
  assert.deepEqual(searchRecords(records, 'a b'), []);
  assert.deepEqual(searchRecords(records, '---'), []);
});

test('normalization handles empty values, multilingual text and Unicode whitespace', () => {
  const cases = [
    [null, ''], [undefined, ''], ['', ''], ['a\tb\nc\r\nd', 'a b c d'],
    ['  cafe    care  ', 'cafe care'], ['CÁFÉ—Ｃare', 'cafe care'],
    ['ΟΣ\u2019Α', 'οσ α'], ['İstanbul', 'istanbul'], ['건강 관리', '건강 관리'],
    ['ﬃrst', 'ffirst'], ['مرحبا', 'مرحبا'],
    ['a\u00a0\u1680\u2000\u2009\u2028\u2029\u202f\u205f\u3000\ufeffb', 'a b'],
    ['one🩺two\u200bthree', 'one two three'], ['a\u0301\u0308 b\u0301', 'a b'],
    ['\ud800 guide', 'guide'],
  ];
  for (const [value, expected] of cases) assert.equal(normalizeText(value), expected);
});

test('search preparation reads PDF text once per immutable snapshot without changing records', () => {
  let reads = 0;
  const record = Object.freeze({
    path: '/pdfs/criteria.pdf',
    title: 'Café guide',
    get content() { reads += 1; return 'Outpatient therapy criteria'; },
  });
  const records = Object.freeze([record]);
  for (const query of ['cafe', 'therapy criteria', 'outpatient guide']) {
    assert.deepEqual(searchRecords(records, query), [record]);
  }
  assert.equal(reads, 1);
  assert.equal(prepareSearchData(records), prepareSearchData(records));
  assert.equal(record.title, 'Café guide');
  const replacement = Object.freeze([{ path: '/new', title: 'New therapy guide' }]);
  assert.deepEqual(searchRecords(replacement, 'therapy'), replacement);
  assert.deepEqual(searchRecords(replacement, 'outpatient'), []);
});

test('autocomplete deduplicates normalized titles and honors result limits', () => {
  const records = [
    suggestion('Café Care', 2), suggestion('Cafe—Care', 99),
    suggestion('Care guidance', 5), suggestion('Care assistance', 5),
  ];
  assert.deepEqual(rankPhrases(records, 'care'), [records[3], records[2], records[0]]);
  assert.deepEqual(rankPhrases(records, 'cafe'), [records[0]]);
  assert.deepEqual(rankPhrases(records, 'care', 1), [records[3]]);
  assert.deepEqual(rankPhrases(records, 'care', 0), []);
  assert.deepEqual(rankPhrases(records, 'missing'), []);
});

test('autocomplete reuses generated normalization and prepares legacy phrases only once', () => {
  let displayReads = 0;
  const generated = Object.freeze({
    normalized: 'cafe care',
    sourceCount: 1,
    get phrase() { displayReads += 1; return 'Café Care'; },
  });
  const catalog = Object.freeze([generated]);
  assert.equal(rankPhrases(catalog, 'cafe')[0], generated);
  assert.equal(rankPhrases(catalog, 'care')[0], generated);
  assert.equal(displayReads, 0);
  assert.equal(preparePhrases(catalog), preparePhrases(catalog));
  let legacyReads = 0;
  const legacy = Object.freeze([Object.freeze({
    get phrase() { legacyReads += 1; return 'Therapy guidance'; },
  })]);
  assert.equal(rankPhrases(legacy, 'therapy').length, 1);
  assert.equal(rankPhrases(legacy, 'guidance').length, 1);
  assert.equal(legacyReads, 1);
  assert.equal(rankPhrases([suggestion('New guidance')], 'therapy').length, 0);
});

test('merged cache canonicalizes URLs and separates document-enabled and page-only searches', async (t) => {
  setupDOM(t, 'https://cache-isolation.example/search.html');
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(String(url));
    const pdf = String(url).includes('asset-index');
    return Response.json({ data: [{ path: pdf ? '/pdfs/guide.pdf' : '/care', title: 'Care guide' }] });
  });
  const combinedPromise = loadSearchData('/cache-query.json', 'localhost');
  assert.equal(
    combinedPromise,
    loadSearchData('https://cache-isolation.example/cache-query.json', 'localhost'),
  );
  const combined = await combinedPromise;
  assert.equal(combined.data.length, 2);
  const pages = await loadSearchData('/cache-query.json', 'localhost', false);
  assert.equal(pages.data.length, 1);
  assert.equal(calls.length, 2);
  const live = await loadSearchData('/cache-query.json', 'production.example');
  assert.notEqual(live, combined);
  assert.equal(calls.length, 3);
});

async function paginatedSearch(t, {
  count = 45, url, unavailableAssets = false, records: suppliedRecords, theme = 'north-carolina',
} = {}) {
  setupDOM(t, url || 'https://pagination.example/search.html?q=care&category=all#results');
  document.body.className = theme;
  window.placeholders = { default: {} };
  const records = suppliedRecords || Array.from({ length: count }, (_, index) => ({
    path: index >= 25 ? `/pdfs/care-${index}.pdf` : `/care-${index}`,
    title: 'Care guide',
    description: index === 7 ? 'Unique resource' : 'Provider resources',
    type: index >= 25 ? 'pdf' : 'page',
  }));
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (source) => {
    calls.push(String(source));
    if (String(source).includes('asset-index')) {
      return unavailableAssets ? new Response(null, { status: 503 }) : Response.json({ data: [] });
    }
    return Response.json({ data: records });
  });
  const { default: decorate } = await import('../blocks/search/search.js');
  const block = document.createElement('div');
  block.className = 'search';
  document.querySelector('main').append(block);
  await decorate(block);
  await tick();
  return {
    block,
    calls,
    records,
    input: block.querySelector('input'),
    next: block.querySelector('.search-next'),
    previous: block.querySelector('.search-previous'),
    pagination: block.querySelector('.search-pagination'),
    status: block.querySelector('.search-status'),
    paths: () => [...block.querySelectorAll('.search-result-link')]
      .map((link) => new URL(link.href).pathname),
  };
}

test('pagination renders only the current 10 results and preserves ordering and link behavior', async (t) => {
  const view = await paginatedSearch(t);
  const expected = view.records.map((record) => record.path);
  assert.deepEqual(view.paths(), expected.slice(0, 10));
  assert.match(view.status.textContent, /Showing 1–10 of 45 results for “care” Page 1 of 5/);
  assert.equal(view.pagination.hidden, false);
  assert.equal(view.previous.disabled, true);
  assert.equal(view.next.disabled, false);
  assert.equal(view.pagination.getAttribute('aria-label'), 'Search results pages');
  assert.equal(view.next.getAttribute('aria-controls'), view.block.querySelector('.search-results').id);
  const fetches = view.calls.length;
  view.next.click();
  assert.deepEqual(view.paths(), expected.slice(10, 20));
  assert.equal(new URL(window.location).searchParams.get('page'), '2');
  assert.equal(new URL(window.location).searchParams.get('category'), 'all');
  assert.equal(window.location.hash, '#results');
  assert.equal(document.activeElement, view.block.querySelector('.search-result-link'));
  assert.match(view.status.textContent, /Showing 11–20 of 45 results for “care” Page 2 of 5/);
  view.next.click();
  assert.deepEqual(view.paths(), expected.slice(20, 30));
  assert.match(view.status.textContent, /Showing 21–30 of 45 results for “care” Page 3 of 5/);
  const pdf = view.block.querySelector('a[href$=".pdf"]');
  assert.equal(pdf.target, '_blank');
  assert.equal(pdf.rel, 'noopener noreferrer');
  assert.equal(view.block.querySelector('a[href="/care-20"]').target, '');
  view.next.click();
  assert.deepEqual(view.paths(), expected.slice(30, 40));
  assert.match(view.status.textContent, /Showing 31–40 of 45 results for “care” Page 4 of 5/);
  view.next.click();
  assert.deepEqual(view.paths(), expected.slice(40));
  assert.match(view.status.textContent, /Showing 41–45 of 45 results for “care” Page 5 of 5/);
  assert.equal(view.next.disabled, true);
  view.next.click();
  assert.equal(new URL(window.location).searchParams.get('page'), '5');
  view.previous.click();
  assert.deepEqual(view.paths(), expected.slice(30, 40));
  assert.equal(view.calls.length, fetches);
});

test('pagination restores deep links and clamps invalid or out-of-range pages', async (t) => {
  const view = await paginatedSearch(t, {
    url: 'https://pagination-deep.example/search.html?q=care&page=2',
  });
  assert.deepEqual(view.paths(), view.records.slice(10, 20).map((record) => record.path));
  for (const [value, expected] of [
    ['999', 5], ['0', 1], ['-2', 1], ['1.5', 1], ['oops', 1], ['9007199254740992', 1],
  ]) {
    window.history.replaceState({}, '', `/search.html?q=care&page=${value}`);
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    await tick();
    assert.equal(new URL(window.location).searchParams.get('page'), expected === 1 ? null : '5');
    assert.match(view.status.textContent, new RegExp(`Page ${expected} of 5`));
  }
});

test('browser back and forward restore result pages and the query', async (t) => {
  const view = await paginatedSearch(t, {
    url: 'https://pagination-history.example/search.html?q=care',
  });
  view.next.click();
  view.next.click();
  async function navigate(direction) {
    const navigated = new Promise((resolve) => {
      window.addEventListener('popstate', resolve, { once: true });
    });
    window.history[direction]();
    await navigated;
    await tick();
  }
  await navigate('back');
  assert.match(view.status.textContent, /Page 2 of 5/);
  await navigate('back');
  assert.match(view.status.textContent, /Page 1 of 5/);
  await navigate('forward');
  assert.match(view.status.textContent, /Page 2 of 5/);
  assert.equal(view.input.value, 'care');
  assert.deepEqual(view.paths(), view.records.slice(10, 20).map((record) => record.path));
});

test('new queries, autocomplete selection, clearing and empty results reset pagination', async (t) => {
  const view = await paginatedSearch(t, {
    url: 'https://pagination-reset.example/search.html?q=care',
  });
  const submit = async (value) => {
    view.input.value = value;
    view.block.querySelector('form').dispatchEvent(new window.Event('submit', { cancelable: true }));
    await tick();
  };
  view.next.click();
  view.input.value = 'unique';
  view.input.dispatchEvent(new window.Event('input'));
  assert.equal(view.pagination.hidden, true);
  // The stale page button cannot navigate the previous query during the debounce.
  view.next.click();
  assert.equal(new URL(window.location).searchParams.get('page'), '2');
  await submit('unique');
  assert.equal(new URL(window.location).searchParams.has('page'), false);
  assert.deepEqual(view.paths(), ['/care-7']);
  assert.equal(view.pagination.hidden, true);
  await submit('care');
  view.next.click();
  view.input.value = 'Care guide';
  view.input.dispatchEvent(new window.CustomEvent('search-autocomplete-select', { bubbles: true }));
  await tick();
  assert.match(view.status.textContent, /Page 1 of 5/);
  assert.equal(new URL(window.location).searchParams.has('page'), false);
  view.next.click();
  await submit('doesnotexist');
  assert.equal(view.pagination.hidden, true);
  assert.equal(view.paths().length, 0);
  assert.match(view.status.textContent, /No results found/);
  await submit('care');
  view.next.click();
  view.block.querySelector('.search-clear').click();
  assert.equal(view.paths().length, 0);
  assert.equal(view.pagination.hidden, true);
  assert.equal(new URL(window.location).searchParams.has('page'), false);
  assert.equal(new URL(window.location).searchParams.has('q'), false);
  await submit('care');
  view.next.click();
  await submit('ca');
  assert.equal(view.pagination.hidden, true);
  assert.equal(new URL(window.location).searchParams.has('page'), false);
  assert.match(view.status.textContent, /at least three/);
});

test('partial-source warnings remain visible on every results page', async (t) => {
  const view = await paginatedSearch(t, {
    url: 'https://pagination-partial.example/search.html?q=care',
    unavailableAssets: true,
  });
  for (let page = 1; page <= 5; page += 1) {
    assert.match(view.status.textContent, /results may be incomplete/);
    assert.match(view.status.textContent, new RegExp(`Page ${page} of 5`));
    view.next.click();
  }
});

test('a thousand matches create only ten result entries and one page has no controls', async (t) => {
  await t.test('large result set', async (child) => {
    const view = await paginatedSearch(child, {
      count: 1000, url: 'https://pagination-large.example/search.html?q=care',
    });
    assert.equal(view.block.querySelectorAll('.search-results > li').length, 10);
    assert.match(view.status.textContent, /1000 results for.*Page 1 of 100/);
    view.next.click();
    assert.equal(view.block.querySelectorAll('.search-results > li').length, 10);
  });
  await t.test('single page', async (child) => {
    const view = await paginatedSearch(child, {
      count: 10, url: 'https://pagination-single.example/search.html?q=care&page=5',
    });
    assert.equal(view.paths().length, 10);
    assert.equal(view.pagination.hidden, true);
    assert.equal(new URL(window.location).searchParams.has('page'), false);
  });
});

test('content filters honor metadata, fall back to descriptive fields, and combine with OR', () => {
  const records = [
    { path: '/forms', title: 'Claims guide', category: 'Policies, Guidelines & Manuals' },
    { path: '/claims', title: 'Provider information' },
    { path: '/pdfs/prior-auth-form.pdf', title: 'Care request' },
    { path: '/home', title: 'Home', content: 'Claims, forms and guidelines' },
    { path: '/other', title: 'Other', tags: ['Forms', 'Claims & Billing'] },
  ];
  assert.deepEqual(resultCategories(records[0]), ['policies']);
  assert.deepEqual(resultCategories(records[1]), ['claims']);
  assert.deepEqual(resultCategories(records[2]), ['authorization', 'forms']);
  assert.deepEqual(resultCategories(records[3]), []);
  assert.deepEqual(resultCategories(records[4]), ['claims', 'forms']);
  assert.equal(filterResults(records, []), records);
  assert.deepEqual(filterResults(records, ['claims', 'forms']), records.slice(1).filter((r) => r.path !== '/home'));
});

test('page size and filters restore from the URL and reuse matches when changed', async (t) => {
  const records = Array.from({ length: 45 }, (_, index) => ({
    path: `/care-${index}`, title: 'Care guide', category: index < 30 ? 'Forms' : 'Claims & Billing',
  }));
  const view = await paginatedSearch(t, {
    records, url: 'https://search-options.example/search.html?q=care&size=20&filter=forms&page=2',
  });
  const select = view.block.querySelector('.search-page-size select');
  const claims = view.block.querySelector('input[value="claims"]');
  const forms = view.block.querySelector('input[value="forms"]');
  const requests = view.calls.length;
  assert.equal(select.value, '20');
  assert.equal(forms.checked, true);
  assert.deepEqual(view.paths(), records.slice(20, 30).map(({ path }) => path));
  assert.match(view.status.textContent, /Showing 21–30 of 30 results/);
  claims.checked = true;
  claims.dispatchEvent(new window.Event('change'));
  assert.equal(view.paths().length, 20);
  assert.match(view.status.textContent, /Showing 1–20 of 45 results/);
  assert.equal(new URL(window.location).searchParams.has('page'), false);
  assert.deepEqual(new URL(window.location).searchParams.getAll('filter'), ['claims', 'forms']);
  forms.checked = false;
  forms.dispatchEvent(new window.Event('change'));
  assert.deepEqual(view.paths(), records.slice(30).map(({ path }) => path));
  assert.equal(view.pagination.hidden, true);
  view.block.querySelector('.search-clear-filters').click();
  assert.equal(new URL(window.location).searchParams.has('filter'), false);
  assert.equal(view.paths().length, 20);
  select.value = '10';
  select.dispatchEvent(new window.Event('change'));
  assert.equal(view.paths().length, 10);
  assert.equal(new URL(window.location).searchParams.has('size'), false);
  assert.equal(view.calls.length, requests);

  // History restores controls as well as the displayed results.
  window.history.replaceState({}, '', '/search.html?q=care&filter=claims&size=20');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  await tick();
  assert.equal(select.value, '20');
  assert.equal(claims.checked, true);
  assert.equal(forms.checked, false);
  assert.equal(view.paths().length, 15);
  window.history.replaceState({}, '', '/search.html?q=care&filter=unknown&size=999&page=999');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  await tick();
  assert.equal(select.value, '10');
  assert.equal(view.paths().length, 5);
  assert.equal(new URL(window.location).searchParams.has('filter'), false);
  assert.equal(new URL(window.location).searchParams.has('size'), false);
  assert.match(view.status.textContent, /Page 5 of 5/);
});

test('NC results separate linked titles from safe URLs and descriptions', async (t) => {
  const view = await paginatedSearch(t, {
    url: 'https://result-layout.example/search.html?q=care',
    records: [{
      path: '/pdfs/care.pdf',
      title: 'Care <img src=x>',
      description: 'Care requirements <script>unsafe</script>',
      image: '/image.jpg',
    }],
  });
  const row = view.block.querySelector('.search-results > li');
  assert.equal(row.querySelector('.search-result-title a').textContent, 'Care <img src=x>');
  assert.equal(row.querySelector('.search-result-url').textContent, 'https://result-layout.example/pdfs/care.pdf');
  assert.equal(row.querySelector('.search-result-description').closest('a'), null);
  assert.equal(row.querySelector('.search-result-description mark').textContent, 'Care');
  assert.equal(row.querySelector('img, script'), null);
  assert.equal(row.classList.contains('search-result-pdf'), true);
  assert.equal(row.querySelector('a').target, '_blank');
  assert.equal(row.querySelector('a').rel, 'noopener noreferrer');
});

test('collapsing mobile filters preserves the selected filter and results', async (t) => {
  const view = await paginatedSearch(t, {
    url: 'https://mobile-filters.example/search.html?q=care',
    records: [
      { path: '/care-form', title: 'Care form', category: 'Forms' },
      { path: '/care-claim', title: 'Care claim', category: 'Claims & Billing' },
    ],
  });
  const toggle = view.block.querySelector('.search-filters-toggle');
  const panel = document.getElementById(toggle.getAttribute('aria-controls'));
  assert.ok(panel.contains(view.block.querySelector('input[value="forms"]')));
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  view.block.querySelector('input[value="forms"]').click();
  assert.deepEqual(view.paths(), ['/care-form']);
  const url = window.location.href;
  const requests = view.calls.length;
  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  toggle.click();
  assert.equal(view.block.querySelector('input[value="forms"]').checked, true);
  assert.deepEqual(view.paths(), ['/care-form']);
  assert.equal(window.location.href, url);
  assert.equal(view.calls.length, requests);
});

test('other site themes retain their card markup and page-only data source', async (t) => {
  const view = await paginatedSearch(t, {
    theme: 'elevance',
    url: 'https://other-theme.example/search.html?q=care',
    records: [{
      path: '/care', title: 'Care guide', description: 'Provider resources', image: '/care.jpg',
    }],
  });
  assert.equal(view.block.querySelector('.search-layout, .search-page-size, .search-filters'), null);
  assert.equal(view.block.querySelector('.search-result-url'), null);
  assert.ok(view.block.querySelector('.search-result-link .search-result-image img'));
  assert.ok(view.block.querySelector('.search-result-link p'));
  assert.equal(view.status.textContent, '1 result found.');
  assert.equal(view.calls.some((url) => url.includes('asset-index')), false);
});

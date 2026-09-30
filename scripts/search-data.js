import { hasMinimumQuery, isPreviewHost, normalizeText } from './search-autocomplete.js';

const requests = new Map();
const combinedRequests = new Map();
const preparedData = new WeakMap();
const SEARCH_FIELDS = ['title', 'header', 'description', 'content', 'topic', 'type', 'path'];

export function assetIndexURL(hostname) {
  return isPreviewHost(hostname) ? '/asset-index-preview.json' : '/asset-index.json';
}

export function isSearchable(record) {
  return typeof record.path === 'string' && /^\/(?!\/)/.test(record.path)
    // eslint-disable-next-line no-control-regex
    && !/[\\\u0000-\u001f]/u.test(record.path) && !/noindex/i.test(record.robots || '');
}

async function fetchIndex(source) {
  const records = [];
  let total;
  do {
    const url = new URL(source, window.location.origin);
    url.searchParams.set('offset', records.length);
    url.searchParams.set('limit', '1000');
    // Page indexes may be paginated; each offset depends on the preceding response.
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Search index returned ${response.status}`);
    // eslint-disable-next-line no-await-in-loop
    const json = await response.json();
    if (!Array.isArray(json?.data)) throw new Error('Invalid search index');
    total = json.total ?? json.data.length;
    if (!Number.isSafeInteger(total) || total < 0
      || (!json.data.length && records.length < total)) {
      throw new Error('Incomplete search index');
    }
    records.push(...json.data);
  } while (records.length < total);
  return records;
}

export function loadIndex(source) {
  const url = new URL(source, window.location.origin).href;
  if (!requests.has(url)) requests.set(url, fetchIndex(url));
  return requests.get(url);
}

async function combineIndexes(sources) {
  const loaded = await Promise.allSettled(sources.map(loadIndex));
  const records = new Map();
  loaded.forEach((result) => {
    if (result.status === 'fulfilled') {
      result.value.forEach((record) => {
        if (isSearchable(record) && !records.has(record.path)) records.set(record.path, record);
      });
    }
  });
  const failedSources = loaded.filter((result) => result.status === 'rejected').length;
  return {
    data: [...records.values()],
    failedSources,
    unavailable: failedSources === sources.length,
  };
}

export function loadSearchData(
  pageSource = '/query-index.json',
  hostname = window.location.hostname,
  includeAssets = true,
) {
  const sources = [...new Set([pageSource, ...(includeAssets ? [assetIndexURL(hostname)] : [])]
    .map((source) => new URL(source, window.location.origin).href))];
  const key = JSON.stringify(sources);
  if (!combinedRequests.has(key)) combinedRequests.set(key, combineIndexes(sources));
  return combinedRequests.get(key);
}

// Index arrays are immutable snapshots. A new array prepares a new snapshot; discarded
// snapshots can be collected. Keep normalized fields separate to avoid copying PDF bodies
// into another combined string, while retaining original records for result display.
export function prepareSearchData(data) {
  if (!preparedData.has(data)) {
    preparedData.set(data, data.filter(isSearchable).map((result) => ({
      result,
      values: SEARCH_FIELDS.map((field) => normalizeText(result[field])),
    })));
  }
  return preparedData.get(data);
}

export function searchRecords(data, query) {
  if (!hasMinimumQuery(query)) return [];
  const normalized = normalizeText(query);
  const terms = normalized.split(' ');
  const matches = (text) => terms.every((term) => text.includes(term));
  return prepareSearchData(data).map(({ result, values }, order) => {
    if (!terms.every((term) => values.some((value) => value.includes(term)))) return null;
    const [title, header, description, content] = values;
    let rank = 6;
    if (title === normalized) rank = 0;
    else if (title.startsWith(normalized)) rank = 1;
    else if (matches(title)) rank = 2;
    else if (matches(header)) rank = 3;
    else if (matches(description)) rank = 4;
    else if (matches(content)) rank = 5;
    return { result, rank, order };
  }).filter(Boolean).sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map(({ result }) => result);
}

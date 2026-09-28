import { hasMinimumQuery, isPreviewHost, normalizeText } from './search-autocomplete.js';

const requests = new Map();

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
  if (!requests.has(source)) requests.set(source, fetchIndex(source));
  return requests.get(source);
}

export async function loadSearchData(
  pageSource = '/query-index.json',
  hostname = window.location.hostname,
  includeAssets = true,
) {
  const sources = [...new Set([pageSource, ...(includeAssets ? [assetIndexURL(hostname)] : [])])];
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

export function searchRecords(data, query) {
  if (!hasMinimumQuery(query)) return [];
  const normalized = normalizeText(query);
  const terms = normalized.split(' ');
  const fields = ['title', 'header', 'description', 'content', 'topic', 'type', 'path'];
  const matches = (text) => terms.every((term) => text.includes(term));
  return data.filter(isSearchable).map((result, order) => {
    const values = fields.map((field) => normalizeText(result[field]));
    if (!matches(values.join(' '))) return null;
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

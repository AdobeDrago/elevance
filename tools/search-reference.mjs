// Reference algorithms from commit 4d6d36d. Keep these unoptimized so tests and the
// benchmark can compare exact result order with the original full-scan behavior.
import { isSearchable } from '../scripts/search-data.js';

export function referenceNormalizeText(value = '') {
  return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ');
}

const normalizeText = referenceNormalizeText;
const hasMinimumQuery = (value) => normalizeText(value).replace(/\s/g, '').length >= 3;

export function referenceSearch(data, query) {
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

export function referencePhrases(records, query, maximum = 8) {
  const normalized = normalizeText(query);
  if (!hasMinimumQuery(normalized)) return [];
  const terms = normalized.split(' ');
  const seen = new Set();
  return records.map((record) => {
    const phrase = normalizeText(record.phrase);
    if (!phrase || seen.has(phrase) || !terms.every((term) => phrase.includes(term))) return null;
    seen.add(phrase);
    let rank = 3;
    if (phrase === normalized) rank = 0;
    else if (phrase.startsWith(normalized)) rank = 1;
    else if (terms.every((term) => phrase.split(' ').some((word) => word.startsWith(term)))) rank = 2;
    return { record, rank };
  }).filter(Boolean).sort((a, b) => a.rank - b.rank
    || (Number(b.record.sourceCount) || 0) - (Number(a.record.sourceCount) || 0)
    || a.record.phrase.localeCompare(b.record.phrase)).slice(0, maximum)
    .map(({ record }) => record);
}

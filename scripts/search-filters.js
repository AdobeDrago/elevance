import { normalizeText } from './search-autocomplete.js';

export const SEARCH_FILTERS = [
  { id: 'policies', label: 'Policies, Guidelines & Manuals', match: /\b(polic(?:y|ies)|guidelines?|manuals?)\b/ },
  { id: 'claims', label: 'Claims & Billing', match: /\b(claims?|billing|reimbursement)\b/ },
  { id: 'authorization', label: 'Prior Authorization & Eligibility', match: /\b(prior auth(?:orization)?|eligibility)\b/ },
  { id: 'forms', label: 'Forms', match: /\bforms?\b/ },
];

const categories = new WeakMap();

export function resultCategories(record) {
  if (!categories.has(record)) {
    const metadata = normalizeText([record.category, record.topic, record.tags].flat().join(' '));
    let matches = SEARCH_FILTERS.filter(({ match }) => match.test(metadata));
    if (!matches.length) {
      // Existing page indexes may not have categories. Use only descriptive fields,
      // never body text, so a passing mention does not categorize an entire document.
      const fallback = normalizeText([record.title, record.header, record.path].join(' '));
      matches = SEARCH_FILTERS.filter(({ match }) => match.test(fallback));
    }
    categories.set(record, matches.map(({ id }) => id));
  }
  return categories.get(record);
}

export function filterResults(records, selected) {
  if (!selected.length) return records;
  return records.filter((record) => resultCategories(record).some((id) => selected.includes(id)));
}

const phraseRequests = new Map();
const preparedCatalogs = new WeakMap();
let instance = 0;

export function normalizeText(value = '') {
  // The punctuation pass also collapses every whitespace run. Replacing spaces
  // again creates unnecessary intermediate strings when preparing long PDF text.
  return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function isPreviewHost(hostname = globalThis.location?.hostname || '') {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1'
    || host === '[::1]' || host === '::1' || host.endsWith('.aem.page') || host.endsWith('.hlx.page');
}

export function phraseURL(hostname) {
  return isPreviewHost(hostname) ? '/search-key-phrases-preview.json' : '/search-key-phrases.json';
}

export function hasMinimumQuery(value, minimum = 3) {
  return normalizeText(value).replace(/\s/g, '').length >= minimum;
}

// Catalogs are immutable snapshots, like the search indexes. Older catalogs without a
// generated normalized field still work; normalize those phrases once on first use.
export function preparePhrases(records) {
  if (preparedCatalogs.has(records)) return preparedCatalogs.get(records);
  const seen = new Set();
  const prepared = records.map((record) => {
    const phrase = typeof record.normalized === 'string' && record.normalized
      ? record.normalized : normalizeText(record.phrase);
    if (!phrase || seen.has(phrase)) return null;
    seen.add(phrase);
    return {
      record, phrase, words: phrase.split(' '), sourceCount: Number(record.sourceCount) || 0,
    };
  }).filter(Boolean);
  preparedCatalogs.set(records, prepared);
  return prepared;
}

export function rankPhrases(records, query, maximum = 8) {
  const normalized = normalizeText(query);
  if (!hasMinimumQuery(normalized)) return [];
  const terms = normalized.split(' ');
  return preparePhrases(records).map((entry) => {
    const { phrase, words } = entry;
    if (!terms.every((term) => phrase.includes(term))) return null;
    let rank = 3;
    if (phrase === normalized) rank = 0;
    else if (phrase.startsWith(normalized)) rank = 1;
    else if (terms.every((term) => words.some((word) => word.startsWith(term)))) rank = 2;
    return { ...entry, rank };
  }).filter(Boolean).sort((a, b) => a.rank - b.rank
    || b.sourceCount - a.sourceCount
    || a.record.phrase.localeCompare(b.record.phrase))
    .slice(0, maximum)
    .map(({ record }) => record);
}

export function loadPhrases(url = phraseURL()) {
  if (!phraseRequests.has(url)) {
    phraseRequests.set(url, fetch(url, { signal: AbortSignal.timeout(30000) }).then((response) => {
      if (!response.ok) throw new Error('Autocomplete unavailable');
      return response.json();
    }).then((json) => (Array.isArray(json.data) ? json.data : [])).catch(() => []));
  }
  return phraseRequests.get(url);
}

// The caller supplies a positioned container and owns all visual styling and navigation.
export function decorateAutocomplete(input, {
  container = input.parentElement, load = loadPhrases, maximum = 8,
} = {}) {
  instance += 1;
  const list = document.createElement('ul');
  list.id = `search-suggestions-${instance}`;
  list.className = 'search-suggestions';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Search suggestions');
  list.hidden = true;
  container.append(list);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', list.id);
  input.setAttribute('aria-expanded', 'false');
  input.autocomplete = 'off';
  let active = -1;
  let matches = [];
  let revision = 0;

  function close() {
    revision += 1;
    active = -1;
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    [...list.children].forEach((option) => option.setAttribute('aria-selected', 'false'));
  }

  function select(index) {
    const record = matches[index];
    if (!record) return;
    input.value = record.phrase;
    close();
    input.dispatchEvent(new CustomEvent('search-autocomplete-select', {
      bubbles: true, detail: record,
    }));
  }

  function activate(index) {
    active = index;
    [...list.children].forEach((option, current) => {
      option.setAttribute('aria-selected', String(current === active));
    });
    input.setAttribute('aria-activedescendant', list.children[active].id);
    list.children[active].scrollIntoView?.({ block: 'nearest' });
  }

  async function refresh() {
    close();
    if (!hasMinimumQuery(input.value)) return;
    const current = revision;
    const { value } = input;
    let records;
    try {
      records = await load();
    } catch {
      return;
    }
    if (current !== revision || input !== document.activeElement || value !== input.value) return;
    matches = rankPhrases(records, value, maximum);
    list.replaceChildren();
    matches.forEach((record, index) => {
      const option = document.createElement('li');
      option.id = `${list.id}-${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.textContent = record.phrase;
      option.addEventListener('pointerdown', (event) => event.preventDefault());
      option.addEventListener('click', () => select(index));
      list.append(option);
    });
    list.hidden = !matches.length;
    input.setAttribute('aria-expanded', String(matches.length > 0));
  }

  input.addEventListener('input', refresh);
  input.addEventListener('focus', refresh);
  input.addEventListener('blur', close);
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (event.key === 'Tab') close();
    if (list.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      let next = (active + 1) % matches.length;
      if (event.key === 'ArrowUp') {
        next = active < 0 ? matches.length - 1 : (active - 1 + matches.length) % matches.length;
      }
      activate(next);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      event.stopPropagation();
      select(active);
    }
  });
  return { close, refresh };
}

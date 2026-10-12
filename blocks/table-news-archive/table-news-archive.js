/*
 * table-news-archive — filterable / sortable / paginated document news feed.
 *
 * Source: https://provider.healthybluenc.com/north-carolina-provider/archives
 * (ul.tab_list filter tabs + Sort By dropdown over a list of PDF rows).
 *
 * Fetches the GPP news-archives service (AllDocs[]: title, URI, updateDate
 * "MM-DD-YYYY", topic[]); any authored rows are ignored. The filter tabs are
 * the fixed topic list below, and a document shows under every topic it is
 * tagged with. Adds a Sort By dropdown (Newest / Oldest / A-Z / Z-A) and
 * paginates the visible rows with a "Load More" button.
 *
 * Structural/behavioral only — brand styling from body.north-carolina tokens.
 */

import { sampleRUM } from '../../scripts/aem.js';
import { fetchNewsArchiveData } from '../../scripts/lookup-service.js';

const PAGE_SIZE = 10;
const ALL = 'All';
const TOPICS = ['Provider Newsletter', 'Medicaid News'];
const DOC_BASE_URL = 'https://provider.healthybluenc.com';

function resolveDocUrl(uri) {
  if (!uri) return '#';
  return uri.startsWith('/') ? `${DOC_BASE_URL}${uri}` : uri;
}

// updateDate is "MM-DD-YYYY", which Date.parse does not handle reliably.
function parseDate(str) {
  const [month, day, year] = (str || '').split('-').map(Number);
  if (!month || !day || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function formatDate(ts, fallback) {
  if (!ts) return fallback || '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toDocModel(doc) {
  const ts = parseDate(doc.updateDate);
  return {
    title: (doc.title || '').trim(),
    href: resolveDocUrl(doc.URI),
    date: formatDate(ts, doc.updateDate),
    ts,
    topics: Array.isArray(doc.topic) ? doc.topic : [],
  };
}

export default async function decorate(block) {
  let docs = [];

  // 1. Build the UI shell.
  block.textContent = '';

  const categories = [ALL, ...TOPICS];

  const controls = document.createElement('div');
  controls.className = 'table-news-archive-controls';

  const tabs = document.createElement('div');
  tabs.className = 'table-news-archive-tabs';
  tabs.setAttribute('role', 'tablist');

  const sortWrap = document.createElement('div');
  sortWrap.className = 'table-news-archive-sort';
  const sortLabel = document.createElement('label');
  sortLabel.className = 'table-news-archive-sort-label';
  sortLabel.textContent = 'Sort By';
  const sortId = 'table-news-archive-sort-select';
  sortLabel.setAttribute('for', sortId);
  const sortSelect = document.createElement('select');
  sortSelect.id = sortId;
  sortSelect.setAttribute('aria-label', 'Sort by');
  [['newest', 'Newest'], ['oldest', 'Oldest'], ['az', 'A-Z'], ['za', 'Z-A']]
    .forEach(([v, label]) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = label;
      sortSelect.append(opt);
    });
  sortWrap.append(sortLabel, sortSelect);

  const status = document.createElement('p');
  status.className = 'table-news-archive-status';
  status.textContent = 'Loading archives…';

  const list = document.createElement('ul');
  list.className = 'table-news-archive-list';

  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'table-news-archive-more';
  moreBtn.textContent = 'Load More';
  moreBtn.hidden = true;

  controls.append(tabs, sortWrap);
  block.append(controls, status, list, moreBtn);

  // 2. State + rendering.
  const state = { category: ALL, sort: 'newest', shown: PAGE_SIZE };

  function filtered() {
    let rows = docs.filter((d) => state.category === ALL || d.topics.includes(state.category));
    rows = rows.slice().sort((a, b) => {
      if (state.sort === 'newest') return b.ts - a.ts;
      if (state.sort === 'oldest') return a.ts - b.ts;
      if (state.sort === 'az') return a.title.localeCompare(b.title);
      if (state.sort === 'za') return b.title.localeCompare(a.title);
      return 0;
    });
    return rows;
  }

  function render() {
    const rows = filtered();
    list.textContent = '';
    rows.slice(0, state.shown).forEach((d) => {
      const li = document.createElement('li');
      li.className = 'table-news-archive-item';
      const a = document.createElement('a');
      a.href = d.href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = d.title;
      a.className = 'table-news-archive-item-title';
      const date = document.createElement('span');
      date.className = 'table-news-archive-item-date';
      date.textContent = d.date;
      li.append(a, date);
      list.append(li);
    });
    status.textContent = rows.length ? '' : 'No documents found.';
    status.hidden = rows.length > 0;
    moreBtn.hidden = state.shown >= rows.length;
  }

  categories.forEach((cat) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'table-news-archive-tab';
    tab.textContent = cat;
    tab.setAttribute('role', 'tab');
    if (cat === state.category) tab.setAttribute('aria-selected', 'true');
    tab.addEventListener('click', () => {
      state.category = cat;
      state.shown = PAGE_SIZE;
      tabs.querySelectorAll('.table-news-archive-tab').forEach((t) => t.removeAttribute('aria-selected'));
      tab.setAttribute('aria-selected', 'true');
      render();
    });
    tabs.append(tab);
  });

  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    render();
  });

  moreBtn.addEventListener('click', () => {
    state.shown += PAGE_SIZE;
    render();
  });

  // 3. Load the document list from the news-archives service.
  try {
    const data = await fetchNewsArchiveData();
    docs = (data?.AllDocs ?? []).map(toDocModel).filter((d) => d.title);
    render();
  } catch (err) {
    status.textContent = 'Unable to load archives right now. Please try again later.';
    block.dataset.loadError = err.message;
    sampleRUM('error', { source: 'table-news-archive', target: err.message });
  }
}

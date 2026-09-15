/*
 * table-news-archive — filterable / sortable / paginated document news feed.
 *
 * Authoring content model (one row per document):
 *   | linked document title | publication date | category |
 * The block derives the category filter tabs from the distinct category
 * values, adds a Sort By dropdown (Newest / Oldest / A-Z / Z-A), and paginates
 * the visible rows with a "Load More" button.
 *
 * Structural/behavioral only — brand styling from body.north-carolina tokens.
 */

const PAGE_SIZE = 10;
const ALL = 'All';

function parseDate(str) {
  const t = Date.parse((str || '').trim());
  return Number.isNaN(t) ? 0 : t;
}

export default function decorate(block) {
  // 1. Read authored rows into a document model.
  const docs = [...block.children].map((row) => {
    const cells = [...row.children];
    const titleCell = cells[0];
    const dateText = (cells[1]?.textContent || '').trim();
    const category = (cells[2]?.textContent || '').trim() || ALL;
    const link = titleCell?.querySelector('a');
    return {
      title: (link?.textContent || titleCell?.textContent || '').trim(),
      href: link?.getAttribute('href') || '',
      date: dateText,
      ts: parseDate(dateText),
      category,
    };
  }).filter((d) => d.title);

  // 2. Build the UI shell.
  block.textContent = '';

  const categories = [ALL, ...[...new Set(docs.map((d) => d.category))].filter((c) => c !== ALL)];

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

  const list = document.createElement('ul');
  list.className = 'table-news-archive-list';

  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'table-news-archive-more';
  moreBtn.textContent = 'Load More';

  controls.append(tabs, sortWrap);
  block.append(controls, list, moreBtn);

  // 3. State + rendering.
  const state = { category: ALL, sort: 'newest', shown: PAGE_SIZE };

  function filtered() {
    let rows = docs.filter((d) => state.category === ALL || d.category === state.category);
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
      a.textContent = d.title;
      a.className = 'table-news-archive-item-title';
      const date = document.createElement('span');
      date.className = 'table-news-archive-item-date';
      date.textContent = d.date;
      li.append(a, date);
      list.append(li);
    });
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

  render();
}

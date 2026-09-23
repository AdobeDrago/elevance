import {
  createOptimizedPicture,
  decorateIcons,
  fetchPlaceholders,
} from '../../scripts/aem.js';

const MIN_QUERY_LENGTH = 3;
const dataPromises = new Map();
let searchInstance = 0;

function findNextHeading(el) {
  let precedingEl = el.parentElement?.previousElementSibling || el.parentElement?.parentElement;
  let heading = 'H2';

  while (precedingEl) {
    const lastHeading = [...precedingEl.querySelectorAll('h1, h2, h3, h4, h5, h6')].pop();
    if (lastHeading) {
      const level = parseInt(lastHeading.nodeName[1], 10);
      heading = level < 6 ? `H${level + 1}` : 'H6';
      break;
    }
    precedingEl = precedingEl.previousElementSibling || precedingEl.parentElement;
  }

  return heading;
}

function highlightTextElements(terms, elements) {
  elements.forEach((element) => {
    if (!element?.textContent) return;

    const matches = [];
    const { textContent } = element;
    terms.forEach((term) => {
      let start = 0;
      let offset = textContent.toLowerCase().indexOf(term.toLowerCase(), start);
      while (offset >= 0) {
        matches.push({ offset, term: textContent.substring(offset, offset + term.length) });
        start = offset + term.length;
        offset = textContent.toLowerCase().indexOf(term.toLowerCase(), start);
      }
    });

    if (!matches.length) return;

    matches.sort((a, b) => a.offset - b.offset);
    let currentIndex = 0;
    const fragment = matches.reduce((acc, { offset, term }) => {
      if (offset < currentIndex) return acc;
      const textBefore = textContent.substring(currentIndex, offset);
      if (textBefore) acc.append(document.createTextNode(textBefore));
      const markedTerm = document.createElement('mark');
      markedTerm.textContent = term;
      acc.append(markedTerm);
      currentIndex = offset + term.length;
      return acc;
    }, document.createDocumentFragment());
    const textAfter = textContent.substring(currentIndex);
    if (textAfter) fragment.append(document.createTextNode(textAfter));
    element.replaceChildren(fragment);
  });
}

export async function fetchData(source) {
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Search index returned ${response.status}`);
    const json = await response.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to load search index', error);
    return null;
  }
}

function loadData(source) {
  if (!dataPromises.has(source)) {
    const dataPromise = fetchData(source).then((data) => {
      if (!data) dataPromises.delete(source);
      return data;
    });
    dataPromises.set(source, dataPromise);
  }
  return dataPromises.get(source);
}

function getResultTitle(result) {
  return result.title || result.header || result.path || '';
}

function renderResult(result, searchTerms, titleTag) {
  const listItem = document.createElement('li');
  const link = document.createElement('a');
  link.className = 'search-result-link';
  link.href = result.path;

  if (result.image) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'search-result-image';
    imageWrapper.append(createOptimizedPicture(result.image, '', false, [{ width: '375' }]));
    link.append(imageWrapper);
  }

  const content = document.createElement('div');
  content.className = 'search-result-content';
  const titleText = getResultTitle(result);
  if (titleText) {
    const title = document.createElement(titleTag);
    title.className = 'search-result-title';
    title.textContent = titleText;
    highlightTextElements(searchTerms, [title]);
    content.append(title);
  }

  if (result.description) {
    const description = document.createElement('p');
    description.textContent = result.description;
    highlightTextElements(searchTerms, [description]);
    content.append(description);
  }

  link.append(content);
  listItem.append(link);
  return listItem;
}

function compareFound(hit1, hit2) {
  if (hit1.group !== hit2.group) return hit1.group - hit2.group;
  if (hit1.position !== hit2.position) return hit1.position - hit2.position;
  return hit1.order - hit2.order;
}

function filterData(searchTerms, data) {
  return data
    .map((result, order) => {
      const title = getResultTitle(result).toLowerCase();
      const metadata = [result.description, result.path]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const allContent = `${title} ${metadata}`;
      if (!searchTerms.every((term) => allContent.includes(term))) return null;

      const titlePositions = searchTerms.map((term) => title.indexOf(term));
      const titleMatch = titlePositions.every((position) => position >= 0);
      return {
        group: titleMatch ? 0 : 1,
        order,
        position: titleMatch ? Math.max(...titlePositions) : allContent.indexOf(searchTerms[0]),
        result,
      };
    })
    .filter(Boolean)
    .sort(compareFound)
    .map(({ result }) => result);
}

function updateQueryParameter(value) {
  if (!window.history.replaceState) return;
  const url = new URL(window.location.href);
  if (value) url.searchParams.set('q', value);
  else url.searchParams.delete('q');
  window.history.replaceState({}, '', url);
}

function clearSearchResults(block) {
  const results = block.querySelector('.search-results');
  results.replaceChildren();
  results.classList.remove('no-results');
  results.hidden = true;
  results.setAttribute('aria-busy', 'false');
  block.querySelector('.search-status').textContent = '';
}

function clearSearch(block, clearInput = false) {
  clearSearchResults(block);
  if (clearInput) {
    const input = block.querySelector('.search-input');
    input.value = '';
    block.querySelector('.search-clear').hidden = true;
  }
  updateQueryParameter('');
}

function requestClose(block) {
  clearSearch(block, true);
  block.dispatchEvent(new CustomEvent('search:close', { bubbles: true }));
}

async function renderResults(block, config, filteredData, searchTerms) {
  const results = block.querySelector('.search-results');
  const status = block.querySelector('.search-status');
  results.replaceChildren();
  results.classList.toggle('no-results', !filteredData.length);

  if (filteredData.length) {
    filteredData.forEach((result) => {
      results.append(renderResult(result, searchTerms, results.dataset.h));
    });
    const resultLabel = filteredData.length === 1 ? 'result' : 'results';
    status.textContent = `${filteredData.length} ${resultLabel} found.`;
  } else {
    const noResultsMessage = document.createElement('li');
    noResultsMessage.textContent = config.placeholders.searchNoResults || 'No results found.';
    results.append(noResultsMessage);
    status.textContent = noResultsMessage.textContent;
  }

  results.hidden = false;
  results.setAttribute('aria-busy', 'false');
}

function renderSearchError(block, config) {
  const results = block.querySelector('.search-results');
  const status = block.querySelector('.search-status');
  const message = config.placeholders.searchError || 'Search is temporarily unavailable.';
  const errorItem = document.createElement('li');
  errorItem.textContent = message;
  results.replaceChildren(errorItem);
  results.classList.add('no-results');
  results.hidden = false;
  results.setAttribute('aria-busy', 'false');
  status.textContent = message;
}

async function handleSearch(input, block, config) {
  const searchValue = input.value.trim();
  updateQueryParameter(searchValue);
  block.dataset.query = searchValue;

  if (searchValue.length < MIN_QUERY_LENGTH) {
    clearSearchResults(block);
    return;
  }

  const searchTerms = searchValue.toLowerCase().split(/\s+/).filter(Boolean);
  block.querySelector('.search-status').textContent = 'Searching.';
  block.querySelector('.search-results').setAttribute('aria-busy', 'true');
  const data = await loadData(config.source);
  if (block.dataset.query !== searchValue) return;
  if (!data) {
    renderSearchError(block, config);
    return;
  }
  await renderResults(block, config, filterData(searchTerms, data), searchTerms);
}

function searchResultsContainer(block) {
  const results = document.createElement('ul');
  searchInstance += 1;
  results.id = `search-results-${searchInstance}`;
  results.className = 'search-results';
  results.dataset.h = findNextHeading(block);
  results.setAttribute('aria-label', 'Search results');
  results.setAttribute('aria-busy', 'false');
  results.hidden = true;
  return results;
}

function searchStatus() {
  const status = document.createElement('p');
  status.className = 'search-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  return status;
}

function searchIcon() {
  const icon = document.createElement('span');
  icon.classList.add('icon', 'icon-search');
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function searchClose(block) {
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'search-close';
  closeButton.setAttribute('aria-label', 'Close site search');
  closeButton.addEventListener('click', () => requestClose(block));
  return closeButton;
}

function searchBox(block, config, resultsId) {
  const box = document.createElement('div');
  box.className = 'search-box';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.name = 'q';
  input.autocomplete = 'off';
  input.placeholder = config.placeholders.searchPlaceholder || 'What are you searching for?';
  input.setAttribute('aria-label', input.placeholder);
  input.setAttribute('aria-controls', resultsId);

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'search-clear';
  clearButton.setAttribute('aria-label', 'Clear search');
  clearButton.hidden = true;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearButton.hidden = !input.value;
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => handleSearch(input, block, config), 150);
  });
  input.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape') return;
    window.clearTimeout(debounceTimer);
    if (block.classList.contains('overlay')) requestClose(block);
    else clearSearch(block, true);
  });
  clearButton.addEventListener('click', () => {
    window.clearTimeout(debounceTimer);
    clearSearch(block, true);
    input.focus();
  });

  box.append(searchIcon(), input, clearButton, searchClose(block));
  return box;
}

export default async function decorate(block) {
  const placeholders = await fetchPlaceholders();
  const sourceLink = block.querySelector('a[href]');
  const source = sourceLink?.href || '/query-index.json';
  const results = searchResultsContainer(block);
  const config = { source, placeholders };
  block.setAttribute('role', 'search');
  block.setAttribute('aria-label', 'Site search');
  block.addEventListener('search:reset', () => clearSearch(block, true));
  block.replaceChildren(
    searchBox(block, config, results.id),
    searchStatus(),
    results,
  );

  const query = new URL(window.location.href).searchParams.get('q');
  if (query) {
    const input = block.querySelector('.search-input');
    input.value = query;
    block.querySelector('.search-clear').hidden = false;
    handleSearch(input, block, config);
  }

  decorateIcons(block);
}

import {
  createOptimizedPicture,
  decorateIcons,
  fetchPlaceholders,
} from '../../scripts/aem.js';

import { decorateAutocomplete, hasMinimumQuery, normalizeText } from '../../scripts/search-autocomplete.js';
import { loadSearchData, searchRecords } from '../../scripts/search-data.js';
import { filterResults, SEARCH_FILTERS } from '../../scripts/search-filters.js';

let searchInstance = 0;
const RESULTS_PER_PAGE = 10;
const PAGE_SIZES = [10, 20, 30, 40, 50];
const resultStates = new WeakMap();

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

function getResultTitle(result) {
  return result.title || result.header || result.path || '';
}

function renderResult(result, searchTerms, titleTag, config) {
  const listItem = document.createElement('li');
  const link = document.createElement('a');
  link.className = 'search-result-link';
  link.href = result.path;
  if (result.type?.toLowerCase() === 'pdf' || /\.pdf(?:[?#]|$)/i.test(result.path)) {
    listItem.classList.add('search-result-pdf');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${getResultTitle(result)} (PDF, opens in a new tab)`);
  }

  if (config.northCarolina) {
    const title = document.createElement(titleTag);
    title.className = 'search-result-title';
    link.textContent = getResultTitle(result);
    title.append(link);
    const url = document.createElement('p');
    url.className = 'search-result-url';
    url.textContent = new URL(result.path, window.location.origin).href;
    listItem.append(title, url);
    if (result.description) {
      const description = document.createElement('p');
      description.className = 'search-result-description';
      description.textContent = result.description;
      highlightTextElements(searchTerms, [description]);
      listItem.append(description);
    }
    return listItem;
  }

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

function updateQueryParameter(value, page = 1, push = false, options = null) {
  if (!window.history.replaceState) return;
  const url = new URL(window.location.href);
  if (value) url.searchParams.set('q', value);
  else url.searchParams.delete('q');
  if (value && page > 1) url.searchParams.set('page', page);
  else url.searchParams.delete('page');
  if (options) {
    if (options.size !== RESULTS_PER_PAGE) url.searchParams.set('size', options.size);
    else url.searchParams.delete('size');
    url.searchParams.delete('filter');
    options.filters.forEach((filter) => url.searchParams.append('filter', filter));
  }
  if (url.href !== window.location.href) {
    window.history[push ? 'pushState' : 'replaceState']({}, '', url);
  }
}

function requestedPage() {
  const value = new URL(window.location.href).searchParams.get('page');
  const page = Number(value);
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(page) ? page : 1;
}

function searchOptions(block) {
  return {
    size: Number(block.querySelector('.search-page-size select')?.value) || RESULTS_PER_PAGE,
    filters: [...block.querySelectorAll('.search-filters input:checked')].map((input) => input.value),
  };
}

function restoreOptions(block) {
  const { searchParams } = new URL(window.location.href);
  const size = Number(searchParams.get('size'));
  const select = block.querySelector('.search-page-size select');
  if (select) select.value = PAGE_SIZES.includes(size) ? size : RESULTS_PER_PAGE;
  block.querySelectorAll('.search-filters input').forEach((input) => {
    input.checked = searchParams.getAll('filter').includes(input.value);
  });
}

function changeOptions(block, config) {
  const input = block.querySelector('.search-input');
  const state = resultStates.get(block);
  if (!state || input.value.trim() !== state.query) {
    // eslint-disable-next-line no-use-before-define
    handleSearch(input, block, config);
    return;
  }
  state.options = searchOptions(block);
  state.filteredData = filterResults(state.matches, state.options.filters);
  state.page = 1;
  updateQueryParameter(state.query, 1, true, state.options);
  // eslint-disable-next-line no-use-before-define
  renderResults(block);
}

function clearSearchResults(block) {
  resultStates.delete(block);
  const results = block.querySelector('.search-results');
  results.replaceChildren();
  results.classList.remove('no-results');
  results.hidden = true;
  results.setAttribute('aria-busy', 'false');
  block.querySelector('.search-status').textContent = '';
  block.querySelector('.search-pagination').hidden = true;
}

function clearSearch(block, clearInput = false) {
  block.dataset.query = '';
  clearSearchResults(block);
  if (clearInput) {
    const input = block.querySelector('.search-input');
    input.value = '';
    block.querySelector('.search-clear').hidden = true;
  }
  if (block.dataset.searchMode !== 'navigate') updateQueryParameter('');
}

function requestClose(block) {
  clearSearch(block, true);
  block.dispatchEvent(new CustomEvent('search:close', { bubbles: true }));
}

function renderResults(block) {
  const {
    config, filteredData, searchTerms, page, failedSources, query, options,
  } = resultStates.get(block);
  const results = block.querySelector('.search-results');
  const status = block.querySelector('.search-status');
  const pagination = block.querySelector('.search-pagination');
  const totalPages = Math.ceil(filteredData.length / options.size);
  const start = (page - 1) * options.size;
  const end = Math.min(start + options.size, filteredData.length);
  const fragment = document.createDocumentFragment();
  results.classList.toggle('no-results', !filteredData.length);

  if (filteredData.length) {
    filteredData.slice(start, end).forEach((result) => {
      fragment.append(renderResult(result, searchTerms, results.dataset.h, config));
    });
    const resultLabel = filteredData.length === 1 ? 'result' : 'results';
    if (config.pageView) {
      const range = document.createElement('strong');
      range.textContent = `${start + 1}–${end}`;
      const count = document.createElement('strong');
      count.textContent = filteredData.length;
      const term = document.createElement('strong');
      term.textContent = `“${query}”`;
      status.replaceChildren('Showing ', range, ' of ', count, ` ${resultLabel} for `, term);
      if (totalPages > 1) {
        const pageStatus = document.createElement('span');
        pageStatus.className = 'search-page-announcement';
        pageStatus.textContent = ` Page ${page} of ${totalPages}.`;
        status.append(pageStatus);
      }
    } else {
      status.textContent = `${filteredData.length} ${resultLabel} found.`;
      if (totalPages > 1) {
        status.textContent += ` Showing ${start + 1}–${end}. Page ${page} of ${totalPages}.`;
      }
    }
  } else {
    const noResultsMessage = document.createElement('li');
    noResultsMessage.textContent = config.placeholders.searchNoResults || 'No results found.';
    fragment.append(noResultsMessage);
    status.textContent = noResultsMessage.textContent;
  }

  if (failedSources) {
    const warning = document.createElement('span');
    warning.className = 'search-source-warning';
    warning.textContent = ' Some search sources are temporarily unavailable; results may be incomplete.';
    status.append(warning);
  }
  results.replaceChildren(fragment);
  results.hidden = false;
  results.setAttribute('aria-busy', 'false');
  pagination.hidden = totalPages <= 1;
  pagination.querySelector('.search-page-label').textContent = `Page ${page} of ${totalPages || 1}`;
  pagination.querySelector('.search-previous').disabled = page <= 1;
  pagination.querySelector('.search-next').disabled = page >= totalPages;
}

function changeResultsPage(block, direction) {
  const state = resultStates.get(block);
  if (!state || block.querySelector('.search-input').value.trim() !== state.query) return;
  const totalPages = Math.ceil(state.filteredData.length / state.options.size);
  const nextPage = Math.max(1, Math.min(state.page + direction, totalPages));
  if (state.page === nextPage) return;
  state.page = nextPage;
  const options = state.config.pageView ? state.options : null;
  updateQueryParameter(state.query, nextPage, true, options);
  renderResults(block);
  const results = block.querySelector('.search-results');
  results.querySelector('a')?.focus({ preventScroll: true });
  results.scrollIntoView?.({ block: 'start' });
}

function searchPagination(block, resultsId) {
  const pagination = document.createElement('nav');
  pagination.className = 'search-pagination';
  pagination.setAttribute('aria-label', 'Search results pages');
  pagination.hidden = true;
  const label = document.createElement('span');
  label.className = 'search-page-label';
  const buttons = [-1, 1].map((direction) => {
    const button = document.createElement('button');
    const previous = direction === -1;
    button.type = 'button';
    button.className = previous ? 'search-previous' : 'search-next';
    button.textContent = previous ? 'Previous' : 'Next';
    button.setAttribute('aria-label', `${previous ? 'Previous' : 'Next'} results page`);
    button.setAttribute('aria-controls', resultsId);
    button.addEventListener('click', () => changeResultsPage(block, direction));
    return button;
  });
  pagination.append(buttons[0], label, buttons[1]);
  return pagination;
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

async function handleSearch(input, block, config, page = 1) {
  const searchValue = input.value.trim();
  if (config.navigate) return;
  const currentOptions = config.pageView ? searchOptions(block) : null;
  updateQueryParameter(searchValue, page, false, currentOptions);
  block.dataset.query = searchValue;
  clearSearchResults(block);

  if (!hasMinimumQuery(searchValue)) {
    updateQueryParameter(searchValue);
    block.querySelector('.search-status').textContent = searchValue
      ? 'Enter at least three characters to search.' : '';
    return;
  }

  const searchTerms = normalizeText(searchValue).split(' ');
  block.querySelector('.search-status').textContent = 'Searching.';
  block.querySelector('.search-results').setAttribute('aria-busy', 'true');
  const { data, failedSources, unavailable } = await loadSearchData(
    config.source,
    window.location.hostname,
    config.northCarolina,
  );
  if (block.dataset.query !== searchValue || input.value.trim() !== searchValue) return;
  if (unavailable) {
    renderSearchError(block, config);
    return;
  }
  const matches = searchRecords(data, searchValue);
  const options = searchOptions(block);
  const filteredData = filterResults(matches, options.filters);
  const totalPages = Math.ceil(filteredData.length / options.size);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  resultStates.set(block, {
    config,
    matches,
    options,
    filteredData,
    searchTerms,
    page: currentPage,
    failedSources,
    query: searchValue,
  });
  updateQueryParameter(searchValue, currentPage);
  renderResults(block);
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

function searchFilters(block, config) {
  const filters = document.createElement('fieldset');
  filters.className = 'search-filters';
  const legend = document.createElement('legend');
  legend.textContent = 'Filter by content type';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'search-filters-toggle';
  toggle.textContent = legend.textContent;
  toggle.setAttribute('aria-expanded', 'false');
  const options = document.createElement('div');
  options.className = 'search-filter-options';
  options.id = `search-filters-${searchInstance}`;
  toggle.setAttribute('aria-controls', options.id);
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    filters.classList.toggle('is-expanded', expanded);
  });
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'search-clear-filters';
  clear.textContent = 'Clear all filters';
  clear.addEventListener('click', () => {
    filters.querySelectorAll('input').forEach((input) => { input.checked = false; });
    changeOptions(block, config);
  });
  options.append(clear);
  filters.append(legend, toggle, options);
  SEARCH_FILTERS.forEach(({ id, label }) => {
    const option = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = id;
    input.addEventListener('change', () => changeOptions(block, config));
    option.append(input, document.createTextNode(label));
    options.append(option);
  });
  return filters;
}

function pageSizeControl(block, config) {
  const control = document.createElement('div');
  control.className = 'search-page-size';
  const label = document.createElement('label');
  label.textContent = 'Results per page';
  const select = document.createElement('select');
  select.id = `search-page-size-${searchInstance}`;
  label.htmlFor = select.id;
  PAGE_SIZES.forEach((size) => {
    const option = document.createElement('option');
    option.value = size;
    option.textContent = size;
    select.append(option);
  });
  select.addEventListener('change', () => changeOptions(block, config));
  control.append(label, select);
  return control;
}

function searchBox(block, config) {
  const box = document.createElement('form');
  box.method = 'get';
  box.action = config.northCarolina ? '/north-carolina-provider/search' : '/search.html';
  box.className = 'search-box';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.name = 'q';
  input.autocomplete = 'off';
  input.placeholder = config.placeholders.searchPlaceholder || 'What are you searching for?';
  input.setAttribute('aria-label', input.placeholder);
  input.required = true;
  input.minLength = 3;

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'search-clear';
  clearButton.setAttribute('aria-label', 'Clear search');
  clearButton.hidden = true;

  let queryContainer = box;
  if (config.pageView) {
    queryContainer = document.createElement('div');
    queryContainer.className = 'search-query';
    const label = document.createElement('label');
    input.id = `search-input-${searchInstance}`;
    label.htmlFor = input.id;
    label.textContent = 'Search Again';
    input.removeAttribute('aria-label');
    clearButton.textContent = 'clear';
    queryContainer.append(label, input, clearButton);
    box.append(queryContainer, pageSizeControl(block, config));
  } else box.append(searchIcon(), input, clearButton, searchClose(block));
  const autocomplete = config.northCarolina
    ? decorateAutocomplete(input, { container: queryContainer }) : null;
  let debounceTimer;
  const reset = () => {
    window.clearTimeout(debounceTimer);
    autocomplete?.close();
    clearSearch(block, true);
  };
  box.addEventListener('submit', (event) => {
    window.clearTimeout(debounceTimer);
    if (!hasMinimumQuery(input.value)) {
      event.preventDefault();
      if (!config.navigate) handleSearch(input, block, config);
      input.setCustomValidity('Enter at least three characters to search.');
      input.reportValidity();
    } else if (!config.navigate) {
      event.preventDefault();
      autocomplete?.close();
      handleSearch(input, block, config);
    }
  });
  input.addEventListener('search-autocomplete-select', () => {
    window.clearTimeout(debounceTimer);
    input.setCustomValidity('');
    clearButton.hidden = false;
    if (config.navigate) box.requestSubmit();
    else handleSearch(input, block, config);
  });
  block.addEventListener('search:reset', reset);
  input.addEventListener('input', () => {
    input.setCustomValidity('');
    clearButton.hidden = !input.value;
    window.clearTimeout(debounceTimer);
    if (!config.navigate) {
      block.querySelector('.search-pagination').hidden = true;
      debounceTimer = window.setTimeout(() => handleSearch(input, block, config), 200);
    }
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    window.clearTimeout(debounceTimer);
    if (block.classList.contains('overlay')) requestClose(block);
    else clearSearch(block, true);
  });
  clearButton.addEventListener('click', () => {
    reset();
    input.focus();
  });

  if (!config.navigate) {
    window.addEventListener('popstate', () => {
      window.clearTimeout(debounceTimer);
      autocomplete?.close();
      input.value = new URL(window.location.href).searchParams.get('q') || '';
      input.setCustomValidity('');
      clearButton.hidden = !input.value;
      restoreOptions(block);
      handleSearch(input, block, config, requestedPage());
    });
  }

  return box;
}

export default async function decorate(block) {
  const placeholders = await fetchPlaceholders();
  const sourceLink = block.querySelector('a[href]');
  const source = sourceLink?.href || '/query-index.json';
  const results = searchResultsContainer(block);
  const config = {
    source,
    placeholders,
    navigate: block.dataset.searchMode === 'navigate',
    northCarolina: document.body.classList.contains('north-carolina'),
  };
  config.pageView = config.northCarolina && !config.navigate;
  block.setAttribute('role', 'search');
  block.setAttribute('aria-label', 'Site search');
  const box = searchBox(block, config);
  const output = [searchStatus(), results, searchPagination(block, results.id)];
  if (config.pageView) {
    block.classList.add('search-page');
    block.closest('main')?.classList.add('search-page-main');
    const heading = document.createElement('h2');
    heading.className = 'search-heading';
    heading.textContent = 'Let’s try and find what you’re looking for';
    results.dataset.h = 'h3';
    const layout = document.createElement('div');
    layout.className = 'search-layout';
    const resultColumn = document.createElement('div');
    resultColumn.className = 'search-output';
    resultColumn.append(...output);
    layout.append(searchFilters(block, config), resultColumn);
    block.replaceChildren(heading, box, layout);
    restoreOptions(block);
  } else block.replaceChildren(box, ...output);

  const query = new URL(window.location.href).searchParams.get('q');
  if (query && !config.navigate) {
    const input = block.querySelector('.search-input');
    input.value = query;
    block.querySelector('.search-clear').hidden = false;
    handleSearch(input, block, config, requestedPage());
  }

  decorateIcons(block);
}

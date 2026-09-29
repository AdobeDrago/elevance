/*
 * prior-auth-lookup — interactive Prior Authorization lookup tool.
 *
 * Reconstructs the source Angular widget as a config-driven EDS block:
 *   - Market select
 *   - Line of Business select (dependent on Market)
 *   - drug / CPT / HCPCS typeahead input
 *   - Search button with client-side validation
 *   - dynamically rendered results
 *
 * Authoring content model (key | value rows):
 *   | Markets              | North Carolina   |
 *   | Line of Business     | Medicaid, CFSP   |  (LOB options for that market;
 *                                                  one row per market)
 *   | Drug name, CPT or    | (typeahead input |  Add message for
 *      HCPCS code              for searching)      placeholder text
 *   | Search               |                  |  Search button text
 * All rows are optional — the block renders a usable shell without them and
 * fetches/searches the dataset client-side when a Data Source is configured.
 *
 * Structural/behavioral only — brand styling from body.north-carolina tokens.
 */

import {
  fetchSuggestionData,
  fetchSearchData,
} from '../../scripts/lookup-service.js';

// blocks/prior-auth-lookup/prior-auth-lookup.js
//
// Renders the source Angular precert widget's markup (ant-*, ps*, uxd-*
// classes) as a static shell, then wires it up here:
//   - Market / Line of Business: native radio groups behind a custom
//     button+popup trigger (keeps keyboard/AT support, styled via CSS)
//   - Drug name / CPT / HCPCS: a readonly display field that opens an
//     assistive panel (search-panel) with a live input + typeahead suggestions
//   - Search: fetches and renders the precertification result card
let uidCounter = 0;

function renderForm({
  marketText,
  marketValueText,
  lobText,
  lobListItems,
  nameText,
  instructionsText,
  searchText,
}) {
  uidCounter += 1;
  const uid = uidCounter;
  const marketGroup = `prior-auth-lookup-market-${uid}`;
  const lobGroup = `prior-auth-lookup-lob-${uid}`;
  const nameId = `prior-auth-lookup-name-${uid}`;
  const codeId = `prior-auth-lookup-code-${uid}`;

  const marketOption = marketValueText
    ? `<input class="ps-option" type="radio" name="${marketGroup}" id="${marketGroup}-0" value="${marketValueText}" checked>
       <label class="ps-label" for="${marketGroup}-0">${marketValueText}</label>`
    : '';

  const lobOptions = lobListItems
    .map((item, index) => `
      <input class="ps-option" type="radio" name="${lobGroup}" id="${lobGroup}-${index}" value="${item}" ${index === 0 ? 'checked' : ''}>
      <label class="ps-label" for="${lobGroup}-${index}">${item}</label>
    `)
    .join('');

  const wrapper = document.createElement('div');
  wrapper.className = 'prior-auth-lookup-wrapper';
  wrapper.innerHTML = `
    <section class="content_column angular-form-content">
      <div data-tcp-pluto-cmp="">
        <label id="${marketGroup}-label">${marketText}</label>
        <div class="form-item ant-lg-select uxd-btn-ddl" data-uxd-dropdown-cmp="">
          <fieldset class="ps-select">
            <legend>${marketText}</legend>
            <button
              class="btn-primary ps-button btn"
              type="button"
              aria-haspopup="listbox"
              aria-expanded="false"
              aria-labelledby="${marketGroup}-label"
            >
              <span class="ps-active-option">${marketValueText}</span>
              <span class="ps-arrow" aria-hidden="true"></span>
            </button>
            <div class="ps-dropdown" role="listbox" hidden>
              <span class="sr-only">Use up and down arrow keys to cycle through options. Press enter to select</span>
              ${marketOption}
            </div>
          </fieldset>
        </div>

        <label id="${lobGroup}-label">${lobText}</label>
        <div class="ant-lg-select form-item uxd-btn-ddl" data-uxd-dropdown-cmp="">
          <fieldset class="ps-select">
            <legend>${lobText}</legend>
            <button
              class="btn-primary ps-button btn"
              type="button"
              aria-haspopup="listbox"
              aria-expanded="false"
              aria-labelledby="${lobGroup}-label"
            >
              <span class="ps-active-option">${lobListItems[0] || ''}</span>
              <span class="ps-arrow" aria-hidden="true"></span>
            </button>
            <div class="ps-dropdown" role="listbox" hidden>
              <span class="sr-only">Use up and down arrow keys to cycle through options. Press enter to select</span>
              ${lobOptions}
            </div>
          </fieldset>
        </div>

        <label for="${nameId}">${nameText}</label>
        <div class="form-item">
          <input
            id="${nameId}"
            class="ant-text-input ant-input-long"
            type="text"
            readonly
            placeholder="${instructionsText}"
          >
        </div>

        <div class="search-panel" hidden>
          <div class="form-item">
            <input id="${codeId}" name="codeDescription" type="text" autocomplete="off" placeholder="${instructionsText}">
          </div>
          <div class="search-loading" aria-live="polite">Please enter 3 or more characters.</div>
          <div class="search-suggestions"></div>
        </div>

        <button class="primary-btn" type="button" disabled>${searchText || 'Search'}</button>
      </div>
    </section>
  `;

  return wrapper;
}

// Wires a Market/Line-of-Business control: a button that toggles a native
// radio group in a popup, keeping the group's own keyboard behavior
// (arrows/space) for free while the button shows the current selection.
function wireDropdown(root) {
  const button = root.querySelector('.ps-button');
  const dropdown = root.querySelector('.ps-dropdown');
  const activeText = root.querySelector('.ps-active-option');
  const options = [...dropdown.querySelectorAll('.ps-option')];

  function close() {
    dropdown.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  function open() {
    if (!options.length) return;
    dropdown.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  }

  button.addEventListener('click', () => {
    if (dropdown.hidden) open();
    else close();
  });

  button.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
      (options.find((option) => option.checked) || options[0])?.focus();
    }
  });

  function commit() {
    close();
    button.focus();
  }

  // Picking an option must close the popup even when it's already checked
  // (a radio fires no `change` then — e.g. the lone, pre-checked Market).
  // `change` only syncs the label so arrow keys can still cycle options.
  options.forEach((option) => {
    option.addEventListener('change', () => {
      activeText.textContent = option.value;
    });
    option.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        option.checked = true;
        activeText.textContent = option.value;
        commit();
      } else if (event.key === 'Escape') {
        commit();
      }
    });
  });

  dropdown.querySelectorAll('.ps-label').forEach((label) => {
    label.addEventListener('click', commit);
  });

  document.addEventListener('click', (event) => {
    if (!root.contains(event.target)) close();
  });

  return {
    get value() {
      return options.find((option) => option.checked)?.value || '';
    },
  };
}

// Wires the drug-name field: focusing/clicking the readonly display input
// opens an assistive panel with a live input; typing 3+ characters fetches
// and lists suggestions, and choosing one fills both inputs and closes it.
function wireDrugField(scopeEl, { onInput }) {
  const displayInput = scopeEl.querySelector('.ant-text-input.ant-input-long');
  const panel = scopeEl.querySelector('.search-panel');
  const codeInput = panel.querySelector('input[type="text"]');
  const statusEl = panel.querySelector('.search-loading');
  const suggestionsEl = panel.querySelector('.search-suggestions');

  function openPanel() {
    codeInput.value = displayInput.value;
    panel.hidden = false;
    codeInput.focus();
  }

  function closePanel() {
    panel.hidden = true;
  }

  function selectSuggestion(item) {
    const value = `${item.procedureCode} - ${item.description}`;
    codeInput.value = value;
    displayInput.value = value;
    suggestionsEl.innerHTML = '';
    closePanel();
    onInput(value);
  }

  async function updateSuggestions(query) {
    if (query.length < 3) {
      statusEl.hidden = false;
      statusEl.textContent = 'Please enter 3 or more characters.';
      suggestionsEl.innerHTML = '';
      return;
    }

    statusEl.hidden = false;
    statusEl.textContent = 'Searching.....';
    suggestionsEl.innerHTML = '';

    try {
      const data = await fetchSuggestionData();
      if (!Array.isArray(data) || data.length === 0) {
        statusEl.textContent = 'No results found.';
        return;
      }

      statusEl.hidden = true;
      suggestionsEl.innerHTML = data
        .map((item, index) => `
          <button type="button" class="search-suggestion" data-index="${index}">
            <div class="suggestion-code">${item.procedureCode}</div>
            <div class="suggestion-description">${item.description}</div>
          </button>
        `)
        .join('');
      [...suggestionsEl.querySelectorAll('.search-suggestion')].forEach((suggestionButton, index) => {
        suggestionButton.addEventListener('click', () => selectSuggestion(data[index]));
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Provider lookup suggestion fetch failed:', err);
      statusEl.hidden = false;
      statusEl.textContent = 'Something went wrong. Please try again.';
    }
  }

  displayInput.addEventListener('focus', openPanel);
  displayInput.addEventListener('click', openPanel);

  codeInput.addEventListener('input', () => {
    displayInput.value = codeInput.value;
    onInput(codeInput.value);
    updateSuggestions(codeInput.value.trim());
  });

  document.addEventListener('click', (event) => {
    if (!scopeEl.contains(event.target)) closePanel();
  });

  return {
    get value() {
      return codeInput.value;
    },
  };
}

function renderResultCard(item, selectedLobText) {
  const procedureCode = item?.procedureCode ?? 'Not found';
  const description = item?.procedureCodeDescription ?? 'None';
  const policy = item?.precertCodeGuideList?.[0]?.policy ?? 'None';
  const cmsGuideLine = item?.cmsGuideLine ?? 'None';
  const stateGuideLine = item?.stateGuideLine ?? 'None';
  const thirdPartyGuideLine = item?.precertCodeGuideList?.[0]?.interQualSubset ?? 'None';

  return `
    <article class="result-card">
      <h3>NO - Precertification is not required</h3>
      <div class="row">
        <div><label class="result-label">Line of Business:</label></div>
        <div>${selectedLobText}</div>
      </div>
      <div class="row">
        <div><label class="result-label">CPT/HCPCS Code:</label></div>
        <div>${procedureCode}</div>
      </div>
      <div class="row">
        <div><label class="result-label">Description:</label></div>
        <div>${description}</div>
      </div>
      <div class="row">
        <div><label class="result-label">Policy/Clinical Guideline:</label></div>
        <div>${policy}</div>
      </div>
      <div class="row">
        <div><label class="result-label">CMS Guideline:</label></div>
        <div>${cmsGuideLine}</div>
      </div>
      <div class="row">
        <div><label class="result-label">State Guideline:</label></div>
        <div>${stateGuideLine}</div>
      </div>
      <div class="row">
        <div><label class="result-label">Third Party Guidelines:</label></div>
        <div>${thirdPartyGuideLine}</div>
      </div>
      <div class="row">
        <div><label class="result-label">Carelon RX Criteria</label></div>
        <div>
          <p class="carelonrx">
            <a class="external-link" target="_blank" rel="noopener" href="https://www.anthem.com/ms/pharmacyinformation/clinicalcriteria.html">
              Clinical Criteria (anthem.com)
            </a>
          </p>
        </div>
      </div>
    </article>
  `;
}

export default async function decorate(block) {
  const rows = [...block.children];
  const [marketRow, lobRow, nameRow, searchRow] = rows;

  const cellText = (row, index) => row?.children[index]?.querySelector('p')?.textContent?.trim() || '';

  const marketText = cellText(marketRow, 0);
  const marketValueText = cellText(marketRow, 1);
  const lobText = cellText(lobRow, 0);
  const lobListItems = [...(lobRow?.children[1]?.querySelectorAll('li') ?? [])]
    .map((li) => li.textContent?.trim() || '');
  const nameText = cellText(nameRow, 0);
  const instructionsText = cellText(nameRow, 1);
  const searchText = cellText(searchRow, 0);

  block.innerHTML = '';
  const formWrapper = renderForm({
    marketText,
    marketValueText,
    lobText,
    lobListItems,
    nameText,
    instructionsText,
    searchText,
  });
  block.append(formWrapper);

  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'search-results';
  block.append(resultsContainer);

  const [marketRoot, lobRoot] = formWrapper.querySelectorAll('.ant-lg-select');
  wireDropdown(marketRoot);
  const lobDropdown = wireDropdown(lobRoot);

  const scopeEl = formWrapper.querySelector('[data-tcp-pluto-cmp]');
  const searchButton = formWrapper.querySelector('.primary-btn');

  wireDrugField(scopeEl, {
    onInput: (value) => {
      searchButton.disabled = value.trim().length < 3;
    },
  });

  searchButton.addEventListener('click', async () => {
    resultsContainer.innerHTML = 'Loading…';

    try {
      const data = await fetchSearchData();
      if (!Array.isArray(data) || data.length === 0) {
        resultsContainer.textContent = 'No results found.';
        return;
      }

      const selectedLobText = lobDropdown.value || lobListItems[0] || '';
      resultsContainer.innerHTML = data
        .map((item) => renderResultCard(item, selectedLobText))
        .join('');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Provider lookup search failed:', err);
      resultsContainer.textContent = 'Something went wrong. Please try again.';
    }
  });
}

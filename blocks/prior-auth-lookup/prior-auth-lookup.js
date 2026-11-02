/*
 * prior-auth-lookup — interactive Prior Authorization lookup tool.
 *
 * Rebuilds the source Angular precertification widget
 * (https://provider.healthybluenc.com/north-carolina-provider/prior-authorization-lookup):
 *   - Market select (pre-selected; a market with a single line of business selects it too)
 *   - Line of Business select — the code field stays disabled until one is chosen
 *   - Drug name / CPT / HCPCS field: opens a search panel; 3+ characters fetch matching
 *     codes (1.5s after the last keystroke), picking one enables Search
 *   - Search: fetches the precertification result for the code and renders the
 *     source result card, then clears the field
 *
 * Authoring content model (one row per field, label | value):
 *   | Market                                         | North Carolina            |
 *   | Line of Business                               | - Medicaid/SCHIP/... (list) |
 *   | Drug name, CPT/HCPCS Code or Code Description  | (placeholder text)        |
 *   | Search                                         |                           |
 */

import { fetchSuggestionData, fetchSearchData } from '../../scripts/lookup-service.js';

// Source service codes for the authored display names (gbdPro/Common/getMarketLOBs).
// An authored "Name (CODE)" value overrides the lookup.
const MARKET_CODES = { 'north carolina': 'NC' };
const LOB_CODES = {
  'medicaid/schip/family care': 'CAID',
  'cfsp – healthy blue care together': 'CFSP',
  'cfsp - healthy blue care together': 'CFSP',
};

// Source widget copy (page JSON "content" block).
const CONTENT = {
  marketDefault: 'Select Market',
  lobDefault: 'Select Line of Business',
  placeholder: 'Type a drug name, CPT/HCPCS code or code description',
  listboxHint: 'Use up and down arrow keys to cycle through options. Press enter to select',
  minLength: (count) => `Please enter ${count} or more characters.`,
  searching: 'Searching.....',
  status: {
    N: 'NO - Precertification is not required',
    Y: 'YES - Precertification is required',
    X: 'This code is not covered under this insurance',
    R: 'This service is not reimbursable separately',
  },
  serviceErrors: {
    403: 'The server is currently unavailable',
    404: 'The Request of not found exception',
    500: 'Internal server error',
    503: 'The server is currently unavailable',
  },
  carelonLabel: 'Carelon RX Criteria',
  carelonLinkText: 'Clinical Criteria (anthem.com)',
  carelonLink: 'https://www.anthem.com/ms/pharmacyinformation/clinicalcriteria.html',
};

const MIN_CHARS = 3;
const SUGGEST_DELAY = 1500;

// Result rows in source order: [label, value getter]; a row renders only when its
// value is present (source *ngIf on the response field).
const RESULT_ROWS = [
  ['Line of Business:', (r) => r.lineOfBusinessDescription],
  ['CPT/HCPCS Code:', (r) => r.procedureCode],
  ['Description:', (r) => r.procedureCodeDescription],
  ['Additional Info:', (r) => r.lookupContent],
  ['Clinical Criteria Exception:', (r) => r.clinicalCriteriaException],
  ['Special Processing Info:', (r) => r.specialProcessingInfo],
  ['Clinical Edits:', (r) => r.clinicalEditInfo],
  ['High Dollar DME:', (r) => r.highDollarDme],
  ['Dual Responsibility Party:', (r) => r.dualIndicator],
  ['Vendor Responsibility Party:', (r) => r.vendorName],
  ['Vendor Information:', (r) => r.vendorInfo],
  ['Exceptions:', (r) => r.vendorException],
  ['Drug Names', (r) => (r.drugNames?.[0] ? r.drugNames.join(',') : '')],
  ['', (r) => (r.ffsDrugNames?.[0] ? r.ffsDrugNames.join(',') : '')],
  ['Policy/Clinical Guideline:', (r) => r.precertCodeGuideList?.[0] && r.precertCodeGuideList[0].policy],
  ['CMS Guideline:', (r) => r.cmsGuideLine],
  ['State Guideline:', (r) => r.stateGuideLine],
  ['Third Party Guidelines:', (r) => r.precertCodeGuideList?.[0] && r.precertCodeGuideList[0].interQualSubset],
];

let uid = 0;

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'text') node.textContent = value;
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value != null) node.setAttribute(key, value);
  });
  node.append(...children);
  return node;
};

const cellText = (row, index) => row?.children[index]?.textContent.trim() || '';

function toOption(name, codes) {
  const match = name.match(/^(.*?)\s*\(([A-Z0-9]+)\)\s*$/);
  if (match) return { label: match[1], value: match[2] };
  return { label: name, value: codes[name.toLowerCase()] || name };
}

/**
 * Custom select (source uxd dropdown): a button showing the active option over a
 * native radio group, so arrow keys cycle the options and Enter/Space/click picks one.
 */
function buildSelect({
  id, label, defaultText, options, selected, onChange,
}) {
  const labelId = `${id}-label`;
  const active = el('span', { class: 'ps-active-option', text: selected?.label || defaultText });
  const button = el('button', {
    type: 'button',
    class: 'ps-button',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-labelledby': `${labelId} ${id}-button`,
    id: `${id}-button`,
  }, [active, el('span', { class: 'ps-arrow', 'aria-hidden': 'true' })]);

  const dropdown = el('div', { class: 'ps-dropdown', role: 'radiogroup', 'aria-labelledby': labelId }, [
    el('span', { class: 'sr-only', text: CONTENT.listboxHint }),
  ]);
  dropdown.hidden = true;

  const labels = [];
  const radios = options.map((option, index) => {
    const radio = el('input', {
      class: 'ps-option',
      type: 'radio',
      name: id,
      id: `${id}-${index}`,
      value: option.value,
      checked: selected?.value === option.value,
    });
    const optionLabel = el('label', { class: 'ps-label', for: `${id}-${index}`, text: option.label });
    labels.push(optionLabel);
    dropdown.append(radio, optionLabel);
    return radio;
  });

  const root = el('div', { class: 'form-item ps-select' }, [button, dropdown]);
  let value = selected?.value || '';

  const close = () => {
    dropdown.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    if (!radios.length) return;
    dropdown.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  };
  const commit = (radio) => {
    radio.checked = true;
    const option = options[radios.indexOf(radio)];
    active.textContent = option.label;
    close();
    button.focus();
    if (option.value !== value) {
      value = option.value;
      onChange?.(option);
    }
  };

  button.addEventListener('click', () => (dropdown.hidden ? open() : close()));
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
      (radios.find((radio) => radio.checked) || radios[0])?.focus();
    }
  });
  radios.forEach((radio, index) => {
    // a click on the label checks the radio (no change event when already checked)
    labels[index].addEventListener('click', (event) => {
      event.preventDefault();
      commit(radio);
    });
    radio.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        commit(radio);
      } else if (event.key === 'Escape') {
        close();
        button.focus();
      }
    });
  });
  document.addEventListener('click', (event) => {
    if (!root.contains(event.target)) close();
  });

  return {
    label: el('label', { id: labelId, for: `${id}-button`, text: label }),
    root,
    get value() { return value; },
  };
}

function renderResult(result) {
  const row = (labelText, valueNode) => el('div', { class: 'row' }, [
    el('div', {}, [el('label', { text: labelText })]),
    el('div', {}, [valueNode]),
  ]);

  const rows = RESULT_ROWS
    .map(([labelText, get]) => [labelText, get(result)])
    .filter(([, value]) => value)
    .map(([labelText, value]) => row(labelText, document.createTextNode(value)));

  const carelon = el('p', { class: 'carelonrx' }, [
    el('a', {
      href: CONTENT.carelonLink, target: '_blank', rel: 'noopener', text: CONTENT.carelonLinkText,
    }),
  ]);

  return el('section', { class: 'prior-auth-lookup-result', tabindex: '0' }, [
    el('article', {}, [
      el('h3', { text: CONTENT.status[result.authRequiredCode] || '' }),
      ...rows,
      row(CONTENT.carelonLabel, carelon),
    ]),
  ]);
}

function renderServiceError(status) {
  const message = CONTENT.serviceErrors[status] || CONTENT.serviceErrors[500];
  return el('section', { class: 'prior-auth-lookup-error' }, [
    el('div', { class: 'prior-auth-lookup-alert', role: 'alert', text: message }),
  ]);
}

export default function decorate(block) {
  const [marketRow, lobRow, codeRow, searchRow] = [...block.children];
  uid += 1;
  const id = `prior-auth-lookup-${uid}`;

  const markets = [cellText(marketRow, 1)].filter(Boolean)
    .map((name) => toOption(name, MARKET_CODES));
  const lobs = [...(lobRow?.children[1]?.querySelectorAll('li') || [])]
    .map((li) => toOption(li.textContent.trim(), LOB_CODES));
  const codeLabel = cellText(codeRow, 0);
  const placeholder = cellText(codeRow, 1) || CONTENT.placeholder;

  // --- drug / code field and its search panel
  const display = el('input', {
    class: 'ps-display',
    type: 'text',
    id: `${id}-code`,
    readonly: true,
    placeholder,
    'aria-haspopup': 'dialog',
  });
  const query = el('input', {
    type: 'text', class: 'ps-query', autocomplete: 'off', placeholder, 'aria-label': 'code description',
  });
  const message = el('div', { class: 'search-message', 'aria-live': 'polite' });
  const suggestions = el('div', { class: 'search-result', tabindex: '-1' });
  const panel = el('div', { class: 'search-panel' }, [el('div', { class: 'form-item' }, [query]), message, suggestions]);
  panel.hidden = true;

  const searchButton = el('button', { type: 'button', class: 'search-button', text: cellText(searchRow, 0) || 'Search' });
  const output = el('div', { class: 'search-output' });

  let selectedCode = '';
  let suggestTimer;
  let requestId = 0;

  const setSearchEnabled = (enabled) => { searchButton.disabled = !enabled; };
  const setCodeEnabled = (enabled) => {
    display.classList.toggle('disabled', !enabled);
    display.setAttribute('aria-disabled', String(!enabled));
  };
  const showMessage = (text, type) => {
    message.textContent = text;
    message.className = `search-message ${type || ''}`.trim();
    message.hidden = !text;
  };
  const resetCode = () => {
    clearTimeout(suggestTimer);
    requestId += 1;
    selectedCode = '';
    display.value = '';
    query.value = '';
    panel.hidden = true;
    suggestions.replaceChildren();
    output.replaceChildren();
    setSearchEnabled(false);
  };

  // --- selects
  const market = buildSelect({
    id: `${id}-market`,
    label: cellText(marketRow, 0),
    defaultText: CONTENT.marketDefault,
    options: markets,
    selected: markets[0],
  });
  const lob = buildSelect({
    id: `${id}-lob`,
    label: cellText(lobRow, 0),
    defaultText: CONTENT.lobDefault,
    options: lobs,
    selected: lobs.length === 1 ? lobs[0] : null,
    onChange: () => {
      resetCode();
      setCodeEnabled(true);
    },
  });

  const openPanel = () => {
    if (display.classList.contains('disabled')) return;
    panel.hidden = false;
    suggestions.replaceChildren();
    showMessage(CONTENT.minLength(MIN_CHARS), 'error');
    setSearchEnabled(false);
    query.focus();
  };

  const selectSuggestion = ({ procedureCode, description }) => {
    selectedCode = procedureCode;
    display.value = `${procedureCode} - ${description}`;
    panel.hidden = true;
    setSearchEnabled(true);
    searchButton.focus();
  };

  const renderSuggestions = (items) => {
    suggestions.replaceChildren(...items.map((item) => {
      const option = el('div', { class: 'search-result-indiv', tabindex: '0', role: 'button' }, [
        // source "CODE&nbsp;-" column: the hyphen wraps under the code when the column shrinks
        el('div', { text: `${item.procedureCode}\u00a0\u200b-` }),
        el('div', { text: item.description }),
      ]);
      option.addEventListener('click', () => selectSuggestion(item));
      option.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') selectSuggestion(item);
      });
      return option;
    }));
  };

  const fetchSuggestions = async (term) => {
    requestId += 1;
    const current = requestId;
    try {
      const data = await fetchSuggestionData({ state: market.value, lobCode: lob.value, term });
      if (current !== requestId) return;
      if (Array.isArray(data) && data.length) renderSuggestions(data);
    } catch (err) {
      if (current !== requestId) return;
      // eslint-disable-next-line no-console
      console.error('Prior auth lookup suggestions failed:', err);
      showMessage(CONTENT.serviceErrors[500], 'error');
    }
  };

  query.addEventListener('input', () => {
    const term = query.value.trim();
    clearTimeout(suggestTimer);
    requestId += 1;
    suggestions.replaceChildren();
    setSearchEnabled(false);
    if (term.length < MIN_CHARS) {
      showMessage(CONTENT.minLength(MIN_CHARS - term.length), 'error');
      return;
    }
    // source keeps "Searching....." above the list once codes arrive
    showMessage(CONTENT.searching, 'loading');
    suggestTimer = setTimeout(() => fetchSuggestions(term), SUGGEST_DELAY);
  });

  display.addEventListener('click', openPanel);
  display.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPanel();
    }
  });

  searchButton.addEventListener('click', async () => {
    if (!selectedCode) return;
    // source sends the first 5 characters of the field value (the code)
    const procCode = display.value.substring(0, 5);
    output.replaceChildren();
    try {
      const data = await fetchSearchData({ state: market.value, lobCode: lob.value, procCode });
      if (!Array.isArray(data) || !data.length) {
        output.replaceChildren(renderServiceError(404));
        return;
      }
      // source: with several matches, show the last one scored below zero (else the first)
      let index = 0;
      data.forEach((item, i) => { if (Number(item.score) < 0) index = i; });
      output.replaceChildren(renderResult(data[index]));
      selectedCode = '';
      display.value = '';
      setSearchEnabled(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Prior auth lookup search failed:', err);
      output.replaceChildren(renderServiceError(500));
    }
  });

  setCodeEnabled(Boolean(lob.value));
  setSearchEnabled(false);

  block.replaceChildren(el('div', { class: 'prior-auth-lookup-form' }, [
    market.label,
    market.root,
    lob.label,
    lob.root,
    el('label', { for: `${id}-code`, text: codeLabel }),
    el('div', { class: 'form-item' }, [display]),
    panel,
    searchButton,
    output,
  ]));
}

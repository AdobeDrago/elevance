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
 *   | Data Source | /path/to/pa-codes.json |
 *     (published JSON: [{code, description, market, lob, paRequired}])
 *   | Markets     | North Carolina          |
 *   | <Market>    | Medicaid, CFSP          |   (LOB options for that market; one row per market)
 * All rows are optional — the block renders a usable shell without them and
 * fetches/searches the dataset client-side when a Data Source is configured.
 *
 * Structural/behavioral only — brand styling from body.north-carolina tokens.
 */

function readConfig(block) {
  const cfg = { dataSource: '', markets: [], lobByMarket: {} };
  const rows = [...block.children];
  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const key = (cells[0].textContent || '').trim();
    const valText = (cells[1].textContent || '').trim();
    const values = valText.split(',').map((v) => v.trim()).filter(Boolean);
    const keyLc = key.toLowerCase();
    if (keyLc === 'data source' || keyLc === 'datasource') {
      const link = cells[1].querySelector('a');
      cfg.dataSource = link ? link.getAttribute('href') : valText;
    } else if (keyLc === 'markets' || keyLc === 'market') {
      cfg.markets = values;
    } else {
      // treat the key as a market name → its LOB options
      cfg.lobByMarket[key] = values;
    }
  });
  if (!cfg.markets.length) cfg.markets = Object.keys(cfg.lobByMarket);
  return cfg;
}

function option(value, label) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label ?? value;
  return o;
}

export default function decorate(block) {
  const cfg = readConfig(block);
  block.textContent = '';

  const form = document.createElement('div');
  form.className = 'prior-auth-lookup-form';

  // Market select
  const marketField = document.createElement('label');
  marketField.className = 'prior-auth-lookup-field';
  marketField.textContent = 'Market';
  const marketSel = document.createElement('select');
  marketSel.className = 'prior-auth-lookup-market';
  marketSel.append(option('', 'Select a market'));
  cfg.markets.forEach((m) => marketSel.append(option(m)));
  marketField.append(marketSel);

  // Line of Business select (dependent)
  const lobField = document.createElement('label');
  lobField.className = 'prior-auth-lookup-field';
  lobField.textContent = 'Line of Business';
  const lobSel = document.createElement('select');
  lobSel.className = 'prior-auth-lookup-lob';
  lobSel.disabled = true;
  lobSel.append(option('', 'Select a line of business'));
  lobField.append(lobSel);

  // Code / drug typeahead
  const codeField = document.createElement('label');
  codeField.className = 'prior-auth-lookup-field';
  codeField.textContent = 'Drug name, CPT or HCPCS code';
  const codeInput = document.createElement('input');
  codeInput.type = 'text';
  codeInput.className = 'prior-auth-lookup-code';
  codeInput.setAttribute('list', 'prior-auth-lookup-suggestions');
  codeInput.autocomplete = 'off';
  const datalist = document.createElement('datalist');
  datalist.id = 'prior-auth-lookup-suggestions';
  codeField.append(codeInput, datalist);

  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'prior-auth-lookup-search';
  searchBtn.textContent = 'Search';
  searchBtn.disabled = true;

  const results = document.createElement('div');
  results.className = 'prior-auth-lookup-results';
  results.setAttribute('aria-live', 'polite');

  form.append(marketField, lobField, codeField, searchBtn);
  block.append(form, results);

  function validate() {
    searchBtn.disabled = !(marketSel.value && lobSel.value && codeInput.value.trim());
  }

  // Dependent LOB population
  marketSel.addEventListener('change', () => {
    const lobs = cfg.lobByMarket[marketSel.value] || [];
    lobSel.textContent = '';
    lobSel.append(option('', 'Select a line of business'));
    lobs.forEach((l) => lobSel.append(option(l)));
    lobSel.disabled = lobs.length === 0;
    validate();
  });
  lobSel.addEventListener('change', validate);
  codeInput.addEventListener('input', validate);

  // Load dataset (optional) for typeahead + results
  let dataset = [];
  if (cfg.dataSource) {
    fetch(cfg.dataSource)
      .then((r) => (r.ok ? r.json() : []))
      .then((json) => {
        dataset = Array.isArray(json) ? json : (json.data || []);
        dataset.forEach((d) => {
          if (d.code) datalist.append(option(d.code, `${d.code} — ${d.description || ''}`));
        });
      })
      .catch(() => { /* leave dataset empty; block still renders */ });
  }

  searchBtn.addEventListener('click', () => {
    const q = codeInput.value.trim().toLowerCase();
    const matches = dataset.filter((d) => {
      const marketOk = !d.market || d.market === marketSel.value;
      const lobOk = !d.lob || d.lob === lobSel.value;
      const codeOk = (d.code || '').toLowerCase().includes(q)
        || (d.description || '').toLowerCase().includes(q);
      return marketOk && lobOk && codeOk;
    });

    results.textContent = '';
    if (!cfg.dataSource) {
      results.textContent = 'Lookup data source is not configured.';
      return;
    }
    if (!matches.length) {
      results.textContent = 'No results found for your search.';
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'prior-auth-lookup-result-list';
    matches.forEach((d) => {
      const li = document.createElement('li');
      const pa = d.paRequired ? 'Prior authorization required' : 'No prior authorization required';
      li.innerHTML = `<strong>${d.code || ''}</strong> ${d.description || ''} — ${pa}`;
      ul.append(li);
    });
    results.append(ul);
  });
}

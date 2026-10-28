/*
 * lookup-service — shared mock-data fetch helpers for the provider-lookup
 * and forms-accordion blocks. Both blocks fetch/parse a local JSON fixture
 * the same way (fetch → check res.ok → parse JSON → throw on failure); this
 * centralizes that logic plus the fixtures themselves so the two blocks stay
 * in sync instead of duplicating fetch/error-handling code.
 */

const MOCK_SUGGESTION_DATA_URL = '/scripts/lookup-data/mock-suggestion-data.json';
const MOCK_SEARCH_DATA_URL = '/scripts/lookup-data/mock-search-data.json';
const MOCK_FORMS_DATA_URL = '/scripts/lookup-data/mock-forms-response.json';
const MOCK_NEWS_ARCHIVE_DATA_URL = '/scripts/lookup-data/mock-news-archives.json';

const FORMS_API_URL = 'https://provider.healthybluenc.com/sites/Satellite?d=Universal&pagename=getdocuments&brand=HBNC&state=&formslibrary=gpp_formslib';
// Pluto precertification service (source Angular widget): `cpt` lists codes matching
// `%term%`, `submit` returns the precertification result for one code.
const PLUTO_API_URL = 'https://provider.healthybluenc.com/sites/Satellite?d=Universal&pagename=gbdPro/PlutoServiceProxy';
const plutoUrl = (service, { state, lobCode, procCode }) => `${PLUTO_API_URL}&service=${service}`
  + `&state=${encodeURIComponent(state)}&lobCode=${encodeURIComponent(lobCode)}`
  + `&procCode=${encodeURIComponent(procCode)}`;
const NEWS_ARCHIVE_URL = 'https://provider.healthybluenc.com/sites/Satellite?d=Universal&pagename=getdocuments&brand=HBNC&formslibrary=gpp_newsarchives';

// Update once site is live and the mock data URLs are replaced with actual endpoints.
function useMock() {
  // const { hostname, search } = window.location;
  // const params = new URLSearchParams(search);
  // if (params.get('mock') === '1') return true;
  // if (params.get('mock') === '0') return false;
  // return hostname.endsWith('.hlx.page')
  //   || hostname.endsWith('.aem.page')
  //   || hostname === 'localhost';
  return true; // always use mock for now
}

async function fetchMockJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mock fixture failed to load: ${res.status}`);
  return res.json();
}

// prior-auth-lookup: codes whose code or description contains `term`
// (source service: procCode=%term%)
export async function fetchSuggestionData({ state = 'NC', lobCode = '', term = '' } = {}) {
  if (!useMock()) {
    const res = await fetch(plutoUrl('cpt', { state, lobCode, procCode: `%${term}%` }));
    if (!res.ok) throw new Error(`Suggestion data failed to load: ${res.status}`);
    return res.json();
  }
  const needle = term.trim().toLowerCase();
  const data = await fetchMockJson(MOCK_SUGGESTION_DATA_URL);
  return data.filter(({ procedureCode, description }) => (
    `${procedureCode} ${description}`.toLowerCase().includes(needle)
  ));
}

// prior-auth-lookup: precertification result(s) for one code and line of business
export async function fetchSearchData({ state = 'NC', lobCode = '', procCode = '' } = {}) {
  if (!useMock()) {
    const res = await fetch(plutoUrl('submit', { state, lobCode, procCode }));
    if (!res.ok) throw new Error(`Search data failed to load: ${res.status}`);
    return res.json();
  }
  const data = await fetchMockJson(MOCK_SEARCH_DATA_URL);
  return data.filter((item) => item.procedureCode === procCode
    && item.stateAbbreviation === state
    && item.lineOfBusinessCode === lobCode);
}

// forms-accordion: GPP forms-library document list
export function fetchFormsData() {
  if (!useMock()) {
    return fetch(FORMS_API_URL).then((res) => {
      if (!res.ok) throw new Error(`Forms data failed to load: ${res.status}`);
      return res.json();
    });
  }
  return fetchMockJson(MOCK_FORMS_DATA_URL);
}

// news-archive: GPP news archives document list
export function fetchNewsArchiveData() {
  if (!useMock()) {
    return fetch(NEWS_ARCHIVE_URL).then((res) => {
      if (!res.ok) throw new Error(`News archive data failed to load: ${res.status}`);
      return res.json();
    });
  }
  return fetchMockJson(MOCK_NEWS_ARCHIVE_DATA_URL);
}

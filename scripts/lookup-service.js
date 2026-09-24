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

const FORMS_API_URL = 'https://provider.healthybluenc.com/sites/Satellite?d=Universal&pagename=getdocuments&brand=HBNC&state=&formslibrary=gpp_formslib';
const SUGGESTION_API_URL = 'https://provider.healthybluenc.com/sites/Satellite?d=Universal&pagename=gbdPro/PlutoServiceProxy&service=cpt&state=NC&lobCode=CFSP&procCode=%250002M%25';
const SEARCH_API_URL = 'https://provider.healthybluenc.com/sites/Satellite?d=Universal&pagename=gbdPro/PlutoServiceProxy&service=submit&state=NC&lobCode=CFSP&procCode=0002M';

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

// provider-lookup: typeahead suggestions for the procedure/drug input
export function fetchSuggestionData() {
  if (!useMock()) {
    return fetch(SUGGESTION_API_URL).then((res) => {
      if (!res.ok) throw new Error(`Suggestion data failed to load: ${res.status}`);
      return res.json();
    });
  }
  return fetchMockJson(MOCK_SUGGESTION_DATA_URL);
}

// provider-lookup: precertification search results
export function fetchSearchData() {
  if (!useMock()) {
    return fetch(SEARCH_API_URL).then((res) => {
      if (!res.ok) throw new Error(`Search data failed to load: ${res.status}`);
      return res.json();
    });
  }
  return fetchMockJson(MOCK_SEARCH_DATA_URL);
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

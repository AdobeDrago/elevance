# prior-auth-lookup

Prior Authorization lookup tool — rebuilds the source Angular precertification widget
(https://provider.healthybluenc.com/north-carolina-provider/prior-authorization-lookup),
scoped to `body.north-carolina`.

## Authoring (Document Authoring)

Model: `standalone`

One row per field, label | value:

| Prior Auth Lookup | |
| --- | --- |
| Market | North Carolina |
| Line of Business | • Medicaid/SCHIP/Family Care<br>• CFSP – Healthy Blue Care Together |
| Drug name, CPT/HCPCS Code or Code Description | Type a drug name, CPT/HCPCS code or code description |
| Search | |

- Market / line-of-business names map to the service codes (`North Carolina` → `NC`,
  `Medicaid/SCHIP/Family Care` → `CAID`, `CFSP – Healthy Blue Care Together` → `CFSP`).
  Any other value can carry its code explicitly: `Some Plan (CODE)`.
- The second cell of the drug-name row is the field placeholder.

## Behavior (matches the source widget)

- Market is pre-selected; Line of Business starts unselected (auto-selected when the
  market has a single one) and the code field stays disabled until one is chosen.
- Clicking the code field opens the search panel: fewer than 3 characters shows
  "Please enter N or more characters."; 3+ shows "Searching....." and fetches matching
  codes 1.5s after the last keystroke (`procCode=%term%`).
- Picking a code enables Search; the result card shows the status for
  `authRequiredCode` N / Y / X / R plus the rows present in the response, then the
  field is cleared.

## Data

`scripts/lookup-service.js` → `fetchSuggestionData({ state, lobCode, term })` and
`fetchSearchData({ state, lobCode, procCode })`. The live Pluto service sends no CORS
headers, so the block uses the mock fixtures in `scripts/lookup-data/`
(`mock-suggestion-data.json`, `mock-search-data.json` — real responses for a sample of
codes, filtered client-side like the service) until a same-origin proxy exists.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

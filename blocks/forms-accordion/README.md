# forms-accordion

Custom **forms-accordion** block.

## Authoring (Document Authoring)

Model: `standalone`

Single block table, header row only — no content rows are required. `decorate()`
ignores whatever is in the table and fetches/renders everything client-side from
the GPP forms-library service (mocked locally via the shared
`scripts/lookup-service/lookup-service.js` fetch helper and its
`mock-forms-response.json` fixture), so the only authoring step is inserting the
block table named "Forms Accordion".

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

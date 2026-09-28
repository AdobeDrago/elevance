# Search

The NC search page at `/search.html` combines the site's AEM page index with the
matching preview/live document index and adds accessible title/H1 autocomplete.
See [search setup and operations](../../docs/search-indexing.md).

## Authoring

Add a Search block, optionally containing a link to its page query-index JSON.
The default is `/query-index.json`. The NC header creates the same block with
`data-search-mode="navigate"` and submits a GET form to `/search.html?q=...`.
Results-page suggestions immediately refresh results; header suggestions submit.
Other site themes load only their configured page index.

## Behavior

- Three non-space characters and 200 ms debounce; the query stays in `?q=`.
- AND matching across title, H1, description, body, topic, type and path.
- Exact-title-first ranking; `noindex` records excluded; paths deduplicated.
- PDFs open in a new tab; pages remain in the same tab.
- Live status announces counts, empty results, loading and partial/total errors.
- Autocomplete supports keyboard/pointer selection and fails quietly.

Default card and `minimal` variants remain available. NC styling stays scoped to
`body.north-carolina` and preserves the header's responsive overlay and focus
behavior. Page-level results use the existing NC link-list presentation with
visible descriptions and status.

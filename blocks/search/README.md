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
- Ten results per page by default, with Previous/Next controls and an announced total,
  visible range and page number. Page changes reuse the ranked matches.
- NC results pages offer 10/20/30/40/50 results per page and four content filters.
  Filters and page-size changes reuse matches and return to page one. Their
  `filter` and `size` URL parameters restore with browser Back/Forward.
- `?q=care&page=2` opens the second page; browser Back/Forward restores the
  selected page. New queries and autocomplete selections return to page one.
- PDFs open in a new tab; pages remain in the same tab.
- Live status announces counts, empty results, loading and partial/total errors.
- Autocomplete supports keyboard/pointer selection and fails quietly.

Default card and `minimal` variants remain available. NC styling stays scoped to
`body.north-carolina` and preserves the header's responsive overlay and focus
behavior. NC results pages match the source search layout: gray background,
search heading and labeled field, filter sidebar, bold linked titles, visible
destination URLs, PDF document icons, and separate description snippets.

Filters use recognized `category`, `topic`, or `tags` values first, then fall back
to title/H1/path keywords when categories are unavailable. Body text does not
assign categories. Selecting multiple filters includes any matching category;
uncategorized results remain visible when all filters are cleared.

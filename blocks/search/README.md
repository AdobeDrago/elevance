# search

Site-search block backed by the EDS query index.

## Authoring (Document Authoring)

Add one link to the query-index JSON source. If the block has no link, it uses
`/query-index.json` on the current site.

The block starts searching after three characters. The `q` URL parameter stores
the current query, so a search can be linked or restored after a page refresh.

## Supported variations

- Default: card results with optional images and descriptions.
- `minimal`: compact text results.
- Healthy Blue North Carolina theme: full-width autocomplete treatment matching
  the source-site search area.

## Accessibility

The search input has an accessible label, the clear and close buttons are keyboard
operable, focus returns to the header trigger when the overlay closes, and a polite
live region announces result counts, empty results, and load errors.

# accordion-doc-links

Collapsible panels for prose, document links, and calls to action.

## Authoring (Document Authoring)

Model: `standalone`

Use a block table named **Accordion doc links**. Each content row defines one panel:

| Cell 1: title | Cell 2: content | Cell 3: link style (optional) |
| --- | --- | --- |
| Policies | Links to policy PDFs | `links` |
| Provider portal | A standalone link to the portal | `buttons` |
| Instructions | Paragraphs and numbered steps | Leave blank |

The title can be a heading (such as H2 or H3) or a paragraph. Its text stays vertically
centered beside the toggle icon. The content cell supports paragraphs, lists, and links.

Add the third column to choose the link presentation **for that row's content cell**.
It is configuration only and does not appear on the page. Different rows in the same
accordion can use different styles.

| Value | Result |
| --- | --- |
| `links` | Render every link as an underlined text link, including links that the shared page code initially styled as buttons. PDF links also get the existing PDF icon and an accessible PDF label. |
| `buttons` | Render standalone links as buttons, including links that are the only content of a list item. Links within sentences stay inline. Existing primary/secondary button styling is preserved. |
| `auto` or blank | Preserve the existing shared behavior: a standalone paragraph link becomes a button; inline and ordinary list links remain text links. |

Values are case-insensitive; unsupported values fall back to `auto`. Existing two-column
blocks work unchanged. To return a panel to the existing behavior, clear its third cell.

In `links` mode, PDF detection uses URL paths ending in `.pdf` or the migrated `-pdf`
form, including URLs with query strings or fragments. Opaque download URLs cannot be
identified automatically; include **(PDF)** in their authored link text when appropriate.
The style setting preserves link destinations, targets, and download behavior.

For buttons, put each call to action in its own paragraph or list item. Bold and italic
standalone paragraph links continue to use the shared primary and secondary button styles.

## Supported variations

The optional third cell controls each panel independently; no block-name variation is required.

## Universal Editor fields

N/A (Document Authoring project)

## Validation

Run `npm run lint` and `git diff --check`. In a local preview, verify panels with
`links`, `buttons`, and blank settings, including PDF URLs, links within sentences,
and existing two-column blocks. Check keyboard navigation and long-link wrapping
at narrow viewport widths.

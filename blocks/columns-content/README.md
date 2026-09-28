# columns-content

Custom **columns** block. Side-by-side prose content columns (headings,
paragraphs, lists, links/PDFs). Stacks vertically below 900px; equal-width
columns with a 48px gap at 900px and up.

Styles are scoped to `body.north-carolina` — the page's Metadata block must
include `theme: north-carolina` or the layout will not apply.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. The first row is the block name; each following row is a
band of columns, and **each cell in a row becomes one column** (2 cells = 2
columns, 3 cells = 3 columns).

| Columns Content |                  |
|-----------------|------------------|
| ## Left heading<br>Paragraph text…<br>• link / list item | ## Right heading<br>Paragraph text…<br>• PDF link |

- Add more rows to stack additional side-by-side bands.
- Cells accept any default content: headings, paragraphs, lists, links, images.
- The first element in each cell has its top margin removed so headings align.
- A cell containing only an image gets the `columns-content-img-col` class.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-doc-library. Base block: columns.
 * Source: https://provider.healthybluenc.com/north-carolina-provider/resource-library
 * Generated: 2026-09-15
 *
 * Library structure (columns): row 1 = block name; subsequent rows have one
 *   cell per visual column, all rows sharing the same column count. Here: a
 *   single content row with one cell per document-library column. Each column
 *   holds category headings (h3/h4) over PDF/link lists (ul.pdflist).
 *
 * Source (section.content_column_2 > div.within_brdr): an intro (h1/h2/p) then
 *   two <section class="content_column"> columns, each = repeating
 *   (h3/h4 category heading + div > ul.pdflist) groups.
 */
export default function parse(element, { document }) {
  // The document-library columns.
  const columns = Array.from(element.querySelectorAll(':scope > .within_brdr > section.content_column, :scope > section.content_column, section.content_column'));

  // Empty-block guard.
  if (columns.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // One row: one cell per column. Each cell holds all of that column's
  // category headings and document lists.
  const row = columns.map((col) => {
    const wrapper = col.querySelector(':scope > div');
    return wrapper ? Array.from(wrapper.children) : Array.from(col.children);
  });
  const cells = [row];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-doc-library', cells });
  element.replaceWith(block);
}

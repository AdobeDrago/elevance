/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-link-lists. Base block: columns.
 * Source: https://provider.healthybluenc.com/north-carolina-provider/home
 * Generated: 2026-09-14
 *
 * Library structure (columns): first row = block name; subsequent rows have one
 *   cell per visual column. Here: a single content row with two cells, each cell
 *   holding a <ul> list of chevron links.
 *
 * Source (section.tools_resources): div > (h2.small heading + div > two <ul>).
 *   The section heading is section-level; the two lists become the two columns.
 */
export default function parse(element, { document }) {
  // The chevron-link lists that form the columns.
  const lists = Array.from(element.querySelectorAll('ul'));

  // Empty-block guard.
  if (lists.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // One row: one cell per list (column). Matches the two-column source layout,
  // and adapts if the number of lists varies across pages.
  const row = lists.map((list) => list);
  const cells = [row];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-link-lists', cells });
  element.replaceWith(block);
}

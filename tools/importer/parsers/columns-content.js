/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-content. Base block: columns.
 * Source: https://provider.healthybluenc.com/north-carolina-provider/electronic-data-interchange
 * Generated: 2026-09-15
 *
 * Library structure (columns): row 1 = block name; subsequent rows have one
 *   cell per visual column, with every content row sharing the same column
 *   count. Here: a single content row with two cells, each cell holding a prose
 *   content column (heading + paragraphs + lists).
 *
 * Source (section.content_column_2 > div.within_brdr): two side-by-side
 *   <section class="content_column"> columns, each = h2 + p (+ ul/ol) prose.
 */
export default function parse(element, { document }) {
  // The two side-by-side prose content columns.
  const columns = Array.from(element.querySelectorAll(':scope > .within_brdr > section.content_column, :scope > section.content_column, section.content_column'));

  // Empty-block guard.
  if (columns.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // One row: one cell per column. Each cell holds that column's content nodes.
  const row = columns.map((col) => {
    const wrapper = col.querySelector(':scope > div');
    return wrapper ? Array.from(wrapper.children) : Array.from(col.children);
  });
  const cells = [row];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-content', cells });
  element.replaceWith(block);
}

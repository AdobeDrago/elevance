/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-promo. Base block: cards (2-column image variant).
 * Source: https://provider.healthybluenc.com/north-carolina-provider/patient-care
 * Generated: 2026-09-15
 *
 * Library structure (cards): 2 columns, multiple rows; row 1 = block name.
 *   Each subsequent row = one promo: [image cell (mandatory), text cell
 *   (heading + description + call-to-action)].
 *
 * Source (section.content_column_2 > div.within_brdr): two
 *   <section class="content_column"> siblings per promo — one holding an <img>,
 *   the other holding div > (h2 + p + a.button > button). The image may be on
 *   either side (alternating layout), so detect the image column vs the body
 *   column rather than assuming order. Each matched section yields one promo row.
 */
export default function parse(element, { document }) {
  // The side-by-side columns of the promo (image column + body column).
  const columns = Array.from(element.querySelectorAll(':scope > .within_brdr > section.content_column, :scope > section.content_column, section.content_column'));

  const image = columns.map((c) => c.querySelector('img')).find(Boolean)
    || element.querySelector('img');

  // Body column: the one carrying text content (not just the image).
  const bodyCol = columns.find((c) => !c.querySelector('img') && c.querySelector('h1, h2, h3, h4, p, a'))
    || columns.find((c) => c.querySelector('h1, h2, h3, h4'));

  const bodyCell = [];
  if (bodyCol) {
    const wrapper = bodyCol.querySelector(':scope > div');
    if (wrapper) bodyCell.push(...wrapper.children);
    else bodyCell.push(...bodyCol.children);
  }

  // Empty-block guard.
  if (!image && bodyCell.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // One promo row: [image cell, body cell]. Pad the image with '' when absent
  // so every row keeps its two columns.
  const cells = [[image || '', bodyCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-promo', cells });
  element.replaceWith(block);
}

/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-resource-grid. Base block: cards (no images variant).
 * Source: https://provider.healthybluenc.com/north-carolina-provider/resources
 * Generated: 2026-09-15
 *
 * Library structure (cards, no images): 1 column, multiple rows; row 1 = block
 *   name. Each subsequent row = one card, a single cell holding
 *   heading + description + call-to-action (solid button).
 *
 * Source (section.content_column_2 > div.within_brdr): a 2x2 grid of no-image
 *   cards, each an <article> containing div > (h3 + p + a.button > button).
 *   Articles are grouped inside <section class="content_column"> columns; we
 *   flatten to one row per article.
 */
export default function parse(element, { document }) {
  // Each card is an <article> in the resource grid.
  let cards = Array.from(element.querySelectorAll('article'));

  // Fallback: some grids express cards directly as content_column sections.
  if (cards.length === 0) {
    cards = Array.from(element.querySelectorAll('section.content_column'));
  }

  const cells = [];
  cards.forEach((card) => {
    const body = card.querySelector(':scope > div');
    const bodyCell = [];
    if (body) {
      bodyCell.push(...body.children);
    } else {
      const heading = card.querySelector('h2, h3, h4');
      if (heading) bodyCell.push(heading);
      bodyCell.push(...card.querySelectorAll(':scope > p, :scope > a'));
    }
    if (bodyCell.length) cells.push([bodyCell]); // 1-column card: one cell, many nodes
  });

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-resource-grid', cells });
  element.replaceWith(block);
}

/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-topics. Base block: cards (no images variant).
 * Source: https://provider.healthybluenc.com/north-carolina-provider/claims
 * Generated: 2026-09-15
 *
 * Library structure (cards, no images): 1 column, multiple rows; row 1 = block
 *   name. Each subsequent row = one card, a single cell holding
 *   heading + description + call-to-action.
 *
 * Source (section.content_column_3 / content_column_1): an optional section
 *   heading (h2) + a repeating set of <section class="content_column"> teasers,
 *   each = div > (h3 + p + p.arrow_link > a). Some pages express teasers as
 *   repeating h3 + p + div blocks inside a single column; both are handled.
 */
export default function parse(element, { document }) {
  // Each teaser is a section.content_column inside the block.
  const cards = Array.from(element.querySelectorAll('section.content_column'));

  const cells = [];

  if (cards.length > 0) {
    cards.forEach((card) => {
      // Body wrapper (div) or the card itself.
      const body = card.querySelector(':scope > div');
      const bodyCell = [];
      if (body) {
        bodyCell.push(...body.children);
      } else {
        const heading = card.querySelector('h2, h3, h4');
        if (heading) bodyCell.push(heading);
        bodyCell.push(...card.querySelectorAll(':scope > p, :scope > div'));
      }
      if (bodyCell.length) cells.push([bodyCell]); // 1-column card: one cell, many nodes
    });
  } else {
    // Fallback: teasers expressed as repeating headings within a single column.
    const scope = element.querySelector('.within_brdr, :scope > div') || element;
    Array.from(scope.children).forEach((child) => {
      if (/^(H[2-4]|P|DIV)$/.test(child.tagName)) cells.push([[child]]);
    });
  }

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-topics', cells });
  element.replaceWith(block);
}

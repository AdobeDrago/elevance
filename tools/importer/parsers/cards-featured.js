/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-featured. Base block: cards.
 * Source: https://provider.healthybluenc.com/north-carolina-provider/home
 * Generated: 2026-09-14
 *
 * Library structure (cards): 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each subsequent row = one card: [image cell, text cell (heading + paragraph + link)].
 *
 * Source (section.content_column_3 > div.within_brdr): an h2 section heading + hr,
 *   then three <section class="content_column"> cards, each:
 *     img + div(h3 + p + p.arrow_link > a).
 */
export default function parse(element, { document }) {
  // Each card is a section.content_column inside the block.
  const cards = Array.from(element.querySelectorAll('section.content_column, .content_column'));

  const cells = [];
  cards.forEach((card) => {
    const image = card.querySelector('img');
    // Text content wrapper: the div holding heading + paragraphs + arrow link.
    const body = card.querySelector(':scope > div, div');

    const bodyCell = [];
    if (body) {
      bodyCell.push(...body.children);
    } else {
      const heading = card.querySelector('h2, h3, h4');
      const paras = Array.from(card.querySelectorAll('p'));
      if (heading) bodyCell.push(heading);
      bodyCell.push(...paras);
    }

    cells.push([image || '', bodyCell]);
  });

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-featured', cells });
  element.replaceWith(block);
}

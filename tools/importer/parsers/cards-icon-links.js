/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-icon-links. Base block: cards.
 * Source: https://provider.healthybluenc.com/north-carolina-provider/home
 * Generated: 2026-09-14
 *
 * Library structure (cards): 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each subsequent row = one card: [image/icon cell, text cell].
 *
 * Source (section.information_links): a flat list of <a> links, each wrapping
 *   div.information_link > (img icon + div label). One row per link:
 *   cell 1 = icon image, cell 2 = a link whose text is the label.
 */
export default function parse(element, { document }) {
  // Each icon link is a direct anchor in the section.
  const links = Array.from(element.querySelectorAll(':scope > a, a'));

  const cells = [];
  links.forEach((link) => {
    const icon = link.querySelector('img');
    // Label text lives in a nested div (the last text-bearing div).
    const labelDiv = link.querySelector('.information_link > div:last-child, div > div');
    const labelText = (labelDiv ? labelDiv.textContent : link.textContent).trim();

    // Build a link element carrying the label + href so the CTA is preserved.
    const labelLink = document.createElement('a');
    labelLink.setAttribute('href', link.getAttribute('href') || '#');
    labelLink.textContent = labelText;

    const iconCell = icon || '';
    cells.push([iconCell, labelLink]);
  });

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-icon-links', cells });
  element.replaceWith(block);
}

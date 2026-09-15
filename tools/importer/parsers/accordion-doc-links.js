/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-doc-links. Base block: accordion.
 * Source: https://provider.healthybluenc.com/north-carolina-provider/reimbursement-policies
 * Generated: 2026-09-15
 *
 * Library structure (accordion): 2 columns, multiple rows; row 1 = block name.
 *   Each subsequent row = one panel as 2 cells: [title cell (mandatory),
 *   content cell (mandatory)].
 *
 * Source has two DOM forms across pages:
 *   - medical-policies: section.mp-accordion with .mp-accordion__item >
 *       (.mp-accordion__title > span + .mp-accordion__content).
 *   - reimbursement-policies: section.accordions with .accordion-item >
 *       (.accordion-title > span + .accordion-content) holding div.pdflist link lists.
 *   Both are handled via combined selectors.
 */
export default function parse(element, { document }) {
  // Each accordion panel (either DOM form).
  const items = Array.from(element.querySelectorAll('.mp-accordion__item, .accordion-item'));

  const cells = [];
  items.forEach((item) => {
    const titleEl = item.querySelector('.mp-accordion__title, .accordion-title');
    const contentEl = item.querySelector('.mp-accordion__content, .accordion-content');

    // Title cell: prefer the label text node (span) over the +/- icon wrapper.
    const titleCell = [];
    if (titleEl) {
      const label = titleEl.querySelector('span');
      titleCell.push(label || titleEl);
    }

    // Content cell: all content nodes of the panel (paragraphs, pdflist link lists, etc.).
    const bodyCell = contentEl ? Array.from(contentEl.childNodes) : [];

    cells.push([titleCell, bodyCell]); // 2-column row: [title, content]
  });

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-doc-links', cells });
  element.replaceWith(block);
}

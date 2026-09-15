/* eslint-disable */
/* global WebImporter */
/**
 * Parser for table-news-archive. Base block: table.
 * Source: https://provider.healthybluenc.com/north-carolina-provider/archives
 * Generated: 2026-09-15
 *
 * Library structure (table): row 1 = block name; each subsequent row is a data
 *   row with the same number of cells. Content model (one row per document,
 *   3 cells): [ linked document title | publication date | category ].
 * The table-news-archive block derives its filter tabs from the distinct
 * category values and paginates the rows, so the parser emits the flat
 * document list with a category per row.
 *
 * Source (section.content_column_1 with .tab_pdfs / .archive-list): a list of
 *   document rows, each a <div> = (div[date] + div.pdfs > img + a[pdf link]).
 *   Category comes from the active filter tab (tab_list); where no per-row
 *   category exists, fall back to the active tab label or 'All'.
 */
export default function parse(element, { document }) {
  // The scrolling list of document entries.
  const listRoot = element.querySelector('.tab_pdfs, .archive-list') || element;

  // Each document is a direct child <div> holding a date div + a .pdfs link div.
  const items = Array.from(listRoot.querySelectorAll(':scope > div'))
    .filter((div) => div.querySelector('a'));

  // Category label: the active tab, else the first tab, else 'All'.
  const activeTab = element.querySelector('.tab_list .highlighted_tab span, .tab_list li span');
  const categoryLabel = (activeTab && activeTab.textContent.trim()) || 'All';

  const cells = [];
  items.forEach((item) => {
    const link = item.querySelector('a');
    if (!link) return;

    // Date: the first child div that is not the .pdfs link wrapper.
    const dateDiv = Array.from(item.children)
      .find((child) => child.tagName === 'DIV' && !child.classList.contains('pdfs'));
    const dateText = (dateDiv && dateDiv.textContent.trim()) || '';

    // Title cell = the document link (semantics preserved); date + category text.
    cells.push([link, dateText, categoryLabel]); // 3-column data row
  });

  // Empty-block guard.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-news-archive', cells });
  element.replaceWith(block);
}

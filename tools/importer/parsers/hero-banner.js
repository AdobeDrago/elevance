/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-banner. Base block: hero.
 * Source: https://provider.healthybluenc.com/north-carolina-provider/claims
 * Generated: 2026-09-15
 *
 * Library structure (hero): 1 column, 3 rows; row 1 = block name.
 *   Row 2 (optional): background/banner image (picture).
 *   Row 3: content cell — title (+ optional subheading/CTA).
 *
 * Source: a full-width banner (section.wide_image > img) followed by a solid
 *   title bar (section.content_column_1 > ... > h1.subpage-header). The union
 *   selector may match either the banner or the title section, so extract both
 *   defensively from the matched element and emit only the rows present.
 */
export default function parse(element, { document }) {
  // Row 2: background/banner image. Only a true banner counts — the image that
  // is a direct child of the matched section (section.wide_image), not a stray
  // nested icon (e.g. a PDF icon inside a title section).
  const image = element.querySelector(':scope > picture, :scope > img, .wide_image > picture, .wide_image > img');

  // Row 3 content: the page title heading plus any adjacent subheading/CTA.
  const heading = element.querySelector('h1.subpage-header, h1, h2');

  // Empty-block guard.
  if (!image && !heading) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  if (image) cells.push([image]);           // Row 2: background image (1 cell)

  const contentCell = [];
  if (heading) contentCell.push(heading);
  cells.push([contentCell]);                // Row 3: content in one cell (1 column)

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-banner', cells });
  element.replaceWith(block);
}

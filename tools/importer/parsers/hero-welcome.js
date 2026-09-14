/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-welcome. Base block: hero.
 * Source: https://provider.healthybluenc.com/north-carolina-provider/home
 * Generated: 2026-09-14
 *
 * Library structure (hero): 1 column, 3 rows.
 *   Row 1: block name.
 *   Row 2: background image (picture).
 *   Row 3: content cell (heading + intro/subheadings/paragraphs + contact block).
 *
 * Source (section.wide_image): a direct <img> background, then
 *   div.center > article.welcome_content > (h1.welcome + div.welcome_copy).
 */
export default function parse(element, { document }) {
  // Row 2: background image — the section's direct/first image.
  const bgImage = element.querySelector(':scope > img, img');

  // Row 3: content — heading + copy from the welcome article.
  const contentEl = element.querySelector('.welcome_content, article, .center');
  const scope = contentEl || element;
  const heading = scope.querySelector('h1, h2, .welcome');
  const copy = scope.querySelector('.welcome_copy');

  const contentCell = [];
  if (heading) contentCell.push(heading);
  if (copy) {
    // Flatten the wrapper: keep intro paragraph, subheading, paragraphs, contact block.
    contentCell.push(...copy.children);
  } else {
    // Fallback: pull any remaining text/heading nodes from the content scope,
    // excluding the heading already added and the background image.
    const rest = Array.from(scope.querySelectorAll(':scope > *'))
      .filter((el) => el !== heading && el.tagName !== 'IMG');
    contentCell.push(...rest);
  }

  // Empty-block guard.
  if (!bgImage && contentCell.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  if (bgImage) cells.push([bgImage]);       // Row 2: background image (1 cell)
  cells.push([contentCell]);                // Row 3: all content in one cell (1 column)

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-welcome', cells });
  element.replaceWith(block);
}

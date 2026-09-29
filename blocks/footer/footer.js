import { getMetadata } from '../../scripts/aem.js';
/**
 * Loads and decorates the footer.
 *
 * Content-first: all footer copy and links live in content/footer.plain.html.
 * This module fetches that fragment (metadata-independent dual fetch) and
 * renders it — it never hardcodes footer copy.
 *
 * Fetch order:
 *   1. {footer-metadata}.plain.html         — DA/EDS production (served at site root)
 *   2. /content + {footer-metadata}.plain.html — localhost / aem up (content under /content)
 *   3. /content/footer.plain.html            — legacy default
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer') || '/footer';
  let resp = await fetch(`${footerMeta}.plain.html`);
  if (!resp.ok) resp = await fetch(`/content${footerMeta}.plain.html`);
  if (!resp.ok) resp = await fetch('/content/footer.plain.html');
  block.textContent = '';
  const footer = document.createElement('div');
  if (resp.ok) footer.innerHTML = await resp.text();

  // Tag the two top-level sections so the CSS can lay them out:
  // first = contact/links row, second = legal block.
  const sections = [...footer.children];
  const classes = ['footer-links', 'footer-legal'];
  sections.forEach((section, i) => {
    if (classes[i]) section.classList.add(classes[i]);
  });

  if (document.body.classList.contains('north-carolina')) {
    const legal = footer.querySelector('.footer-legal');
    if (legal) footer.prepend(legal);
    const reader = footer.querySelector('a[href="https://get.adobe.com/reader/"]');
    if (reader) {
      reader.classList.add('footer-reader');
      const badge = document.createElement('img');
      badge.src = `${window.hlx.codeBasePath}/blocks/footer/adobe-reader.png`;
      badge.alt = reader.textContent.trim() || 'Download Adobe Reader';
      badge.width = 175;
      badge.height = 43;
      badge.loading = 'lazy';
      reader.replaceChildren(badge);
    }
  }

  block.append(footer);
}

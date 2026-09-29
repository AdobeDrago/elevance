/*
 * cta-footer-banner — full-width call-to-action band near the page foot.
 * Content model (one cell per row):
 *   row 1: heading text
 *   row 2: paragraph text
 *   row 3: button — a real hyperlink (link text = button label)
 * Structural only — brand styling from body.north-carolina tokens.
 */
export default function decorate(block) {
  const [headingRow, textRow, linkRow] = [...block.children];
  const cell = (row) => row?.firstElementChild;

  const content = document.createElement('div');
  content.className = 'cta-footer-banner-content';

  // Heading: keep an authored heading level if present, otherwise default to h2.
  const headingCell = cell(headingRow);
  if (headingCell?.textContent.trim()) {
    const heading = document.createElement('h3');
    heading.textContent = headingCell.textContent.trim();
    heading.classList.add('cta-footer-banner-heading');
    content.append(heading);
  }

  // Paragraph: move nodes (not textContent) so inline bold/links survive.
  const textCell = cell(textRow);
  if (textCell?.textContent.trim()) {
    const paragraphs = textCell.querySelectorAll('p');
    if (paragraphs.length) {
      content.append(...paragraphs);
    } else {
      const p = document.createElement('p');
      p.append(...textCell.childNodes);
      content.append(p);
    }
    content.querySelectorAll(':scope > p').forEach((p) => p.classList.add('cta-footer-banner-text'));
  }

  // Button: decorateButtons() may already have styled the link; normalize either way.
  const link = cell(linkRow)?.querySelector('a');
  if (link?.textContent.trim()) {
    link.className = 'button';
    const wrapper = document.createElement('p');
    wrapper.className = 'button-container';
    wrapper.append(link);
    content.append(wrapper);
  }

  block.replaceChildren(content);
}

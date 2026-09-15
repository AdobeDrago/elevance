/*
 * accordion-doc-links — expand/collapse accordion whose panels hold lists of
 * PDF/document links. Each row: label cell (category title) + body cell (link list).
 * Structural only — brand styling from body.north-carolina tokens.
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-doc-links-item-label';
    if (label) summary.append(...label.childNodes);

    const body = row.children[1];
    if (body) body.className = 'accordion-doc-links-item-body';

    const details = document.createElement('details');
    details.className = 'accordion-doc-links-item';
    details.append(summary);
    if (body) details.append(body);
    row.replaceWith(details);
  });
}

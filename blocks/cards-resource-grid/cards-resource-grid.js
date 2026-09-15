/*
 * cards-resource-grid — grid of no-image cards each ending in a solid button.
 * Each card: heading + paragraph + solid-filled button CTA. Typically 2x2.
 * Structural only — brand styling from body.north-carolina tokens.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      div.className = 'cards-resource-grid-card-body';
    });
    ul.append(li);
  });
  block.textContent = '';
  block.append(ul);
}

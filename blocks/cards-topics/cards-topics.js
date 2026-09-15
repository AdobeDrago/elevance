/*
 * cards-topics — N-up no-image teaser grid.
 * Each card: heading + paragraph + arrow text link. No images.
 * Structural only — brand styling from body.north-carolina tokens.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      div.className = 'cards-topics-card-body';
    });
    ul.append(li);
  });
  block.textContent = '';
  block.append(ul);
}

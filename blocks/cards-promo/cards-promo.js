import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * cards-promo — full-width promo rows, photo beside text, alternating sides.
 * Each row: an image cell and a body cell (heading + paragraph + solid button).
 * Rows alternate image-left / image-right down the list (handled in CSS).
 * Structural only — brand styling from body.north-carolina tokens.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-promo-card-image';
      } else {
        div.className = 'cards-promo-card-body';
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);

  // Each promo row is its own block, so alternation cannot rely on :nth-child
  // inside a single list. Determine this block's position among all
  // cards-promo blocks on the page and flip the image side on even indices
  // (source pattern: 1st image-right, 2nd image-left, 3rd image-right ...).
  const all = [...document.querySelectorAll('.cards-promo')];
  const index = all.indexOf(block);
  if (index % 2 === 0) block.classList.add('cards-promo-reverse');
}

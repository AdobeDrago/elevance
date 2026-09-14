import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * cards-icon-links — a horizontal row of icon + label links.
 * Each row becomes a list item holding an icon (picture or .icon) and a
 * label link. Structural only — brand styling applied by the design pass.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && (div.querySelector('picture') || div.querySelector('.icon'))) {
        div.className = 'cards-icon-links-card-image';
      } else {
        div.className = 'cards-icon-links-card-body';
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '150' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}

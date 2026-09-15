/*
 * columns-content — two-up prose content columns.
 * Each column holds general content (heading + paragraph + link/PDF lists).
 * Distinct from columns-link-lists (pure chevron link directory).
 * Structural only — brand styling from body.north-carolina tokens.
 */
export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-content-${cols.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      col.classList.add('columns-content-col');
      const pic = col.querySelector('picture');
      if (pic && col.children.length === 1) col.classList.add('columns-content-img-col');
    });
  });
}

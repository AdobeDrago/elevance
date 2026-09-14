/*
 * columns-link-lists — two side-by-side lists of chevron links.
 * Structural only — brand styling applied by the design pass.
 */
export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-link-lists-${cols.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      col.classList.add('columns-link-lists-col');
    });
  });
}

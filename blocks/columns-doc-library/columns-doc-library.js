/*
 * columns-doc-library — categorized multi-column document library.
 * Each column holds category headings (h3/h4) over mixed PDF + external
 * link lists. Denser/categorized vs. columns-link-lists.
 * Structural only — brand styling from body.north-carolina tokens.
 */
export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-doc-library-${cols.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      col.classList.add('columns-doc-library-col');
    });
  });
}

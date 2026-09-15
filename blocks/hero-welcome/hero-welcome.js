/*
 * hero-welcome — full-bleed background photo with an overlaid content card.
 * Content model (2 rows):
 *   row 1: background image (picture)
 *   row 2: card content (heading, paragraphs, contact block)
 * Structural only — brand styling applied by the design pass.
 */
export default function decorate(block) {
  const rows = [...block.children];

  // Identify the picture row and the content row.
  const pictureRow = rows.find((row) => row.querySelector('picture'));
  const contentRow = rows.find((row) => row !== pictureRow);

  if (pictureRow) {
    pictureRow.classList.add('hero-welcome-bg');
    // unwrap the picture to the row level so it can fill the block
    const cell = pictureRow.firstElementChild;
    if (cell) cell.classList.add('hero-welcome-bg-inner');
  } else {
    block.classList.add('no-image');
  }

  if (contentRow) {
    contentRow.classList.add('hero-welcome-card');
    const cell = contentRow.firstElementChild;
    if (cell) cell.classList.add('hero-welcome-card-inner');
  }
}

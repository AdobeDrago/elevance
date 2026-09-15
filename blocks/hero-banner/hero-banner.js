/*
 * hero-banner — interior-page title banner.
 * A full-width banner photo (optional) above a solid brand-blue bar holding
 * the page H1. No overlay content card (that is the hero-welcome pattern).
 * Content model:
 *   row 1: banner image (picture)   [optional]
 *   row 2: heading (H1 title)        — or row 1 if no image
 * Structural only — brand styling from body.north-carolina tokens.
 */
export default function decorate(block) {
  const rows = [...block.children];

  let imageRow = rows.find((row) => row.querySelector('picture'));
  const titleRow = rows.find((row) => row !== imageRow && row.textContent.trim());

  // Adopt a preceding image-only default-content section as the banner photo.
  // The importer emits the full-bleed hero photo as its own section directly
  // above the title bar; pull it in so the block owns the photo + bar as a unit.
  if (!imageRow) {
    const section = block.closest('.section');
    const prevSection = section?.previousElementSibling;
    const prevPicture = prevSection?.querySelector('picture');
    if (prevSection?.classList.contains('section')
      && prevPicture
      && prevSection.textContent.trim() === '') {
      const row = document.createElement('div');
      row.append(prevPicture.closest('p') || prevPicture);
      block.prepend(row);
      imageRow = row;
      prevSection.remove();
    }
  }

  if (imageRow) {
    imageRow.classList.add('hero-banner-image');
    const cell = imageRow.firstElementChild;
    if (cell) cell.classList.add('hero-banner-image-inner');
  } else {
    block.classList.add('no-image');
  }

  if (titleRow) {
    titleRow.classList.add('hero-banner-title');
    const cell = titleRow.firstElementChild;
    if (cell) cell.classList.add('hero-banner-title-inner');
  }
}

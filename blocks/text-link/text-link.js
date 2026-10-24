/**
 * text-link — paragraphs holding a text link (source: <p> with a link, p.arrow_link).
 * Each row is one paragraph (a link, or text with inline links). The `chevron`
 * variant renders the source arrow link: bold link followed by a chevron-right.
 */
export default function decorate(block) {
  const items = [...block.children].flatMap((row) => {
    const cell = row.firstElementChild || row;
    const paragraphs = [...cell.querySelectorAll(':scope > p')];
    if (paragraphs.length) return paragraphs;
    if (!cell.textContent.trim()) return [];

    const p = document.createElement('p');
    p.append(...cell.childNodes);
    return [p];
  });

  items.forEach((p) => {
    p.className = 'text-link-item';
    // links stay text links, even when authored bold/italic
    p.querySelectorAll('a').forEach((a) => a.classList.remove('button', 'primary', 'secondary'));
  });

  block.replaceChildren(...items);
}

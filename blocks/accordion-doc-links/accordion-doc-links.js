/*
 * accordion-doc-links — expand/collapse accordion whose panels hold lists of
 * PDF/document links. Each row: label cell (category title) + body cell (link list).
 * Brand styling from body.north-carolina tokens.
 */
function animateToggle(details, summary) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let animation;
  let expanded = details.open;

  summary.addEventListener('click', (event) => {
    if (event.target.closest('a')) return;
    event.preventDefault();

    // Start at the visible height so another click smoothly reverses the slide.
    const startHeight = details.getBoundingClientRect().height;
    expanded = animation ? !expanded : !details.open;
    animation?.cancel();

    const finish = () => {
      details.open = expanded;
      details.classList.remove('is-animating');
      summary.removeAttribute('aria-expanded');
      animation = null;
    };

    if (reducedMotion.matches || !details.animate) {
      finish();
      return;
    }

    // Keep the body rendered until the closing animation has finished.
    details.open = true;
    summary.setAttribute('aria-expanded', expanded);
    const endHeight = expanded
      ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
    details.classList.add('is-animating');
    animation = details.animate(
      [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
      { duration: 400, easing: 'ease-in-out' },
    );
    animation.onfinish = finish;
  });
}

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-doc-links-item-label';
    if (label) summary.append(...label.childNodes);

    const body = row.children[1];
    if (body) body.className = 'accordion-doc-links-item-body';

    const details = document.createElement('details');
    details.className = 'accordion-doc-links-item';
    details.append(summary);
    if (body) details.append(body);
    row.replaceWith(details);
    animateToggle(details, summary);
  });
}

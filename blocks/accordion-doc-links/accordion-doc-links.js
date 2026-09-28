/*
 * accordion-doc-links — expand/collapse accordion whose panels hold lists of
 * PDF/document links. Each row: title + content + optional link style (links/buttons/auto).
 * Brand styling from body.north-carolina tokens.
 */
function decoratePDFLink(link) {
  let pathname;
  try {
    pathname = new URL(link.href).pathname;
  } catch {
    return;
  }
  if (!/(\.pdf|-pdf)$/i.test(pathname)) return;

  link.classList.add('accordion-doc-links-pdf');
  const label = link.getAttribute('aria-label');
  if (/\bpdf\b/i.test(label || link.textContent)) return;
  if (label) {
    link.setAttribute('aria-label', `${label} (PDF)`);
  } else {
    const fileType = document.createElement('span');
    fileType.className = 'sr-only';
    fileType.textContent = ' (PDF)';
    link.append(fileType);
  }
}

function decorateLinkStyle(body, value = '') {
  const style = value.trim().toLowerCase();
  if (!['links', 'buttons'].includes(style)) return;

  body.dataset.linkStyle = style;
  body.querySelectorAll('a[href]').forEach((link) => {
    if (style === 'links') {
      // Undo the shared decorator's automatic conversion of standalone links.
      link.classList.remove('button', 'primary', 'secondary');
      const container = link.closest('.button-container');
      if (container && body.contains(container)) container.classList.remove('button-container');
      decoratePDFLink(link);
    } else {
      // Keep links within sentences inline, including paragraphs in list items.
      const container = link.closest('p, li, div');
      if (container && container.querySelectorAll('a').length === 1
        && container.textContent.trim() === link.textContent.trim()
        && !container.querySelector('img')) {
        link.classList.add('button');
        container.classList.add('button-container');
      }
    }
  });
}

function animateToggle(details, summary, body) {
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

    // Closing content must leave the tab order before its slide finishes.
    if (!expanded && body?.contains(document.activeElement)) summary.focus();
    body?.toggleAttribute('inert', !expanded);

    const finish = () => {
      details.open = expanded;
      body?.removeAttribute('inert');
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
    if (body) {
      body.className = 'accordion-doc-links-item-body';
      decorateLinkStyle(body, row.children[2]?.textContent);
    }

    const details = document.createElement('details');
    details.className = 'accordion-doc-links-item';
    details.append(summary);
    if (body) details.append(body);
    row.replaceWith(details);
    animateToggle(details, summary, body);
  });
}

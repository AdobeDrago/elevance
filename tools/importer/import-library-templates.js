/* eslint-disable */
/* global WebImporter */

/**
 * Library page templates — builds DA Library "Templates" pages from published pages.
 *
 * Source: a site's own published page in authoring form (`<preview host>/<path>.plain.html`):
 * top-level <div>s are sections, `<div class="name variant">` children are blocks.
 * There is no site chrome to clean, so no site transformers are used.
 *
 * Output: the same sections and blocks with page-specific copy swapped for placeholders,
 * repeated items trimmed, links set to "#", images kept (absolute published media URLs),
 * and the site's page metadata. Shared site-wide sections (provider tools & resources link
 * directory, join-network CTA) are kept verbatim.
 *
 * One URL per template; TEMPLATES maps each source page to its library path and site.
 */

const SITES = {
  'main--elevance--adobedrago.aem.page': {
    label: 'Elevance',
    titleSuffix: ' | Blue Medicare Advantage',
    metadata: {},
  },
  'main--elevance-nc--adobedrago.aem.page': {
    label: 'NC',
    titleSuffix: ' | Healthy Blue',
    metadata: {
      theme: 'north-carolina',
      nav: '/fragments/nav',
      footer: '/fragments/footer',
    },
  },
};

// source path (without .plain.html) → template definition
const TEMPLATES = {
  // Elevance (grs-provider) — library at /docs/library/templates/
  'main--elevance--adobedrago.aem.page/grs-provider': {
    name: 'home-page', path: '/docs/library/templates/home-page', title: 'Home page',
  },
  'main--elevance--adobedrago.aem.page/grs-provider/join-the-network': {
    name: 'interior-overview', path: '/docs/library/templates/interior-overview', title: 'Interior overview',
  },
  'main--elevance--adobedrago.aem.page/grs-provider/policies-manuals-and-guides': {
    name: 'document-reference', path: '/docs/library/templates/document-reference', title: 'Document reference',
  },
  'main--elevance--adobedrago.aem.page/grs-provider/benefits-and-pharmacy': {
    name: 'content-page', path: '/docs/library/templates/content-page', title: 'Content page',
  },
  // North Carolina — library at /library/templates/ (next to its blocks library)
  'main--elevance-nc--adobedrago.aem.page/north-carolina-provider/home': {
    name: 'home-page', path: '/library/templates/home-page', title: 'Home page',
  },
  'main--elevance-nc--adobedrago.aem.page/north-carolina-provider/resources': {
    name: 'interior-overview', path: '/library/templates/interior-overview', title: 'Interior overview',
  },
  'main--elevance-nc--adobedrago.aem.page/north-carolina-provider/manuals-and-guides': {
    name: 'document-reference', path: '/library/templates/document-reference', title: 'Document reference',
  },
  'main--elevance-nc--adobedrago.aem.page/north-carolina-provider/prior-authorization': {
    name: 'content-page', path: '/library/templates/content-page', title: 'Content page',
  },
};

// Blocks never placeholdered or trimmed (shared site-wide content or config tables).
const VERBATIM_BLOCKS = ['columns-link-lists', 'cta-footer-banner', 'section-metadata'];
// Sections whose headings mark shared site-wide content (kept verbatim).
const SHARED_HEADING = /provider tools\s*&(amp;)?\s*resources|interested in becoming a provider/i;

// Blocks whose rows are parts of one item (image row + text row), not repeating items.
const UNTRIMMED_BLOCKS = ['hero', 'hero-welcome', 'hero-banner', 'columns'];
// Max rows kept per block (repeating items); default for unlisted blocks.
const MAX_ROWS = {
  'cards-icon-links': 4,
  'cards-promo': 2,
  'cards-featured': 3,
  'cards-resource-grid': 2,
  'pdf-list': 3,
  'text-link': 2,
  'accordion-doc-links': 2,
  'columns-content': 2,
};
const DEFAULT_MAX_ROWS = 3;
const MAX_LIST_ITEMS = 3;
const MAX_H2_GROUPS = 2;

const TEXT = {
  h1: 'Page title',
  h2: 'Section heading',
  h3: 'Subsection heading',
  h4: 'Heading',
  h5: 'Heading',
  h6: 'Heading',
  paragraph: 'Add a short paragraph here. Replace this placeholder text with your own content.',
  label: 'Label',
  link: 'Link text',
  button: 'Button label',
  item: 'List item',
};

function templateKey(url) {
  const u = new URL(url);
  return `${u.host}${u.pathname.replace(/\.plain\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '')}`;
}

function blockName(el) {
  return [...el.classList][0];
}

function isBlock(el) {
  return el.tagName === 'DIV' && el.classList.length > 0;
}

function isSharedSection(section) {
  const blocks = [...section.children].filter(isBlock).map(blockName);
  if (blocks.some((b) => b === 'columns-link-lists' || b === 'cta-footer-banner')) return true;
  return [...section.querySelectorAll('h1, h2, h3, h4')].some((h) => SHARED_HEADING.test(h.textContent));
}

function onlyChildLink(p) {
  // A paragraph whose only content is one link (possibly in strong/em) — a button.
  const links = p.querySelectorAll('a');
  if (links.length !== 1) return null;
  return p.textContent.trim() === links[0].textContent.trim() ? links[0] : null;
}

function setLink(a, text) {
  a.textContent = text;
  a.setAttribute('href', '#');
  a.removeAttribute('title');
}

function placeholderParagraph(p, document) {
  if (p.querySelector('picture, img') && !p.textContent.trim()) return; // image-only: keep
  const button = onlyChildLink(p);
  if (button) {
    setLink(button, button.closest('strong, em') ? TEXT.button : TEXT.link);
    return;
  }
  const strongOnly = p.children.length === 1 && p.firstElementChild.tagName === 'STRONG'
    && p.textContent.trim() === p.firstElementChild.textContent.trim();
  const hadLink = p.querySelector('a');
  const pictures = [...p.querySelectorAll('picture')];
  p.textContent = '';
  pictures.forEach((pic) => p.append(pic));
  if (strongOnly) {
    const strong = document.createElement('strong');
    strong.textContent = TEXT.label;
    p.append(strong);
    return;
  }
  p.append(document.createTextNode(TEXT.paragraph));
  if (hadLink) {
    const a = document.createElement('a');
    setLink(a, TEXT.link);
    p.append(document.createTextNode(' '), a, document.createTextNode('.'));
  }
}

function placeholderize(root, document) {
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    const text = TEXT[h.tagName.toLowerCase()];
    const a = h.querySelector('a');
    h.removeAttribute('id');
    if (a) {
      setLink(a, text);
      h.textContent = '';
      h.append(a);
    } else {
      h.textContent = text;
    }
  });
  root.querySelectorAll('ul, ol').forEach((list) => {
    [...list.children].slice(MAX_LIST_ITEMS).forEach((li) => li.remove());
    [...list.children].forEach((li) => {
      const a = li.querySelector('a');
      li.textContent = '';
      if (a) {
        setLink(a, TEXT.link);
        li.append(a);
      } else {
        li.textContent = TEXT.item;
      }
    });
  });
  root.querySelectorAll('p').forEach((p) => placeholderParagraph(p, document));
  // Remaining inline links (e.g. bare links in block cells).
  root.querySelectorAll('a[href]:not([href="#"])').forEach((a) => setLink(a, TEXT.link));
  // Bare text directly in block cells.
  root.querySelectorAll('div').forEach((cell) => {
    [...cell.childNodes].forEach((n) => {
      if (n.nodeType === 3 && n.textContent.trim()) n.textContent = TEXT.label;
    });
  });
}

function trimSection(section) {
  // Keep at most MAX_H2_GROUPS heading groups of default content; blocks always stay.
  let h2s = 0;
  let dropping = false;
  [...section.children].forEach((el) => {
    if (el.tagName === 'H2') {
      h2s += 1;
      dropping = h2s > MAX_H2_GROUPS;
    }
    if (dropping && !isBlock(el)) el.remove();
  });
}

function trimBlock(block) {
  const name = blockName(block);
  if (VERBATIM_BLOCKS.includes(name) || UNTRIMMED_BLOCKS.includes(name)) return;
  const max = MAX_ROWS[name] ?? DEFAULT_MAX_ROWS;
  [...block.children].slice(max).forEach((row) => row.remove());
}

function toTable(block, document) {
  const [name, ...variants] = [...block.classList];
  const title = variants.length ? `${name} (${variants.join(', ')})` : name;
  const cells = [...block.children].map((row) => [...row.children].map((cell) => [...cell.childNodes]));
  return WebImporter.Blocks.createBlock(document, { name: title, cells });
}

function absolutizeImages(root, pageUrl) {
  root.querySelectorAll('picture').forEach((pic) => {
    const img = pic.querySelector('img');
    if (!img) return;
    const src = new URL(img.getAttribute('src'), pageUrl);
    src.search = '';
    const clean = img.ownerDocument.createElement('img');
    clean.setAttribute('src', src.href);
    clean.setAttribute('alt', img.getAttribute('alt') || '');
    pic.replaceWith(clean);
  });
}

export default {
  transform: (payload) => {
    const { document, params } = payload;
    const sourceUrl = params.originalURL;
    const key = templateKey(sourceUrl);
    const tpl = TEMPLATES[key];
    if (!tpl) throw new Error(`No library template defined for ${key}`);
    const site = SITES[new URL(sourceUrl).host];

    const main = document.body;
    const sections = [...main.children].filter((el) => el.tagName === 'DIV'
      && (el.textContent.trim() || el.querySelector('img, picture')));
    const out = document.createElement('div');

    sections.forEach((section, i) => {
      const shared = isSharedSection(section);
      if (!shared) {
        trimSection(section);
        [...section.children].filter(isBlock).forEach(trimBlock);
        // Placeholder everything except verbatim blocks.
        [...section.children].forEach((el) => {
          if (isBlock(el) && VERBATIM_BLOCKS.includes(blockName(el))) return;
          if (isBlock(el)) {
            placeholderize(el, document);
          } else {
            const wrap = document.createElement('div');
            el.replaceWith(wrap);
            wrap.append(el);
            placeholderize(wrap, document);
            wrap.replaceWith(...wrap.childNodes);
          }
        });
      }
      absolutizeImages(section, sourceUrl);
      [...section.children].filter(isBlock).forEach((block) => {
        block.replaceWith(toTable(block, document));
      });
      // Published .plain.html renders a section's style as a class on the section div;
      // turn it back into an authorable Section Metadata table.
      if (section.classList.length) {
        section.append(WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: [['style', [...section.classList].join(', ')]],
        }));
      }
      if (i > 0) out.append(document.createElement('hr'));
      out.append(...section.childNodes);
    });

    out.append(document.createElement('hr'));
    out.append(WebImporter.Blocks.getMetadataBlock(document, {
      title: `${TEXT.h1}${site.titleSuffix}`,
      description: 'One-sentence page summary for search results. Replace before publishing.',
      ...site.metadata,
    }));

    main.textContent = '';
    main.append(...out.childNodes);

    return [{
      element: main,
      path: tpl.path,
      report: { template: `${site.label} – ${tpl.title}`, source: key },
    }];
  },
};

/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS — interior blocks + reused home blocks
import heroBannerParser from './parsers/hero-banner.js';
import cardsIconLinksParser from './parsers/cards-icon-links.js';
import cardsTopicsParser from './parsers/cards-topics.js';
import cardsPromoParser from './parsers/cards-promo.js';
import cardsResourceGridParser from './parsers/cards-resource-grid.js';
import columnsContentParser from './parsers/columns-content.js';
import columnsDocLibraryParser from './parsers/columns-doc-library.js';
import columnsLinkListsParser from './parsers/columns-link-lists.js';
import accordionDocLinksParser from './parsers/accordion-doc-links.js';
import tableNewsArchiveParser from './parsers/table-news-archive.js';
import priorAuthLookupParser from './parsers/prior-auth-lookup.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/healthybluenc-cleanup.js';

const parsers = {
  'hero-banner': heroBannerParser,
  'cards-icon-links': cardsIconLinksParser,
  'cards-topics': cardsTopicsParser,
  'cards-promo': cardsPromoParser,
  'cards-resource-grid': cardsResourceGridParser,
  'columns-content': columnsContentParser,
  'columns-doc-library': columnsDocLibraryParser,
  'columns-link-lists': columnsLinkListsParser,
  'accordion-doc-links': accordionDocLinksParser,
  'table-news-archive': tableNewsArchiveParser,
  'prior-auth-lookup': priorAuthLookupParser,
};

const PAGE_TEMPLATE = { name: 'nc-provider-interior' };

/*
 * Per-page allow-list of blocks, derived from the Issue 2 per-page authoring
 * analyses. The content router may only APPLY a block to a page if that block
 * is in the page's allowed set — this prevents prose-heavy default-content
 * sections from being mis-routed to a block (which would drop their text).
 * Pages absent from this map (or with an empty array) get no blocks.
 */
const ALLOWED_BLOCKS = {
  '/north-carolina-provider/archives': ['columns-link-lists', 'table-news-archive'],
  '/north-carolina-provider/behavioral-health': ['columns-link-lists'],
  '/north-carolina-provider/benefits-partners': ['columns-link-lists'],
  '/north-carolina-provider/care-management': ['columns-link-lists'],
  '/north-carolina-provider/claims-submissions-and-disputes': ['columns-link-lists'],
  '/north-carolina-provider/claims': ['cards-icon-links', 'cards-topics', 'columns-link-lists', 'hero-banner'],
  '/north-carolina-provider/cme': ['cards-topics', 'columns-link-lists', 'hero-banner'],
  '/north-carolina-provider/communications': ['cards-icon-links', 'columns-link-lists', 'hero-banner'],
  '/north-carolina-provider/condition-care': ['columns-link-lists'],
  '/north-carolina-provider/contact-us': [],
  '/north-carolina-provider/patient-care/critical-incidents': ['columns-link-lists', 'hero-banner'],
  '/north-carolina-provider/early-periodic-screening-diagnostic-treatment': ['columns-link-lists'],
  '/north-carolina-provider/electronic-data-interchange': ['columns-content', 'columns-link-lists'],
  '/north-carolina-provider/eligibility-provider-reports': ['columns-link-lists'],
  '/north-carolina-provider/enhanced-personal-health-care-program': ['columns-link-lists', 'hero-banner'],
  '/north-carolina-provider/forms': ['columns-link-lists'],
  '/north-carolina-provider/guide-to-drug-coverage-under-medical-benefit': ['columns-link-lists'],
  '/north-carolina-provider/health-education': ['columns-link-lists'],
  '/north-carolina-provider/hedis': ['columns-link-lists'],
  '/north-carolina-provider/join-our-network': ['cards-icon-links', 'cards-promo', 'columns-link-lists'],
  '/north-carolina-provider/learn-about-availity': ['accordion', 'columns-link-lists'],
  '/north-carolina-provider/manuals-and-guides': ['columns-link-lists'],
  '/north-carolina-provider/maternal-child-services': ['columns-link-lists'],
  '/north-carolina-provider/medical-management': ['columns-link-lists'],
  '/north-carolina-provider/medical-policies-and-clinical-guidelines': ['accordion-doc-links', 'columns-link-lists'],
  '/north-carolina-provider/member-eligibility-and-pharmacy': ['cards-icon-links', 'cards-promo', 'columns-link-lists'],
  '/north-carolina-provider/patient-care': ['cards-icon-links', 'cards-promo', 'columns-link-lists'],
  '/north-carolina-provider/pharmacy': ['columns-link-lists'],
  '/north-carolina-provider/physician-administered-drug-program': ['columns-link-lists'],
  '/north-carolina-provider/prior-authorization-lookup': ['columns-link-lists', 'prior-auth-lookup'],
  '/north-carolina-provider/prior-authorization': ['columns-content', 'columns-link-lists'],
  '/north-carolina-provider/privacy-policies': [],
  '/north-carolina-provider/quality-management': ['columns-link-lists', 'hero-banner'],
  '/north-carolina-provider/referrals': ['columns-link-lists'],
  '/north-carolina-provider/reimbursement-policies': ['accordion-doc-links', 'columns-link-lists'],
  '/north-carolina-provider/reimbursement-policy-definitions': ['columns-link-lists', 'hero-banner'],
  '/north-carolina-provider/reimbursement-policy-disclaimer': ['columns-link-lists'],
  '/north-carolina-provider/resource-library': ['columns-link-lists'],
  '/north-carolina-provider/resources': ['cards-icon-links', 'cards-promo', 'cards-resource-grid', 'columns-link-lists'],
  '/north-carolina-provider/rights-and-responsibilities': ['columns-link-lists'],
  '/north-carolina-provider/sbirt': ['cards-topics', 'columns-content', 'columns-link-lists'],
  '/north-carolina-provider/schedules-registration': ['columns-link-lists'],
  '/north-carolina-provider/serving-diverse-populations': ['cards-resource-grid', 'cards-topics', 'columns-link-lists', 'hero-banner'],
  '/north-carolina-provider/terms-of-use': [],
  '/north-carolina-provider/total-member-view': ['columns-link-lists'],
  '/north-carolina-provider/training-academy': ['columns-link-lists', 'hero-banner'],
  '/north-carolina-provider/training-resources': ['columns-content', 'columns-link-lists'],
};

function allowedFor(originalURL) {
  try {
    const p = new URL(originalURL).pathname.replace(/\/$/, '').replace(/\.html?$/, '');
    return ALLOWED_BLOCKS[p] || null; // null = page unknown → allow all (safe default)
  } catch (e) {
    return null;
  }
}

const transformers = [cleanupTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try {
      fn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Content-aware router.
 *
 * The source reuses generic wrapper classes (content_column_1/2/3) that map to
 * DIFFERENT blocks depending on the content inside them, so we cannot route by
 * class alone. This inspects each candidate section's DOM and returns the block
 * name to apply — or null when the section is plain default content.
 */
function classifySection(section) {
  const cls = section.className || '';
  const text = (section.textContent || '').toLowerCase();

  // --- Unambiguous, class-driven cases first ---
  // Quick-action icon-link bar.
  if (cls.includes('information_links')) {
    return 'cards-icon-links';
  }
  // Accordion document directory.
  if (cls.includes('mp-accordion') || section.querySelector('.mp-accordion, .accordions, .accordion-item')) {
    return 'accordion-doc-links';
  }
  // Provider tools & resources two-column chevron directory.
  if (cls.includes('tools_resources')) {
    return 'columns-link-lists';
  }
  // Full-bleed banner photo section.
  if (cls.includes('wide_image')) {
    return 'hero-banner';
  }

  // --- .angular-form-content is REUSED by two very different widgets ---
  // Disambiguate the archive news feed vs. the prior-auth lookup tool by their
  // actual controls before falling through to generic content inspection.
  const isAngular = cls.includes('angular-form-content')
    || section.querySelector('.angular-form-content, [class*="angular-form"]');
  if (isAngular) {
    const hasLoadMore = /load more/.test(text);
    const hasArchiveTabs = /provider newsletter/.test(text) && /medicaid news/.test(text);
    const hasLookupControls = /line of business/.test(text)
      || (/market/.test(text) && /(cpt|hcpcs|drug)/.test(text));
    if (hasLoadMore || hasArchiveTabs) return 'table-news-archive';
    if (hasLookupControls) return 'prior-auth-lookup';
    // Ambiguous Angular block with neither signal: default to the feed, which
    // is the more content-bearing of the two (avoids dropping document rows).
    return 'table-news-archive';
  }

  // News/bulletin archive feed outside the Angular wrapper (fallback).
  if (section.querySelector('.archive-list, .load-more') || /load more/.test(text)) {
    return 'table-news-archive';
  }
  // Solid title bar — ONLY when the section is essentially just the H1.
  // Many interior pages put the H1 title band in the SAME section as body
  // content; routing those to hero-banner would drop the body, so only claim
  // title-only sections. Body-bearing title sections stay default content
  // (the H1 band is styled by the theme CSS).
  const h1 = section.querySelector('h1.subpage-header, h1');
  if (h1) {
    const h1Text = (h1.textContent || '').trim();
    const sectionText = text.trim();
    // title-only if the section text is not much longer than the H1 text
    if (sectionText.length <= h1Text.length + 40) {
      return 'hero-banner';
    }
    // otherwise fall through → default content (keeps H1 + body)
  }

  // --- Generic wrapper sections: inspect content ---
  const pics = section.querySelectorAll('picture, img');
  const articles = section.querySelectorAll('article');
  const uls = section.querySelectorAll('ul');
  const headings = section.querySelectorAll('h2, h3, h4');
  const buttons = section.querySelectorAll('a.button, .button-container a, button');

  // cards-promo: repeating image-beside-text rows with a button.
  if (pics.length >= 1 && buttons.length >= 1 && headings.length >= 1) {
    return 'cards-promo';
  }

  // cards-resource-grid: multiple no-image cards ending in solid buttons.
  if (pics.length === 0 && articles.length >= 2 && buttons.length >= 2) {
    return 'cards-resource-grid';
  }

  // cards-topics: repeating no-image teasers (heading + paragraph + arrow link),
  // 2+ heading groups, no images, links but not solid buttons.
  if (pics.length === 0 && headings.length >= 2 && buttons.length === 0
      && section.querySelectorAll('a').length >= 2) {
    // distinguish from a doc library / prose columns by shallow structure:
    const cols = section.querySelectorAll(':scope > div > div');
    if (cols.length >= 2) return 'cards-topics';
  }

  // columns-doc-library: categorized doc lists — many links across headings.
  if (pics.length === 0 && headings.length >= 2 && uls.length >= 2
      && section.querySelectorAll('a').length >= 6) {
    return 'columns-doc-library';
  }

  // columns-content: two side-by-side prose columns.
  if (pics.length === 0 && headings.length >= 1) {
    const topDivs = section.querySelectorAll(':scope > div > div');
    if (topDivs.length === 2) return 'columns-content';
  }

  // No block — plain default content.
  return null;
}

/**
 * Find the top-level content sections of the page (children of the main
 * content container), in document order.
 */
function findContentSections(document) {
  const main = document.querySelector('#main') || document.body;
  // Sections live both directly under #main and under #main > div.content_container.
  // Collect the top-level <section> elements from both levels, in document order.
  const sections = [];
  [...main.children].forEach((child) => {
    if (child.tagName === 'SECTION') {
      sections.push(child);
    } else if (child.matches && child.matches('div.content_container, div')) {
      [...child.children].forEach((gc) => {
        if (gc.tagName === 'SECTION') sections.push(gc);
      });
    }
  });
  // Fallback: if the structure was unexpected, grab any top-level sections.
  if (sections.length === 0) {
    return [...main.querySelectorAll(':scope section')];
  }
  return sections;
}

// EXPORT
export default {
  transform: (payload) => {
    const {
      document, url, params,
    } = payload;

    const main = document.body;

    // 1. Cleanup (remove chrome/modals).
    executeTransformers('beforeTransform', main, payload);

    // 2. Route each top-level content section to a block parser by content,
    //    gated by the page's allow-list so prose sections are never mis-routed.
    const allowed = allowedFor(params.originalURL);
    const sections = findContentSections(document);
    const applied = [];
    sections.forEach((section) => {
      if (!section.parentNode) return;
      let blockName = classifySection(section);
      if (!blockName) return; // default content — leave as-is
      // Gate: only apply a block the page's analysis approved. 'accordion'
      // (boilerplate) maps to the accordion-doc-links parser (same table shape).
      if (allowed) {
        const ok = allowed.includes(blockName)
          || (blockName === 'accordion-doc-links' && allowed.includes('accordion'));
        if (!ok) return; // not approved for this page → leave as default content
      }
      const parser = parsers[blockName];
      if (!parser) return;
      try {
        // insert a section break before this block so it lands in its own section
        const hr = document.createElement('hr');
        section.before(hr);
        parser(section, { document, url, params });
        applied.push(blockName);
      } catch (e) {
        console.error(`Failed to parse ${blockName}:`, e);
      }
    });

    // 3. Cleanup (remove remaining chrome).
    executeTransformers('afterTransform', main, payload);

    // 4. WebImporter built-in rules.
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5. Inject theme + fragment-location metadata.
    ensureExtraMetadata(main, document, {
      theme: 'north-carolina',
      nav: '/fragments/nav',
      footer: '/fragments/footer',
    });

    // 6. Sanitized path (map root URL to /index).
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: applied,
      },
    }];
  },
};

/**
 * Add theme / nav / footer rows to the Metadata block (or create it).
 */
function ensureExtraMetadata(main, document, entries) {
  const tables = [...main.querySelectorAll('table')];
  const metaTable = tables.reverse().find((t) => {
    const firstCell = t.querySelector('tr td, tr th');
    return firstCell && firstCell.textContent.trim().toLowerCase() === 'metadata';
  });

  const buildRow = (key, value) => {
    const tr = document.createElement('tr');
    const keyCell = document.createElement('td');
    keyCell.textContent = key;
    const valCell = document.createElement('td');
    valCell.textContent = value;
    tr.append(keyCell, valCell);
    return tr;
  };

  if (metaTable) {
    Object.entries(entries).forEach(([key, value]) => {
      const rows = [...metaTable.querySelectorAll('tr')];
      const existing = rows.find((r) => {
        const c = r.querySelector('td, th');
        return c && c.textContent.trim().toLowerCase() === key.toLowerCase();
      });
      if (existing) {
        const cells = existing.querySelectorAll('td, th');
        if (cells[1]) cells[1].textContent = value;
      } else {
        (metaTable.querySelector('tbody') || metaTable).appendChild(buildRow(key, value));
      }
    });
    return;
  }

  const block = WebImporter.Blocks.getMetadataBlock(document, entries);
  main.appendChild(block);
}

/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroWelcomeParser from './parsers/hero-welcome.js';
import cardsIconLinksParser from './parsers/cards-icon-links.js';
import cardsFeaturedParser from './parsers/cards-featured.js';
import columnsLinkListsParser from './parsers/columns-link-lists.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/healthybluenc-cleanup.js';
import sectionsTransformer from './transformers/healthybluenc-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-welcome': heroWelcomeParser,
  'cards-icon-links': cardsIconLinksParser,
  'cards-featured': cardsFeaturedParser,
  'columns-link-lists': columnsLinkListsParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'north-carolina-provider',
  description: 'Healthy Blue NC Medicaid provider portal home page: welcome hero over a lifestyle photo, an icon-link quick-action bar, default-content sections for provider news / Medicaid expansion / Availity access / email sign-up, a featured-resources cards grid, a two-column tools & resources link directory, a join-network CTA, and accreditation seals.',
  urls: [
    'https://provider.healthybluenc.com/north-carolina-provider/home',
  ],
  blocks: [
    {
      name: 'hero-welcome',
      instances: [
        '.wide_image',
        'body > main > div.container.home_page > section.wide_image',
      ],
    },
    {
      name: 'cards-icon-links',
      instances: [
        '.information_links',
        '#main > div.content_container > section.information_links',
      ],
    },
    {
      name: 'cards-featured',
      instances: [
        '.content_column_3',
        '#main > div.content_container > section.content_column_3',
      ],
    },
    {
      name: 'columns-link-lists',
      instances: [
        '.tools_resources',
        '#main > div.content_container > section.center.tools_resources',
      ],
    },
  ],
  sections: [
    {
      id: 'rc2',
      name: 'Welcome hero',
      selector: ['.wide_image', 'body > main > div.container.home_page > section.wide_image'],
      style: null,
      blocks: ['hero-welcome'],
      defaultContent: [],
    },
    {
      id: 'rc3',
      name: 'Quick-action icon links',
      selector: ['.information_links', '#main > div.content_container > section.information_links'],
      style: 'grey',
      blocks: ['cards-icon-links'],
      defaultContent: [],
    },
    {
      id: 'rc4',
      name: 'Provider News',
      selector: ['.content_column_1:nth-of-type(2)', '#main > div.content_container > section.content_column_1:nth-of-type(2)'],
      style: null,
      blocks: [],
      defaultContent: ['#main > div.content_container > section.content_column_1:nth-of-type(2)'],
    },
    {
      id: 'rc5',
      name: 'Medicaid Expansion Tools and Resources',
      selector: ['.content_column_1:nth-of-type(3)', '#main > div.content_container > section.content_column_1:nth-of-type(3)'],
      style: 'grey',
      blocks: [],
      defaultContent: ['#main > div.content_container > section.content_column_1:nth-of-type(3)'],
    },
    {
      id: 'rc6',
      name: 'Availity access',
      selector: ['.content_column_1:nth-of-type(4)', '#main > div.content_container > section.content_column_1:nth-of-type(4)'],
      style: null,
      blocks: [],
      defaultContent: ['#main > div.content_container > section.content_column_1:nth-of-type(4)'],
    },
    {
      id: 'rc7',
      name: 'Email sign-up CTA',
      selector: ['.content_column_1:nth-of-type(5)', '#main > div.content_container > section.content_column_1:nth-of-type(5)'],
      style: 'grey',
      blocks: [],
      defaultContent: ['#main > div.content_container > section.content_column_1:nth-of-type(5)'],
    },
    {
      id: 'rc8',
      name: 'Featured resources',
      selector: ['.content_column_3', '#main > div.content_container > section.content_column_3'],
      style: null,
      blocks: ['cards-featured'],
      defaultContent: ['#main > div.content_container > section.content_column_3'],
    },
    {
      id: 'rc9',
      name: 'Provider tools & resources',
      selector: ['.tools_resources', '#main > div.content_container > section.center.tools_resources'],
      style: null,
      blocks: ['columns-link-lists'],
      defaultContent: ['#main > div.content_container > section.center.tools_resources'],
    },
    {
      id: 'rc10',
      name: 'Join network CTA',
      selector: ['.call_to_action', '#main > div.content_container > section.call_to_action'],
      style: 'grey',
      blocks: [],
      defaultContent: ['#main > div.content_container > section.call_to_action'],
    },
    {
      id: 'rc11',
      name: 'Accreditation seals',
      selector: ['.content_column_1:nth-of-type(9)', '#main > div.content_container > section.content_column_1:nth-of-type(9)'],
      style: null,
      blocks: [],
      defaultContent: ['#main > div.content_container > section.content_column_1:nth-of-type(9)'],
    },
  ],
};

// TRANSFORMER REGISTRY - cleanup first, then sections (only when 2+ sections)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  const seen = new Set();

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        if (seen.has(element)) return; // avoid double-matching across fallback selectors
        seen.add(element);
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

/**
 * Ensure the page carries the given metadata rows on its Metadata block:
 *   - theme: north-carolina  → activates body.north-carolina design tokens
 *   - nav: /fragments/nav     → nav fragment location
 *   - footer: /fragments/footer → footer fragment location
 * Adds each row (or updates it if already present) on the Metadata block that
 * WebImporter.rules.createMetadata already appended to `main`.
 */
function ensureExtraMetadata(main, document, entries) {
  // The Metadata block is the last table whose first cell reads "Metadata".
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
        // Append to <tbody> when present, otherwise to the table element itself.
        (metaTable.querySelector('tbody') || metaTable).appendChild(buildRow(key, value));
      }
    });
    return;
  }

  // No metadata block existed — create one via the helper.
  const block = WebImporter.Blocks.getMetadataBlock(document, entries);
  main.appendChild(block);
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block; skip elements already replaced by a prior parser
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5b. Inject theme + fragment-location metadata.
    ensureExtraMetadata(main, document, {
      theme: 'north-carolina',
      nav: '/fragments/nav',
      footer: '/fragments/footer',
    });

    // 6. Generate sanitized path (map root URL to /index)
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
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};

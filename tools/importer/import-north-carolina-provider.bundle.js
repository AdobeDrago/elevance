/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-north-carolina-provider.js
  var import_north_carolina_provider_exports = {};
  __export(import_north_carolina_provider_exports, {
    default: () => import_north_carolina_provider_default
  });

  // tools/importer/parsers/hero-welcome.js
  function parse(element, { document: document2 }) {
    const bgImage = element.querySelector(":scope > img, img");
    const contentEl = element.querySelector(".welcome_content, article, .center");
    const scope = contentEl || element;
    const heading = scope.querySelector("h1, h2, .welcome");
    const copy = scope.querySelector(".welcome_copy");
    const contentCell = [];
    if (heading) contentCell.push(heading);
    if (copy) {
      contentCell.push(...copy.children);
    } else {
      const rest = Array.from(scope.querySelectorAll(":scope > *")).filter((el) => el !== heading && el.tagName !== "IMG");
      contentCell.push(...rest);
    }
    if (!bgImage && contentCell.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (bgImage) cells.push([bgImage]);
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document2, { name: "hero-welcome", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-icon-links.js
  function parse2(element, { document: document2 }) {
    const links = Array.from(element.querySelectorAll(":scope > a, a"));
    const cells = [];
    links.forEach((link) => {
      const icon = link.querySelector("img");
      const labelDiv = link.querySelector(".information_link > div:last-child, div > div");
      const labelText = (labelDiv ? labelDiv.textContent : link.textContent).trim();
      const labelLink = document2.createElement("a");
      labelLink.setAttribute("href", link.getAttribute("href") || "#");
      labelLink.textContent = labelText;
      const iconCell = icon || "";
      cells.push([iconCell, labelLink]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-icon-links", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-featured.js
  function parse3(element, { document: document2 }) {
    const cards = Array.from(element.querySelectorAll("section.content_column, .content_column"));
    const cells = [];
    cards.forEach((card) => {
      const image = card.querySelector("img");
      const body = card.querySelector(":scope > div, div");
      const bodyCell = [];
      if (body) {
        bodyCell.push(...body.children);
      } else {
        const heading = card.querySelector("h2, h3, h4");
        const paras = Array.from(card.querySelectorAll("p"));
        if (heading) bodyCell.push(heading);
        bodyCell.push(...paras);
      }
      cells.push([image || "", bodyCell]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-featured", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-link-lists.js
  function parse4(element, { document: document2 }) {
    const lists = Array.from(element.querySelectorAll("ul"));
    if (lists.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const row = lists.map((list) => list);
    const cells = [row];
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns-link-lists", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/healthybluenc-cleanup.js
  var H = { before: "beforeTransform", after: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === H.before) {
      WebImporter.DOMUtils.remove(element, [
        ".search-area",
        ".modal",
        ".modal_background",
        ".email-optin-modal"
      ]);
    }
    if (hookName === H.after) {
      WebImporter.DOMUtils.remove(element, [
        "a.skip",
        "header#header",
        "nav#navigation",
        "footer#footer",
        "iframe",
        "link",
        "noscript"
      ]);
    }
  }

  // tools/importer/transformers/healthybluenc-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function querySection(root, selectors) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    const sections = payload.template && payload.template.sections || [];
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (i === 0 && !section.style) continue;
        const sectionEl = querySection(element, section.selector);
        if (!sectionEl) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || querySection(element, section.selector);
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // tools/importer/import-north-carolina-provider.js
  var parsers = {
    "hero-welcome": parse,
    "cards-icon-links": parse2,
    "cards-featured": parse3,
    "columns-link-lists": parse4
  };
  var PAGE_TEMPLATE = {
    name: "north-carolina-provider",
    description: "Healthy Blue NC Medicaid provider portal home page: welcome hero over a lifestyle photo, an icon-link quick-action bar, default-content sections for provider news / Medicaid expansion / Availity access / email sign-up, a featured-resources cards grid, a two-column tools & resources link directory, a join-network CTA, and accreditation seals.",
    urls: [
      "https://provider.healthybluenc.com/north-carolina-provider/home"
    ],
    blocks: [
      {
        name: "hero-welcome",
        instances: [
          ".wide_image",
          "body > main > div.container.home_page > section.wide_image"
        ]
      },
      {
        name: "cards-icon-links",
        instances: [
          ".information_links",
          "#main > div.content_container > section.information_links"
        ]
      },
      {
        name: "cards-featured",
        instances: [
          ".content_column_3",
          "#main > div.content_container > section.content_column_3"
        ]
      },
      {
        name: "columns-link-lists",
        instances: [
          ".tools_resources",
          "#main > div.content_container > section.center.tools_resources"
        ]
      }
    ],
    sections: [
      {
        id: "rc2",
        name: "Welcome hero",
        selector: [".wide_image", "body > main > div.container.home_page > section.wide_image"],
        style: null,
        blocks: ["hero-welcome"],
        defaultContent: []
      },
      {
        id: "rc3",
        name: "Quick-action icon links",
        selector: [".information_links", "#main > div.content_container > section.information_links"],
        style: "grey",
        blocks: ["cards-icon-links"],
        defaultContent: []
      },
      {
        id: "rc4",
        name: "Provider News",
        selector: [".content_column_1:nth-of-type(2)", "#main > div.content_container > section.content_column_1:nth-of-type(2)"],
        style: null,
        blocks: [],
        defaultContent: ["#main > div.content_container > section.content_column_1:nth-of-type(2)"]
      },
      {
        id: "rc5",
        name: "Medicaid Expansion Tools and Resources",
        selector: [".content_column_1:nth-of-type(3)", "#main > div.content_container > section.content_column_1:nth-of-type(3)"],
        style: "grey",
        blocks: [],
        defaultContent: ["#main > div.content_container > section.content_column_1:nth-of-type(3)"]
      },
      {
        id: "rc6",
        name: "Availity access",
        selector: [".content_column_1:nth-of-type(4)", "#main > div.content_container > section.content_column_1:nth-of-type(4)"],
        style: null,
        blocks: [],
        defaultContent: ["#main > div.content_container > section.content_column_1:nth-of-type(4)"]
      },
      {
        id: "rc7",
        name: "Email sign-up CTA",
        selector: [".content_column_1:nth-of-type(5)", "#main > div.content_container > section.content_column_1:nth-of-type(5)"],
        style: "grey",
        blocks: [],
        defaultContent: ["#main > div.content_container > section.content_column_1:nth-of-type(5)"]
      },
      {
        id: "rc8",
        name: "Featured resources",
        selector: [".content_column_3", "#main > div.content_container > section.content_column_3"],
        style: null,
        blocks: ["cards-featured"],
        defaultContent: ["#main > div.content_container > section.content_column_3"]
      },
      {
        id: "rc9",
        name: "Provider tools & resources",
        selector: [".tools_resources", "#main > div.content_container > section.center.tools_resources"],
        style: null,
        blocks: ["columns-link-lists"],
        defaultContent: ["#main > div.content_container > section.center.tools_resources"]
      },
      {
        id: "rc10",
        name: "Join network CTA",
        selector: [".call_to_action", "#main > div.content_container > section.call_to_action"],
        style: "grey",
        blocks: [],
        defaultContent: ["#main > div.content_container > section.call_to_action"]
      },
      {
        id: "rc11",
        name: "Accreditation seals",
        selector: [".content_column_1:nth-of-type(9)", "#main > div.content_container > section.content_column_1:nth-of-type(9)"],
        style: null,
        blocks: [],
        defaultContent: ["#main > div.content_container > section.content_column_1:nth-of-type(9)"]
      }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    const seen = /* @__PURE__ */ new Set();
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
        elements.forEach((element) => {
          if (seen.has(element)) return;
          seen.add(element);
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  function ensureThemeMetadata(main, document2, theme) {
    const tables = [...main.querySelectorAll("table")];
    const metaTable = tables.reverse().find((t) => {
      const firstCell = t.querySelector("tr td, tr th");
      return firstCell && firstCell.textContent.trim().toLowerCase() === "metadata";
    });
    const buildRow = () => {
      const tr = document2.createElement("tr");
      const keyCell = document2.createElement("td");
      keyCell.textContent = "theme";
      const valCell = document2.createElement("td");
      valCell.textContent = theme;
      tr.append(keyCell, valCell);
      return tr;
    };
    if (metaTable) {
      const rows = [...metaTable.querySelectorAll("tr")];
      const existing = rows.find((r) => {
        const c = r.querySelector("td, th");
        return c && c.textContent.trim().toLowerCase() === "theme";
      });
      if (existing) {
        const cells = existing.querySelectorAll("td, th");
        if (cells[1]) cells[1].textContent = theme;
      } else {
        (metaTable.querySelector("tbody") || metaTable).appendChild(buildRow());
      }
      return;
    }
    const block = WebImporter.Blocks.getMetadataBlock(document2, { theme });
    main.appendChild(block);
  }
  var import_north_carolina_provider_default = {
    transform: (payload) => {
      const {
        document: document2,
        url,
        html,
        params
      } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document2.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      ensureThemeMetadata(main, document2, "north-carolina");
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_north_carolina_provider_exports);
})();

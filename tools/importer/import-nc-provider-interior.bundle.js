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

  // tools/importer/import-nc-provider-interior.js
  var import_nc_provider_interior_exports = {};
  __export(import_nc_provider_interior_exports, {
    default: () => import_nc_provider_interior_default
  });

  // tools/importer/parsers/hero-banner.js
  function parse(element, { document }) {
    const image = element.querySelector(":scope > picture, :scope > img, .wide_image > picture, .wide_image > img");
    const heading = element.querySelector("h1.subpage-header, h1, h2");
    if (!image && !heading) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (image) cells.push([image]);
    const contentCell = [];
    if (heading) contentCell.push(heading);
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-banner", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-icon-links.js
  function parse2(element, { document }) {
    const links = Array.from(element.querySelectorAll(":scope > a, a"));
    const cells = [];
    links.forEach((link) => {
      const icon = link.querySelector("img");
      const labelDiv = link.querySelector(".information_link > div:last-child, div > div");
      const labelText = (labelDiv ? labelDiv.textContent : link.textContent).trim();
      const labelLink = document.createElement("a");
      labelLink.setAttribute("href", link.getAttribute("href") || "#");
      labelLink.textContent = labelText;
      const iconCell = icon || "";
      cells.push([iconCell, labelLink]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-icon-links", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-topics.js
  function parse3(element, { document }) {
    const cards = Array.from(element.querySelectorAll("section.content_column"));
    const cells = [];
    if (cards.length > 0) {
      cards.forEach((card) => {
        const body = card.querySelector(":scope > div");
        const bodyCell = [];
        if (body) {
          bodyCell.push(...body.children);
        } else {
          const heading = card.querySelector("h2, h3, h4");
          if (heading) bodyCell.push(heading);
          bodyCell.push(...card.querySelectorAll(":scope > p, :scope > div"));
        }
        if (bodyCell.length) cells.push([bodyCell]);
      });
    } else {
      const scope = element.querySelector(".within_brdr, :scope > div") || element;
      Array.from(scope.children).forEach((child) => {
        if (/^(H[2-4]|P|DIV)$/.test(child.tagName)) cells.push([[child]]);
      });
    }
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-topics", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-promo.js
  function parse4(element, { document }) {
    const columns = Array.from(element.querySelectorAll(":scope > .within_brdr > section.content_column, :scope > section.content_column, section.content_column"));
    const image = columns.map((c) => c.querySelector("img")).find(Boolean) || element.querySelector("img");
    const bodyCol = columns.find((c) => !c.querySelector("img") && c.querySelector("h1, h2, h3, h4, p, a")) || columns.find((c) => c.querySelector("h1, h2, h3, h4"));
    const bodyCell = [];
    if (bodyCol) {
      const wrapper = bodyCol.querySelector(":scope > div");
      if (wrapper) bodyCell.push(...wrapper.children);
      else bodyCell.push(...bodyCol.children);
    }
    if (!image && bodyCell.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [[image || "", bodyCell]];
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-resource-grid.js
  function parse5(element, { document }) {
    let cards = Array.from(element.querySelectorAll("article"));
    if (cards.length === 0) {
      cards = Array.from(element.querySelectorAll("section.content_column"));
    }
    const cells = [];
    cards.forEach((card) => {
      const body = card.querySelector(":scope > div");
      const bodyCell = [];
      if (body) {
        bodyCell.push(...body.children);
      } else {
        const heading = card.querySelector("h2, h3, h4");
        if (heading) bodyCell.push(heading);
        bodyCell.push(...card.querySelectorAll(":scope > p, :scope > a"));
      }
      if (bodyCell.length) cells.push([bodyCell]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-resource-grid", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-content.js
  function parse6(element, { document }) {
    const columns = Array.from(element.querySelectorAll(":scope > .within_brdr > section.content_column, :scope > section.content_column, section.content_column"));
    if (columns.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const row = columns.map((col) => {
      const wrapper = col.querySelector(":scope > div");
      return wrapper ? Array.from(wrapper.children) : Array.from(col.children);
    });
    const cells = [row];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-content", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-doc-library.js
  function parse7(element, { document }) {
    const columns = Array.from(element.querySelectorAll(":scope > .within_brdr > section.content_column, :scope > section.content_column, section.content_column"));
    if (columns.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const row = columns.map((col) => {
      const wrapper = col.querySelector(":scope > div");
      return wrapper ? Array.from(wrapper.children) : Array.from(col.children);
    });
    const cells = [row];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-doc-library", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-link-lists.js
  function parse8(element, { document }) {
    const lists = Array.from(element.querySelectorAll("ul"));
    if (lists.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const row = lists.map((list) => list);
    const cells = [row];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-link-lists", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/accordion-doc-links.js
  function parse9(element, { document }) {
    const items = Array.from(element.querySelectorAll(".mp-accordion__item, .accordion-item"));
    const cells = [];
    items.forEach((item) => {
      const titleEl = item.querySelector(".mp-accordion__title, .accordion-title");
      const contentEl = item.querySelector(".mp-accordion__content, .accordion-content");
      const titleCell = [];
      if (titleEl) {
        const label = titleEl.querySelector("span");
        titleCell.push(label || titleEl);
      }
      const bodyCell = contentEl ? Array.from(contentEl.childNodes) : [];
      cells.push([titleCell, bodyCell]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "accordion-doc-links", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/table-news-archive.js
  function parse10(element, { document }) {
    const listRoot = element.querySelector(".tab_pdfs, .archive-list") || element;
    const items = Array.from(listRoot.querySelectorAll(":scope > div")).filter((div) => div.querySelector("a"));
    const activeTab = element.querySelector(".tab_list .highlighted_tab span, .tab_list li span");
    const categoryLabel = activeTab && activeTab.textContent.trim() || "All";
    const cells = [];
    items.forEach((item) => {
      const link = item.querySelector("a");
      if (!link) return;
      const dateDiv = Array.from(item.children).find((child) => child.tagName === "DIV" && !child.classList.contains("pdfs"));
      const dateText = dateDiv && dateDiv.textContent.trim() || "";
      cells.push([link, dateText, categoryLabel]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "table-news-archive", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/prior-auth-lookup.js
  function parse11(element, { document }) {
    const cells = [
      ["Data Source", ""],
      ["Markets", "North Carolina"],
      ["North Carolina", "Medicaid, CFSP \u2014 Healthy Blue Care Together"]
    ];
    const block = WebImporter.Blocks.createBlock(document, { name: "prior-auth-lookup", cells });
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

  // tools/importer/import-nc-provider-interior.js
  var parsers = {
    "hero-banner": parse,
    "cards-icon-links": parse2,
    "cards-topics": parse3,
    "cards-promo": parse4,
    "cards-resource-grid": parse5,
    "columns-content": parse6,
    "columns-doc-library": parse7,
    "columns-link-lists": parse8,
    "accordion-doc-links": parse9,
    "table-news-archive": parse10,
    "prior-auth-lookup": parse11
  };
  var PAGE_TEMPLATE = { name: "nc-provider-interior" };
  var ALLOWED_BLOCKS = {
    "/north-carolina-provider/archives": ["columns-link-lists", "table-news-archive"],
    "/north-carolina-provider/behavioral-health": ["columns-link-lists"],
    "/north-carolina-provider/benefits-partners": ["columns-link-lists"],
    "/north-carolina-provider/care-management": ["columns-link-lists"],
    "/north-carolina-provider/claims-submissions-and-disputes": ["columns-link-lists"],
    "/north-carolina-provider/claims": ["cards-icon-links", "cards-topics", "columns-link-lists", "hero-banner"],
    "/north-carolina-provider/cme": ["cards-topics", "columns-link-lists", "hero-banner"],
    "/north-carolina-provider/communications": ["cards-icon-links", "columns-link-lists", "hero-banner"],
    "/north-carolina-provider/condition-care": ["columns-link-lists"],
    "/north-carolina-provider/contact-us": [],
    "/north-carolina-provider/patient-care/critical-incidents": ["columns-link-lists", "hero-banner"],
    "/north-carolina-provider/early-periodic-screening-diagnostic-treatment": ["columns-link-lists"],
    "/north-carolina-provider/electronic-data-interchange": ["columns-content", "columns-link-lists"],
    "/north-carolina-provider/eligibility-provider-reports": ["columns-link-lists"],
    "/north-carolina-provider/enhanced-personal-health-care-program": ["columns-link-lists", "hero-banner"],
    "/north-carolina-provider/forms": ["columns-link-lists"],
    "/north-carolina-provider/guide-to-drug-coverage-under-medical-benefit": ["columns-link-lists"],
    "/north-carolina-provider/health-education": ["columns-link-lists"],
    "/north-carolina-provider/hedis": ["columns-link-lists"],
    "/north-carolina-provider/join-our-network": ["cards-icon-links", "cards-promo", "columns-link-lists"],
    "/north-carolina-provider/learn-about-availity": ["accordion", "columns-link-lists"],
    "/north-carolina-provider/manuals-and-guides": ["columns-link-lists"],
    "/north-carolina-provider/maternal-child-services": ["columns-link-lists"],
    "/north-carolina-provider/medical-management": ["columns-link-lists"],
    "/north-carolina-provider/medical-policies-and-clinical-guidelines": ["accordion-doc-links", "columns-link-lists"],
    "/north-carolina-provider/member-eligibility-and-pharmacy": ["cards-icon-links", "cards-promo", "columns-link-lists"],
    "/north-carolina-provider/patient-care": ["cards-icon-links", "cards-promo", "columns-link-lists"],
    "/north-carolina-provider/pharmacy": ["columns-link-lists"],
    "/north-carolina-provider/physician-administered-drug-program": ["columns-link-lists"],
    "/north-carolina-provider/prior-authorization-lookup": ["columns-link-lists", "prior-auth-lookup"],
    "/north-carolina-provider/prior-authorization": ["columns-content", "columns-link-lists"],
    "/north-carolina-provider/privacy-policies": [],
    "/north-carolina-provider/quality-management": ["columns-link-lists", "hero-banner"],
    "/north-carolina-provider/referrals": ["columns-link-lists"],
    "/north-carolina-provider/reimbursement-policies": ["accordion-doc-links", "columns-link-lists"],
    "/north-carolina-provider/reimbursement-policy-definitions": ["columns-link-lists", "hero-banner"],
    "/north-carolina-provider/reimbursement-policy-disclaimer": ["columns-link-lists"],
    "/north-carolina-provider/resource-library": ["columns-link-lists"],
    "/north-carolina-provider/resources": ["cards-icon-links", "cards-promo", "cards-resource-grid", "columns-link-lists"],
    "/north-carolina-provider/rights-and-responsibilities": ["columns-link-lists"],
    "/north-carolina-provider/sbirt": ["cards-topics", "columns-content", "columns-link-lists"],
    "/north-carolina-provider/schedules-registration": ["columns-link-lists"],
    "/north-carolina-provider/serving-diverse-populations": ["cards-resource-grid", "cards-topics", "columns-link-lists", "hero-banner"],
    "/north-carolina-provider/terms-of-use": [],
    "/north-carolina-provider/total-member-view": ["columns-link-lists"],
    "/north-carolina-provider/training-academy": ["columns-link-lists", "hero-banner"],
    "/north-carolina-provider/training-resources": ["columns-content", "columns-link-lists"]
  };
  function allowedFor(originalURL) {
    try {
      const p = new URL(originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      return ALLOWED_BLOCKS[p] || null;
    } catch (e) {
      return null;
    }
  }
  var transformers = [transform];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((fn) => {
      try {
        fn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function classifySection(section) {
    const cls = section.className || "";
    const text = (section.textContent || "").toLowerCase();
    if (cls.includes("information_links")) {
      return "cards-icon-links";
    }
    if (cls.includes("mp-accordion") || section.querySelector(".mp-accordion, .accordions, .accordion-item")) {
      return "accordion-doc-links";
    }
    if (cls.includes("tools_resources")) {
      return "columns-link-lists";
    }
    if (cls.includes("wide_image")) {
      return "hero-banner";
    }
    const isAngular = cls.includes("angular-form-content") || section.querySelector('.angular-form-content, [class*="angular-form"]');
    if (isAngular) {
      const hasLoadMore = /load more/.test(text);
      const hasArchiveTabs = /provider newsletter/.test(text) && /medicaid news/.test(text);
      const hasLookupControls = /line of business/.test(text) || /market/.test(text) && /(cpt|hcpcs|drug)/.test(text);
      if (hasLoadMore || hasArchiveTabs) return "table-news-archive";
      if (hasLookupControls) return "prior-auth-lookup";
      return "table-news-archive";
    }
    if (section.querySelector(".archive-list, .load-more") || /load more/.test(text)) {
      return "table-news-archive";
    }
    const h1 = section.querySelector("h1.subpage-header, h1");
    if (h1) {
      const h1Text = (h1.textContent || "").trim();
      const sectionText = text.trim();
      if (sectionText.length <= h1Text.length + 40) {
        return "hero-banner";
      }
    }
    const pics = section.querySelectorAll("picture, img");
    const articles = section.querySelectorAll("article");
    const uls = section.querySelectorAll("ul");
    const headings = section.querySelectorAll("h2, h3, h4");
    const buttons = section.querySelectorAll("a.button, .button-container a, button");
    if (pics.length >= 1 && buttons.length >= 1 && headings.length >= 1) {
      return "cards-promo";
    }
    if (pics.length === 0 && articles.length >= 2 && buttons.length >= 2) {
      return "cards-resource-grid";
    }
    if (pics.length === 0 && headings.length >= 2 && buttons.length === 0 && section.querySelectorAll("a").length >= 2) {
      const cols = section.querySelectorAll(":scope > div > div");
      if (cols.length >= 2) return "cards-topics";
    }
    if (pics.length === 0 && headings.length >= 2 && uls.length >= 2 && section.querySelectorAll("a").length >= 6) {
      return "columns-doc-library";
    }
    if (pics.length === 0 && headings.length >= 1) {
      const topDivs = section.querySelectorAll(":scope > div > div");
      if (topDivs.length === 2) return "columns-content";
    }
    return null;
  }
  function findContentSections(document) {
    const main = document.querySelector("#main") || document.body;
    const sections = [];
    [...main.children].forEach((child) => {
      if (child.tagName === "SECTION") {
        sections.push(child);
      } else if (child.matches && child.matches("div.content_container, div")) {
        [...child.children].forEach((gc) => {
          if (gc.tagName === "SECTION") sections.push(gc);
        });
      }
    });
    if (sections.length === 0) {
      return [...main.querySelectorAll(":scope section")];
    }
    return sections;
  }
  var import_nc_provider_interior_default = {
    transform: (payload) => {
      const {
        document,
        url,
        params
      } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const allowed = allowedFor(params.originalURL);
      const sections = findContentSections(document);
      const applied = [];
      sections.forEach((section) => {
        if (!section.parentNode) return;
        let blockName = classifySection(section);
        if (!blockName) return;
        if (allowed) {
          const ok = allowed.includes(blockName) || blockName === "accordion-doc-links" && allowed.includes("accordion");
          if (!ok) return;
        }
        const parser = parsers[blockName];
        if (!parser) return;
        try {
          const hr2 = document.createElement("hr");
          section.before(hr2);
          parser(section, { document, url, params });
          applied.push(blockName);
        } catch (e) {
          console.error(`Failed to parse ${blockName}:`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      ensureExtraMetadata(main, document, {
        theme: "north-carolina",
        nav: "/fragments/nav",
        footer: "/fragments/footer"
      });
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: applied
        }
      }];
    }
  };
  function ensureExtraMetadata(main, document, entries) {
    const tables = [...main.querySelectorAll("table")];
    const metaTable = tables.reverse().find((t) => {
      const firstCell = t.querySelector("tr td, tr th");
      return firstCell && firstCell.textContent.trim().toLowerCase() === "metadata";
    });
    const buildRow = (key, value) => {
      const tr = document.createElement("tr");
      const keyCell = document.createElement("td");
      keyCell.textContent = key;
      const valCell = document.createElement("td");
      valCell.textContent = value;
      tr.append(keyCell, valCell);
      return tr;
    };
    if (metaTable) {
      Object.entries(entries).forEach(([key, value]) => {
        const rows = [...metaTable.querySelectorAll("tr")];
        const existing = rows.find((r) => {
          const c = r.querySelector("td, th");
          return c && c.textContent.trim().toLowerCase() === key.toLowerCase();
        });
        if (existing) {
          const cells = existing.querySelectorAll("td, th");
          if (cells[1]) cells[1].textContent = value;
        } else {
          (metaTable.querySelector("tbody") || metaTable).appendChild(buildRow(key, value));
        }
      });
      return;
    }
    const block = WebImporter.Blocks.getMetadataBlock(document, entries);
    main.appendChild(block);
  }
  return __toCommonJS(import_nc_provider_interior_exports);
})();

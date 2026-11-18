/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
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

  // tools/importer/import-library-templates.js
  var import_library_templates_exports = {};
  __export(import_library_templates_exports, {
    default: () => import_library_templates_default
  });
  var SITES = {
    "main--elevance--adobedrago.aem.page": {
      label: "Elevance",
      titleSuffix: " | Blue Medicare Advantage",
      metadata: {}
    },
    "main--elevance-nc--adobedrago.aem.page": {
      label: "NC",
      titleSuffix: " | Healthy Blue",
      metadata: {
        theme: "north-carolina",
        nav: "/fragments/nav",
        footer: "/fragments/footer"
      }
    }
  };
  var TEMPLATES = {
    // Elevance (grs-provider) — library at /docs/library/templates/
    "main--elevance--adobedrago.aem.page/grs-provider": {
      name: "home-page",
      path: "/docs/library/templates/home-page",
      title: "Home page"
    },
    "main--elevance--adobedrago.aem.page/grs-provider/join-the-network": {
      name: "interior-overview",
      path: "/docs/library/templates/interior-overview",
      title: "Interior overview"
    },
    "main--elevance--adobedrago.aem.page/grs-provider/policies-manuals-and-guides": {
      name: "document-reference",
      path: "/docs/library/templates/document-reference",
      title: "Document reference"
    },
    "main--elevance--adobedrago.aem.page/grs-provider/benefits-and-pharmacy": {
      name: "content-page",
      path: "/docs/library/templates/content-page",
      title: "Content page"
    },
    // North Carolina — library at /library/templates/ (next to its blocks library)
    "main--elevance-nc--adobedrago.aem.page/north-carolina-provider/home": {
      name: "home-page",
      path: "/library/templates/home-page",
      title: "Home page"
    },
    "main--elevance-nc--adobedrago.aem.page/north-carolina-provider/resources": {
      name: "interior-overview",
      path: "/library/templates/interior-overview",
      title: "Interior overview"
    },
    "main--elevance-nc--adobedrago.aem.page/north-carolina-provider/manuals-and-guides": {
      name: "document-reference",
      path: "/library/templates/document-reference",
      title: "Document reference"
    },
    "main--elevance-nc--adobedrago.aem.page/north-carolina-provider/prior-authorization": {
      name: "content-page",
      path: "/library/templates/content-page",
      title: "Content page"
    }
  };
  var VERBATIM_BLOCKS = ["columns-link-lists", "cta-footer-banner", "section-metadata"];
  var SHARED_HEADING = /provider tools\s*&(amp;)?\s*resources|interested in becoming a provider/i;
  var UNTRIMMED_BLOCKS = ["hero", "hero-welcome", "hero-banner", "columns"];
  var MAX_ROWS = {
    "cards-icon-links": 4,
    "cards-promo": 2,
    "cards-featured": 3,
    "cards-resource-grid": 2,
    "pdf-list": 3,
    "text-link": 2,
    "accordion-doc-links": 2,
    "columns-content": 2
  };
  var DEFAULT_MAX_ROWS = 3;
  var MAX_LIST_ITEMS = 3;
  var MAX_H2_GROUPS = 2;
  var TEXT = {
    h1: "Page title",
    h2: "Section heading",
    h3: "Subsection heading",
    h4: "Heading",
    h5: "Heading",
    h6: "Heading",
    paragraph: "Add a short paragraph here. Replace this placeholder text with your own content.",
    label: "Label",
    link: "Link text",
    button: "Button label",
    item: "List item"
  };
  function templateKey(url) {
    const u = new URL(url);
    return `${u.host}${u.pathname.replace(/\.plain\.html$/, "").replace(/\.html$/, "").replace(/\/$/, "")}`;
  }
  function blockName(el) {
    return [...el.classList][0];
  }
  function isBlock(el) {
    return el.tagName === "DIV" && el.classList.length > 0;
  }
  function isSharedSection(section) {
    const blocks = [...section.children].filter(isBlock).map(blockName);
    if (blocks.some((b) => b === "columns-link-lists" || b === "cta-footer-banner")) return true;
    return [...section.querySelectorAll("h1, h2, h3, h4")].some((h) => SHARED_HEADING.test(h.textContent));
  }
  function onlyChildLink(p) {
    const links = p.querySelectorAll("a");
    if (links.length !== 1) return null;
    return p.textContent.trim() === links[0].textContent.trim() ? links[0] : null;
  }
  function setLink(a, text) {
    a.textContent = text;
    a.setAttribute("href", "#");
    a.removeAttribute("title");
  }
  function placeholderParagraph(p, document) {
    if (p.querySelector("picture, img") && !p.textContent.trim()) return;
    const button = onlyChildLink(p);
    if (button) {
      setLink(button, button.closest("strong, em") ? TEXT.button : TEXT.link);
      return;
    }
    const strongOnly = p.children.length === 1 && p.firstElementChild.tagName === "STRONG" && p.textContent.trim() === p.firstElementChild.textContent.trim();
    const hadLink = p.querySelector("a");
    const pictures = [...p.querySelectorAll("picture")];
    p.textContent = "";
    pictures.forEach((pic) => p.append(pic));
    if (strongOnly) {
      const strong = document.createElement("strong");
      strong.textContent = TEXT.label;
      p.append(strong);
      return;
    }
    p.append(document.createTextNode(TEXT.paragraph));
    if (hadLink) {
      const a = document.createElement("a");
      setLink(a, TEXT.link);
      p.append(document.createTextNode(" "), a, document.createTextNode("."));
    }
  }
  function placeholderize(root, document) {
    root.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
      const text = TEXT[h.tagName.toLowerCase()];
      const a = h.querySelector("a");
      h.removeAttribute("id");
      if (a) {
        setLink(a, text);
        h.textContent = "";
        h.append(a);
      } else {
        h.textContent = text;
      }
    });
    root.querySelectorAll("ul, ol").forEach((list) => {
      [...list.children].slice(MAX_LIST_ITEMS).forEach((li) => li.remove());
      [...list.children].forEach((li) => {
        const a = li.querySelector("a");
        li.textContent = "";
        if (a) {
          setLink(a, TEXT.link);
          li.append(a);
        } else {
          li.textContent = TEXT.item;
        }
      });
    });
    root.querySelectorAll("p").forEach((p) => placeholderParagraph(p, document));
    root.querySelectorAll('a[href]:not([href="#"])').forEach((a) => setLink(a, TEXT.link));
    root.querySelectorAll("div").forEach((cell) => {
      [...cell.childNodes].forEach((n) => {
        if (n.nodeType === 3 && n.textContent.trim()) n.textContent = TEXT.label;
      });
    });
  }
  function trimSection(section) {
    let h2s = 0;
    let dropping = false;
    [...section.children].forEach((el) => {
      if (el.tagName === "H2") {
        h2s += 1;
        dropping = h2s > MAX_H2_GROUPS;
      }
      if (dropping && !isBlock(el)) el.remove();
    });
  }
  function trimBlock(block) {
    var _a;
    const name = blockName(block);
    if (VERBATIM_BLOCKS.includes(name) || UNTRIMMED_BLOCKS.includes(name)) return;
    const max = (_a = MAX_ROWS[name]) != null ? _a : DEFAULT_MAX_ROWS;
    [...block.children].slice(max).forEach((row) => row.remove());
  }
  function toTable(block, document) {
    const [name, ...variants] = [...block.classList];
    const title = variants.length ? `${name} (${variants.join(", ")})` : name;
    const cells = [...block.children].map((row) => [...row.children].map((cell) => [...cell.childNodes]));
    return WebImporter.Blocks.createBlock(document, { name: title, cells });
  }
  function absolutizeImages(root, pageUrl) {
    root.querySelectorAll("picture").forEach((pic) => {
      const img = pic.querySelector("img");
      if (!img) return;
      const src = new URL(img.getAttribute("src"), pageUrl);
      src.search = "";
      const clean = img.ownerDocument.createElement("img");
      clean.setAttribute("src", src.href);
      clean.setAttribute("alt", img.getAttribute("alt") || "");
      pic.replaceWith(clean);
    });
  }
  var import_library_templates_default = {
    transform: (payload) => {
      const { document, params } = payload;
      const sourceUrl = params.originalURL;
      const key = templateKey(sourceUrl);
      const tpl = TEMPLATES[key];
      if (!tpl) throw new Error(`No library template defined for ${key}`);
      const site = SITES[new URL(sourceUrl).host];
      const main = document.body;
      const sections = [...main.children].filter((el) => el.tagName === "DIV" && (el.textContent.trim() || el.querySelector("img, picture")));
      const out = document.createElement("div");
      sections.forEach((section, i) => {
        const shared = isSharedSection(section);
        if (!shared) {
          trimSection(section);
          [...section.children].filter(isBlock).forEach(trimBlock);
          [...section.children].forEach((el) => {
            if (isBlock(el) && VERBATIM_BLOCKS.includes(blockName(el))) return;
            if (isBlock(el)) {
              placeholderize(el, document);
            } else {
              const wrap = document.createElement("div");
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
        if (section.classList.length) {
          section.append(WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: [["style", [...section.classList].join(", ")]]
          }));
        }
        if (i > 0) out.append(document.createElement("hr"));
        out.append(...section.childNodes);
      });
      out.append(document.createElement("hr"));
      out.append(WebImporter.Blocks.getMetadataBlock(document, __spreadValues({
        title: `${TEXT.h1}${site.titleSuffix}`,
        description: "One-sentence page summary for search results. Replace before publishing."
      }, site.metadata)));
      main.textContent = "";
      main.append(...out.childNodes);
      return [{
        element: main,
        path: tpl.path,
        report: { template: `${site.label} \u2013 ${tpl.title}`, source: key }
      }];
    }
  };
  return __toCommonJS(import_library_templates_exports);
})();

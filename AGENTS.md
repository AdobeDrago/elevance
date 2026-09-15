# AGENTS.md — Elevance / Healthy Blue Provider (AEM Edge Delivery Services)

Onboarding guide for anyone (human or agent) picking up this project. It captures
the **repoless multi-site** setup, the **theme-scoped design system**, the **block
library**, and the **content-migration pipeline** so you can continue the work
without re-deriving it.

---

## 1. What this repo is

A single AEM Edge Delivery Services (EDS / "Franklin" / Helix) codebase that serves
**multiple provider sites from one repo** ("repoless" multi-site). Content lives in
**Document Authoring (DA)**, not in this git repo.

- **Project type:** `da` (Document Authoring). See `.migration/project.json`.
- **Org:** `adobedrago`
- **Sites** (each is a DA content space under the same code):
  | Site key | Preview org/site | Content host | Source site migrated from |
  |----------|------------------|--------------|---------------------------|
  | `elevance` (aka grs-provider) | adobedrago / elevance | content.da.live/adobedrago/elevance/ | provider.bluemedadvgrhs.com/grs-provider |
  | `elevance-nc` (North Carolina) | adobedrago / elevance-nc | content.da.live/adobedrago/elevance-nc/ | provider.healthybluenc.com/north-carolina-provider |
- **Active site for recent work:** `elevance-nc` (`migration-work/profile.json`).
- There is intentionally **no `fstab.yaml`** — in this repoless multi-site setup
  the active site / content mount is resolved by tooling and per-site config
  (`.migration/project.json`, `migration-work/profile.json`), not by a single
  `fstab` mountpoint. Do not re-add one.

> ⚠️ **Both source sites are bot-protected.** Scraping/import uses a Bright Data
> fallback and cached snapshots under `tools/importer/bd-snapshots/`.

---

## 2. THE golden rule — repoless CSS scoping

**Every site-specific CSS rule MUST be scoped under a `body.<site-theme>` class.**
Because all sites share this one codebase, an unscoped `.hero-banner { … }` rule
would leak across sites. Scope it: `body.north-carolina .hero-banner { … }`.

- The North Carolina site uses the theme class **`north-carolina`**.
- This applies to **block CSS, base/element overrides, media queries, and
  pseudo-classes** — no exceptions. There must be **zero** unscoped block/element
  selectors for a site.
- Quick audit (should print nothing but `0`s):
  ```bash
  for f in blocks/*/*.css; do
    n=$(grep -nE '^\s*\.[a-z]' "$f" | grep -v 'body\.north-carolina' | wc -l)
    [ "$n" -ne 0 ] && echo "UNSCOPED in $f: $n"
  done; echo done
  ```
  (Shared boilerplate blocks predating the multi-site split — e.g. `cards`,
  `columns`, `hero` — may still have `:root`/unscoped rules; the **NC variants**
  listed in §4 must all be scoped.)

### How the theme class gets onto `<body>`
Standard EDS mechanism: page **metadata** `theme` → `decorateTemplateAndTheme()`
in `scripts/aem.js` adds it as a body class. So every NC page's Metadata block
carries `theme: north-carolina`. Do not hand-add the class in code.

---

## 3. Design system / theme tokens

Design tokens are CSS custom properties. The **default `:root`** block in
`styles/brand.css` holds the `elevance` (grs-provider) values; the NC site
**overrides the same variables under `body.north-carolina`** in the same file.
`styles/styles.css` has a matching `body.north-carolina { … }` block for base
element overrides (heading weights, body sizing) that tokens alone can't express.

**North Carolina tokens** (`styles/brand.css`, `body.north-carolina`):
- Fonts: body **Roboto**, headings **Roboto Condensed** (Google Fonts, loaded in `head.html`)
- `--heading-color: #023347` (navy) · `--text-color: #333`
- `--link-color: #016b95` · `--link-hover-color: #01506f` · `--brand-blue: #016b95`
- `--light-color: #eee` · `--background-color: #fff`
- Heading sizes: xxl 28 / xl 20 / l 28 / m 22 / s 18 / xs 16 (px)

Fonts are loaded in **`head.html`** via Google Fonts (`Roboto` + `Roboto Condensed`).

To add another site's design: add a new `body.<theme>` token block in `brand.css`
(+ base overrides in `styles.css`), load its fonts in `head.html`, and give its
pages `theme: <theme>` metadata. **Never edit the `:root` defaults for a
site-specific change.**

---

## 4. Block library

Blocks live in `blocks/`. There are three groups:

**a) Boilerplate blocks** (from the EDS starter — shared, may be unscoped):
`accordion, cards, columns, embed, footer, form, fragment, header, hero, modal,
quote, search, table, tabs, video`.

**b) NC home-page variants** (built first, `body.north-carolina`-scoped, styled):
| Block | Base | Used for |
|-------|------|----------|
| `hero-welcome` | hero | Home welcome hero: full-bleed photo + overlaid content card |
| `cards-icon-links` | cards | Grey quick-action icon+label bar |
| `cards-featured` | cards | 3-up photo feature cards |
| `columns-link-lists` | columns | "Provider tools & resources" two-column chevron link directory (site-wide) |

**c) NC interior variants** (built for the 46 interior pages):
| Block | Base | In use? | Used for |
|-------|------|---------|----------|
| `hero-banner` | hero | ✅ | Interior page-title banner (photo + solid blue title bar) |
| `cards-promo` | cards | ✅ | Alternating photo-beside-text promo rows with a button |
| `accordion-doc-links` | accordion | ✅ | Expand/collapse panels of document/PDF links |
| `cards-resource-grid` | cards | ✅ | 2-up no-image cards ending in solid-button CTAs |
| `table-news-archive` | table | ✅ | Filter/sort/paginate news-bulletin feed (client-side JS) |
| `prior-auth-lookup` | (custom) | ✅ | Interactive Prior-Auth lookup tool (config-driven) |
| `cards-topics` | cards | ⚠️ built, **unused** | No-image teaser grid (heading+paragraph+arrow link) |
| `columns-content` | columns | ⚠️ built, **unused** | Two-up prose content columns |
| `columns-doc-library` | columns | ⚠️ built, **unused** | Categorized multi-column document library |

**About the ⚠️ unused blocks:** their code + CSS exist and are scoped, but no
imported page currently routes to them (see §5). `columns-doc-library` was
deliberately dropped from doc-heavy pages in favor of default content (for content
completeness); `cards-topics`/`columns-content` sections imported cleanly as
default content. They're available if you later choose to author those sections
as blocks, but they have **no live content to preview/design against** yet.

Every block ships `<name>.js`, `<name>.css`, `metadata.json`, `README.md`.

### Two known runtime behaviors worth knowing
- **`scripts/scripts.js` `buildAutoBlocks`** was patched so the synthetic hero
  auto-block does NOT fire when an authored hero variant (`hero-welcome`, etc.) is
  present — otherwise it steals the H1/picture. Keep that guard.
- **`blocks/header/header.js` and `blocks/footer/footer.js`** fetch their fragment
  with a 3-step fallback: `{metadata path}.plain.html` → `/content{metadata
  path}.plain.html` (localhost) → legacy default. NC pages set `nav:
  /fragments/nav` and `footer: /fragments/footer` metadata; the fragments live at
  `content/fragments/{nav,footer}.plain.html`.

---

## 5. Content migration pipeline (how pages got imported)

Content is NOT authored in this repo — it's imported into DA. The importer lives in
`tools/importer/`. **Never hand-edit `content/**.plain.html`; regenerate via the
import script.** (Deleting anything under `content/` is disallowed.)

### Key files
- `tools/importer/page-templates.json` — the template catalog. Two templates:
  `north-carolina-provider` (home, 4 blocks mapped) and `nc-provider-interior`
  (47 URLs — the consolidated interior template).
- `tools/importer/parsers/<block>.js` — one parser per block; converts source DOM
  → EDS block table. Signature: `export default function parse(element,{document})`,
  build with `WebImporter.Blocks.createBlock(...)`, then `element.replaceWith(block)`.
- `tools/importer/transformers/healthybluenc-*.js` — site-wide cleanup (removes
  header/nav/footer/modals) and section handling.
- `tools/importer/import-<template>.js` — the per-template import orchestrator
  (bundled to `.bundle.js` before running).

### The content-aware router (important design decision)
The source reuses generic wrapper classes (`content_column_1/2/3`) that map to
**different blocks on different pages**, so a pure selector→parser mapping can't
disambiguate. `import-nc-provider-interior.js` therefore:
1. Inspects each `<main>` section's **content** to classify it into a block, AND
2. Gates that choice against a **per-page allow-list** (`ALLOWED_BLOCKS`, embedded
   in the script; derived from the per-page analyses in `migration-work/pages/*/`).
   A block is only applied to a page if it's in that page's allowed set — this
   prevents prose sections from being mis-routed to a block (which drops text).
3. Injects `theme` / `nav` / `footer` metadata into every page.

If a page's blocks look wrong, edit the router logic or that page's entry in
`ALLOWED_BLOCKS`, then re-bundle + re-import that page (see §6).

---

## 6. Common commands

Scripts are under the excat marketplace; resolve the content-import scripts dir:
```bash
D="/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-content-import/scripts"
```

**Bundle an import script** (required before running):
```bash
"$D/aem-import-bundle.sh" --importjs tools/importer/import-nc-provider-interior.js
```

**Run / re-run an import** (`--force` re-fetches even if content exists):
```bash
node "$D/run-bulk-import.js" \
  --import-script tools/importer/import-nc-provider-interior.bundle.js \
  --urls tools/importer/urls-nc-provider-interior.txt --force
```

**Validate content completeness** (source text vs generated HTML):
```bash
WORKSPACE_PATH="$(pwd)" node "$D/validate-imported-pages.js"
# writes migration-work/importer/page-validation.json
```

**Preview locally** (dev server on :3000; content served under `/content/`):
```
http://localhost:3000/content/north-carolina-provider/home
```
(Body already carries the `north-carolina` class in preview so scoped CSS applies.)

**Lint blocks:** `npx eslint blocks/<name>/<name>.js` (airbnb-base; max-len 100).

---

## 7. Migration status (as of handoff)

- **elevance-nc: fully migrated.** Home + 46 interior pages imported (47 URLs);
  **44/49 pages ≥90% content completeness**. The 5 below-threshold are explained
  (interactive→static blocks, scorer artifacts, excluded chrome) — not dropped
  content. See GitHub issues #4–#11 (label `migration`) for the full trail.
- Nav + footer fragments migrated to `content/fragments/`.
- Design tokens + all **in-use** blocks styled and visually verified (~92–97%).

### Open follow-ups (non-blocking)
1. **`prior-auth-lookup` needs a real dataset.** It renders a config shell; wire a
   published PA-code JSON (`[{code, description, market, lob, paRequired}]`) into
   the block's `Data Source` row for live results.
2. **DA authoring-UI registration** for the new blocks (blocks.json + Library
   panel) via `block-library-creator` — so authors can insert them.
3. **3 unused blocks** (`cards-topics`, `columns-content`, `columns-doc-library`) —
   decide whether to author content into them or retire them.
4. **Source drift:** the live source site has changed since scrape (archives feed
   redesigned, some redirects). Cached scrapes are in `migration-work/pages/*/` and
   `tools/importer/bd-snapshots/`.

---

## 8. Directory map

```
blocks/                     Block code (see §4). NC variants are body.north-carolina-scoped.
styles/
  brand.css                 Design tokens: :root (elevance) + body.north-carolina (NC)
  styles.css                Base styles + body.north-carolina overrides
head.html                   Font loading (Roboto + Roboto Condensed)
scripts/                    aem.js (core, do not fork lightly), scripts.js (auto-block guard)
content/                    Imported DA content (generated — do not hand-edit)
  fragments/                nav.plain.html, footer.plain.html (NC)
  north-carolina-provider/  47 imported NC pages
  media-da/                 Imported images (incl. adobedrago/elevance-nc/nav logo)
tools/importer/
  page-templates.json       Template catalog (2 templates)
  parsers/                  Per-block source→EDS parsers
  transformers/             healthybluenc-* cleanup/sections
  import-*.js(.bundle.js)   Per-template import orchestrators (content-aware router)
  bd-snapshots/             Cached raw HTML for bot-protected re-imports
migration-work/             Analysis artifacts (per-page analyses, brand.json, reports)
.migration/project.json     Project type + per-site config
```

---

## 9. Conventions & gotchas checklist

- [ ] New site-specific CSS is scoped under `body.<theme>` (never `:root`, never bare).
- [ ] New pages carry `theme`, `nav`, `footer` metadata (the router injects these on import).
- [ ] Regenerate content via the import script — don't hand-edit `content/`.
- [ ] Re-bundle (`aem-import-bundle.sh`) after editing any `import-*.js` before running.
- [ ] Both source sites are bot-protected → rely on Bright Data / bd-snapshots.
- [ ] Keep the `buildAutoBlocks` hero guard in `scripts/scripts.js`.
- [ ] Block CSS from generation is **structural only**; brand styling is a separate design pass.
- [ ] Run the completeness validator after any re-import; investigate genuine drops (not scorer artifacts).
```

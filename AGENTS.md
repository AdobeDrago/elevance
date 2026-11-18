# AGENTS.md — Elevance / Healthy Blue Provider (AEM Edge Delivery Services)

Onboarding guide for anyone (human or agent) picking up this project. It captures
the **repoless multi-site** setup, the **theme-scoped design system**, the **block
library**, and the **content-migration pipeline** so you can continue the work
without re-deriving it.

_Last reviewed: 2026-11-18._

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
- **Active site in this workspace:** `elevance` (`migration-work/profile.json`).
  The local `content/` folder is the **`elevance`** DA space — it holds the
  grs-provider pages, the shared fragments, the block library samples
  (`content/docs/library/`) and `content/drafts/`. **The 47 North Carolina pages are
  not in this workspace**; they live in the `elevance-nc` space and are viewable on
  its preview: `https://main--elevance-nc--adobedrago.aem.page/north-carolina-provider/home`.
  Switch the active site (`migration-work/profile.json`) before re-importing NC pages.
- There is intentionally **no `fstab.yaml`** — in this repoless multi-site setup
  the active site / content mount is resolved by tooling and per-site config
  (`.migration/project.json`, `migration-work/profile.json`), not by a single
  `fstab` mountpoint. Do not re-add one.

> ⚠️ **Both provider source sites are bot-protected.** Scraping/import uses a Bright
> Data fallback and cached snapshots under `tools/importer/bd-snapshots/`.

---

## 2. THE golden rule — repoless CSS scoping

**Every site-specific CSS rule MUST be scoped under a `body.<site-theme>` class.**
Because all sites share this one codebase, an unscoped `.hero-banner { … }` rule
would leak across sites. Scope it: `body.north-carolina .hero-banner { … }`.

- The North Carolina site uses the theme class **`north-carolina`** (all NC pages).
- This applies to **block CSS, base/element overrides, media queries, and
  pseudo-classes** — no exceptions. There must be **zero** unscoped block/element
  selectors for a site.
- Quick audit (lists files that still have unscoped top-level rules):
  ```bash
  for f in blocks/*/*.css; do
    n=$(grep -nE '^\s*\.[a-z]' "$f" | grep -v 'body\.north-carolina' | wc -l)
    [ "$n" -ne 0 ] && echo "UNSCOPED in $f: $n"
  done; echo done
  ```
  (Shared boilerplate blocks predating the multi-site split — the §4a list — are
  expected to show up here; the **site variants** in §4b–d must all be scoped. The
  single hit in `prior-auth-lookup.css` is a false positive inside a comment.)
- **Known violations to fix:** `pdf-list`, `medical-policies-dialog` and
  `more-resources` (NC blocks, §4d) have **unscoped** CSS
  (`.pdf-list-wrapper .pdf-list`, `.medical-policies-disclaimer`,
  `.more-resources.block`). They only render on NC pages today, but must be scoped
  under `body.north-carolina` before another site uses a block of the same name.

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

### Section styles
NC pages use the **`light`** section style (grey band) on 45 of 47 pages, set through
Section Metadata. Its rules live in `styles/styles.css`.

---

## 4. Block library

Blocks live in `blocks/`. Most blocks ship `<name>.js`, `<name>.css`,
`metadata.json` and `README.md`; the exceptions are noted below.

**a) Boilerplate blocks** (from the EDS starter — shared, may be unscoped):
`accordion, cards, carousel, columns, embed, footer, form, fragment, header, hero,
modal, quote, search, table, tabs, video`.

**b) NC home-page variants** (built first, `body.north-carolina`-scoped, styled):
| Block | Base | Used for |
|-------|------|----------|
| `hero-welcome` | hero | Home welcome hero: full-bleed photo + overlaid content card |
| `cards-icon-links` | cards | Grey quick-action icon+label bar (home + 6 interior pages) |
| `cards-featured` | cards | 3-up photo feature cards |
| `columns-link-lists` | columns | "Provider tools & resources" two-column chevron link directory (44 pages) |

**c) NC interior variants** (built for the 46 interior pages):
| Block | Base | In use? | Used for |
|-------|------|---------|----------|
| `hero-banner` | hero | ✅ all 47 interior pages | Interior page-title banner (photo + solid blue title bar) |
| `columns-content` | columns | ✅ 9 pages | Two-up prose content columns (e.g. prior-authorization, training-resources) |
| `cards-promo` | cards | ✅ 3 pages | Alternating photo-beside-text promo rows with a button |
| `accordion-doc-links` | accordion | ✅ 3 pages | Expand/collapse panels of document/PDF links |
| `cards-resource-grid` | cards | ✅ resources | 2-up no-image cards ending in solid-button CTAs |
| `table-news-archive` | table | ✅ archives | Filter/sort/paginate news-bulletin feed (client-side JS, sample data — see below) |
| `prior-auth-lookup` | (custom) | ✅ prior-authorization-lookup | Interactive Prior-Auth lookup tool (sample data — see below) |
| `cards-topics` | cards | ⚠️ built, **unused** | No-image teaser grid (heading+paragraph+arrow link) |
| `columns-doc-library` | columns | ⚠️ built, **unused** | Categorized multi-column document library |

**About the ⚠️ unused blocks:** their code + CSS exist and are scoped, but no
imported page currently uses them. `columns-doc-library` was deliberately dropped
from doc-heavy pages in favor of default content (for content completeness);
`cards-topics` sections imported cleanly as default content. They're available if
you later choose to author those sections as blocks, but they have **no live content
to preview/design against** yet.

**d) NC blocks added after the initial migration** (post-handoff fixes; in use):
| Block | In use on | Used for | Notes |
|-------|-----------|----------|-------|
| `pdf-list` | 11 pages (home, manuals-and-guides, maternal-child-services, …) | List of PDF download links (opens in new tab, adds screen-reader text) | ⚠️ unscoped CSS; no `metadata.json`/`README.md` |
| `text-link` | 9 pages (training-academy, prior-authorization, cme, …) | Paragraphs holding a text link; `chevron` variant = bold link + chevron | no `metadata.json`/`README.md` |
| `cta-footer-banner` | 9 pages (prior-authorization, training-*, learn-about-availity, …) | Full-width call-to-action band near the page foot (heading, text, button) | |
| `forms-accordion` | forms | Categorized provider-forms library in collapsible topic sections + "PCP Change Form" list (sample data) | |
| `medical-policies-dialog` | medical-policies-and-clinical-guidelines | Disclaimer dialog shown once per day (cookie `mpdisclaimer`) | ⚠️ unscoped CSS; no `metadata.json`/`README.md` |
| `more-resources` | claims | "More resources" card row with arrow links | ⚠️ unscoped CSS; no `metadata.json`/`README.md` |

### Interactive blocks run on bundled sample data
`scripts/lookup-service.js` serves `prior-auth-lookup`, `forms-accordion` and
`table-news-archive`. It is hard-wired to **mock JSON** in `scripts/lookup-data/`
(`mock-suggestion-data.json`, `mock-search-data.json`, `mock-forms-response.json`,
`mock-news-archives.json`) — `return true; // always use mock for now`. The real
Healthy Blue endpoints (`FORMS_API_URL`, `PLUTO_API_URL`, `NEWS_ARCHIVE_URL`) are
defined but unused. Results are therefore a fixed sample (e.g. searching "insulin"
in the lookup tool returns four CPT codes). Switch to the live endpoints once they
are reachable from the EDS domain.

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
  | Template | URLs | Blocks mapped | Import script |
  |----------|------|---------------|---------------|
  | `north-carolina-provider` | 1 (NC home) | 4 | `import-north-carolina-provider.js` |
  | `nc-provider-interior` | 47 (consolidated interior template) | 11 | `import-nc-provider-interior.js` |
  The grs-provider (Elevance) import, `import-grs-provider.js`, predates the catalog
  and has **no entry** in `page-templates.json`.
- `tools/importer/parsers/<block>.js` — one parser per block; converts source DOM
  → EDS block table. Signature: `export default function parse(element,{document})`,
  build with `WebImporter.Blocks.createBlock(...)`, then `element.replaceWith(block)`.
- `tools/importer/transformers/` — site-wide cleanup (removes header/nav/footer/
  modals) and section handling, one pair per source site: `healthybluenc-*` (NC) and
  `bluemedadvgrhs-*` (grs-provider). Each import script imports only its own site's
  pair.
- `tools/importer/import-<template>.js` — the per-template import orchestrator
  (bundled to `.bundle.js` before running).

### The content-aware router (important design decision)
The source reuses generic wrapper classes (`content_column_1/2/3`) that map to
**different blocks on different pages**, so a pure selector→parser mapping can't
disambiguate. `import-nc-provider-interior.js` therefore:
1. Inspects each `<main>` section's **content** to classify it into a block, AND
2. Gates that choice against a **per-page allow-list** (`ALLOWED_BLOCKS`, embedded
   in the script; derived from the per-page analyses done during migration).
   A block is only applied to a page if it's in that page's allowed set — this
   prevents prose sections from being mis-routed to a block (which drops text).
3. Injects `theme` / `nav` / `footer` metadata into every page.

If a page's blocks look wrong, edit the router logic or that page's entry in
`ALLOWED_BLOCKS`, then re-bundle + re-import that page (see §6).

### DA Library page templates
Authors can start a page from **Library → Templates** in the DA editor. There are four
templates per site: Home page, Interior overview, Document reference and Content page.

| | Elevance (`adobedrago/elevance`) | North Carolina (`adobedrago/elevance-nc`) |
|---|---|---|
| Template pages | `/docs/library/templates/{home-page,interior-overview,document-reference,content-page}` | `/library/templates/{…same names…}` (next to its `/library/blocks.json`) |
| Templates sheet | `/docs/library/templates.json` | `/library/templates.json` |
| Library config entry | `Templates` row already existed in the DA site config | ⏳ still to add (see §7) |
| Status | ✅ uploaded to DA (not previewed/published) | ⏳ script tested; run + upload pending |

- **Generated, not hand-written:** `tools/importer/import-library-templates.js` reads each
  site's *published* page in authoring form (`<preview host>/<path>.plain.html`; URL lists
  `urls-library-templates-{elevance,nc}.txt`). It keeps the section and block structure
  and swaps page copy for placeholders ("Page title", "Section heading", "Link text" →
  `#`). It also trims repeated items (lists to 3, block rows per `MAX_ROWS`, at most 2
  H2 groups per section). Images keep their published `aem.page/…/media_*` URLs, so
  they load in the local preview and in DA alike.
- **Kept verbatim:** shared site-wide sections — the "Provider tools & resources"
  directory and the join-network CTA (`columns-link-lists`, `cta-footer-banner` on NC),
  plus section styles (re-created as Section Metadata from the published section class).
- **Metadata:** NC templates carry `theme: north-carolina`, `nav`, `footer`; both sites
  get placeholder `title`/`description`. A normal Metadata table is used — DA inserts it
  as is (it only converts `template-metadata` tables).
- **Templates sheet format:** DA sheet rows `{ key: <name shown to authors>, value: <full
  content.da.live URL of the template page> }` (confirmed in the da-live library code).
- **Regenerate:** bundle the script, then run it with the site's URL list. Output goes
  to the active site's `content/`, so run the NC list **only with `elevance-nc` active**.
  To test NC output from an Elevance workspace, run with
  `WORKSPACE_PATH=/tmp/<scratch>` so nothing lands in the Elevance content. The
  completeness scorer flags these pages as low; that's expected, because the copy is
  replaced on purpose.
- **Upload:** wrap each `.plain.html` as `<body><header></header><main>…</main>
  <footer></footer></body>` and POST it to the DA source API; POST the sheet as JSON.

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
With `elevance` active, the NC pages show as "unscored" because their
`.plain.html` files aren't in this workspace — that's expected.

**Preview locally** (dev server on :3000; content served under `/content/`):
```
http://localhost:3000/content/grs-provider
```
NC pages are previewed on the `elevance-nc` site preview instead (see §1).

**Lint blocks:** `npx eslint blocks/<name>/<name>.js` (airbnb-base; max-len 100).

---

## 7. Migration status

- **elevance-nc: fully migrated.** Home + 46 interior pages imported (47 URLs);
  **44/49 pages ≥90% content completeness** at handoff. The 5 below-threshold are
  explained (interactive→static blocks, scorer artifacts, excluded chrome) — not
  dropped content. See GitHub issues #4–#11 (label `migration`) for the full trail.
  Later fixes (issues #65–#92, merged through PR #98) added the §4d blocks and
  page-level fixes for prior-authorization, the PA lookup, forms, links and
  training-academy.
- Nav + footer fragments migrated to `content/fragments/`.
- Design tokens + all **in-use** NC blocks styled and visually verified (~92–97%).
- **elevance (grs-provider):** 8 basic pages (home + 7 interior) using generic
  `hero`/`cards`/`columns`; no theme metadata, no design pass.

### Demo pages (North Carolina preview)
Best showcase pages, in a suggested order: `home` (hero, icon bar, feature cards,
PDF lists, link directory) → `resources` (widest block mix) →
`prior-authorization-lookup` → `archives` → `forms` →
`medical-policies-and-clinical-guidelines`; optionally `patient-care`. In the lookup
tool, choose a line of business first, then click the search box to open the search
panel. Skip the grs-provider pages (unstyled generic blocks).

### Open follow-ups (non-blocking)
1. **Interactive blocks use sample data.** Point `scripts/lookup-service.js` at live
   endpoints (or a published JSON) for real prior-auth, forms and news results (§4).
2. **DA authoring-UI registration** for the new blocks (blocks.json + Library
   panel) via `block-library-creator` — so authors can insert them. The NC Library
   already lists 27 blocks (`/library/blocks.json` in `elevance-nc`); check which §4d
   blocks are still missing. The Elevance Library lists the starter blocks only.
3. **2 unused blocks** (`cards-topics`, `columns-doc-library`) — decide whether to
   author content into them or retire them.
4. **Scope the unscoped CSS** in `pdf-list`, `medical-policies-dialog`,
   `more-resources`, and add their missing `metadata.json`/`README.md` (also
   `text-link`).
5. **Source drift:** the live source site has changed since scrape (archives feed
   redesigned, some redirects). Cached scrapes are in `tools/importer/bd-snapshots/`.
6. **NC Library templates (§5):** from a workspace on the `elevance-nc` site, run
   `import-library-templates` with `urls-library-templates-nc.txt`, preview, upload the 4
   pages to `/library/templates/`, upload `/library/templates.json`, and add a
   `Templates` row to the NC DA library config (`path:
   https://content.da.live/adobedrago/elevance-nc/library/templates.json`), keeping
   the existing `Blocks` row.
7. **Library templates author check:** in DA, insert each template from
   Library → Templates on a new page and confirm the blocks and metadata come through.

---

## 8. Directory map

```
blocks/                     Block code (see §4). Site variants are body.<theme>-scoped.
styles/
  brand.css                 Design tokens: :root (elevance) + body.north-carolina (NC)
  styles.css                Base styles + body.north-carolina overrides, section styles
head.html                   Font loading (Roboto + Roboto Condensed)
scripts/                    aem.js (core, do not fork lightly), scripts.js (auto-block guard)
  lookup-service.js         Data helpers for prior-auth-lookup / forms-accordion / table-news-archive
  lookup-data/              Mock JSON those blocks currently use
content/                    The elevance DA space (generated — do not hand-edit)
  grs-provider(.plain.html) grs-provider home + 7 interior pages
  fragments/                nav.plain.html, footer.plain.html
  drafts/                   Personal draft/test pages
  docs/library/             Block library sample pages; templates/ + templates.json (Library templates)
  media-da/                 Imported images
docs/                       Static author guide + project overview (author-guide.html, index.html)
tools/importer/
  page-templates.json       Template catalog (2 templates)
  parsers/                  Per-block source→EDS parsers
  transformers/             healthybluenc-*, bluemedadvgrhs-* cleanup/sections
  import-*.js(.bundle.js)   Per-template import orchestrators (content-aware router for NC interior)
  import-library-templates.js  Builds DA Library page templates from published pages (§5)
  bd-snapshots/             Cached raw HTML for bot-protected re-imports
migration-work/             Analysis artifacts (git-ignored; profile.json = active site)
.migration/project.json     Project type + per-site config
```

---

## 9. Conventions & gotchas checklist

- [ ] New site-specific CSS is scoped under `body.<theme>` (never `:root`, never bare).
- [ ] New pages carry `theme` metadata, plus `nav`/`footer` once the site has fragments (the import scripts inject these).
- [ ] Regenerate content via the import script — don't hand-edit `content/`.
- [ ] Re-bundle (`aem-import-bundle.sh`) after editing any `import-*.js` before running.
- [ ] Both provider source sites are bot-protected → rely on Bright Data / bd-snapshots.
- [ ] Check which site is active (`migration-work/profile.json`) before importing — `content/` is that site's DA space.
- [ ] Keep the `buildAutoBlocks` hero guard in `scripts/scripts.js`.
- [ ] Block CSS from generation is **structural only**; brand styling is a separate design pass.
- [ ] Run the completeness validator after any re-import; investigate genuine drops (not scorer artifacts).
- [ ] **Back up `tools/importer/page-templates.json` before running the template classifier** — on this project a failed classify run deleted the file.

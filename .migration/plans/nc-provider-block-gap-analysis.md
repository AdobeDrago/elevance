# North Carolina Provider — Block Gap Analysis & Follow-On Implementation Plan

## Objective
Analyze all 47 provider URLs, determine which pages require a **new block** (a structure not covered by the existing library), and produce a block-gap **determination report**. The plan also sequences the follow-on issues (forms, new blocks, bulk migration) the report feeds into.

## Decisions (confirmed)
- **Analysis depth:** analyze **all 46** unanalyzed pages individually (home is already migrated). Highest confidence in the gap list.
- **Forms:** if real HTML forms are confirmed on `contact-us` / `forms` / `join-our-network`, **enable the `forms-excat` plugin and convert** them to Adaptive Form JSON as a dedicated issue.

## Existing block library (baseline to diff against)
- **NC variants already built:** `hero-welcome`, `cards-icon-links`, `cards-featured`, `columns-link-lists`
- **Boilerplate blocks in repo:** `accordion`, `cards`, `columns`, `hero`, `table`, `tabs`, `quote`, `embed`, `form`, `fragment`, `modal`, `search`, `video`, `carousel`
- **Repoless constraint:** every new block's CSS must be scoped under `body.north-carolina`.

---

## Issue 1 — URL clustering & template discovery
Group all 47 URLs into page templates so analysis and later migration are organized by shape, not one-off.
- Run site-catalog/classify over the full URL list → `page-templates.json` template groups.
- Produce a URL→template map and pick representative pages.
- **Output:** confirmed template set (supersedes the hypothesis table below).

### Preliminary cluster hypothesis (to be confirmed by Issue 1)
| Cluster | Example URLs | Likely blocks |
|---|---|---|
| Landing/overview | `resources`, `patient-care`, `claims`, `member-eligibility-and-pharmacy`, `training-academy` | existing hero/cards/columns variants |
| Content article | `medical-policies-…`, `reimbursement-policy-*`, `rights-and-responsibilities`, `guide-to-drug-coverage-…` | mostly default content; possibly `table` |
| Tool/utility ⚠️ | `prior-authorization-lookup`, `total-member-view`, `hedis` | candidate new block (lookup/tool, data tables) |
| Contact/forms ⚠️ | `contact-us`, `forms`, `join-our-network` | candidate `form` (Adaptive Form) |
| Legal | `privacy-policies`, `terms-of-use` | default content only |

## Issue 2 — Full page analysis (all 46 pages)
Deep-analyze every unanalyzed URL: sections, default-content vs. block decisions, candidate block-variant names.
- Analyze all 46 pages (batched by template for throughput, but every URL gets its own analysis artifact).
- Prioritize the ⚠️ tool/form/data pages first.
- Reuse existing scrape/analysis artifacts where present; scrape fresh otherwise (source is bot-protected → Bright Data fallback expected).
- **Output:** per-page `authoring-analysis.json` + a consolidated block inventory.

### New-block signals to watch for
- Data/rate **tables** beyond simple markdown (reimbursement schedules, HEDIS measures)
- **Interactive tools** (prior-auth lookup, total member view) — search/filter widgets
- **Forms** (contact-us, join-our-network, forms)
- **Accordions / tabs** for long policy or FAQ content
- **Document/download lists** styled beyond the existing link-list pattern
- Hero/card/column layouts visually distinct enough to need a **new variant**

## Issue 3 — Gap diff & determination report *(primary deliverable)*
Diff the Issue 2 block inventory against the existing library and produce the verdict.
- For every needed block: mark **covered** (existing) or **gap** (new).
- For each gap record: proposed block name, base block, driving URLs, why existing blocks don't fit.
- **Output:** the block-gap report — per-cluster coverage + explicit list of new blocks required (or "no new blocks needed"). *This is the answer to the original question.*

## Issue 4 — Forms enablement & conversion (conditional)
Runs only if Issue 2/3 confirms real forms.
- Enable `forms-excat` in `.agents/settings.json` and let the session reinit.
- Convert confirmed HTML forms → Adaptive Form JSON for the affected URLs.
- **Output:** form blocks/models for `contact-us`, `forms`, `join-our-network` as applicable.

## Issue 5 — New block generation (conditional)
Runs only for gaps flagged in Issue 3.
- Generate each new block/variant (JS + CSS + metadata + README), CSS scoped under `body.north-carolina`.
- Structural pass first; design styling handled per the established design-migration flow.
- **Output:** new blocks in `/blocks/`, validated.

## Issue 6 — Bulk content migration (follow-on, out of current scope)
Once blocks exist, migrate the 46 pages (infrastructure → parsers/transformers → bulk import → validation), carrying `theme: north-carolina` + `nav`/`footer` metadata. Execute after Issues 1–5.

---

## Checklist
- [ ] **Issue 1:** Cluster all 47 URLs into templates; produce URL→template map; select representatives
- [ ] **Issue 1:** Confirm/replace the cluster hypothesis table with real clustering output
- [ ] **Issue 2:** Page-analyze all 46 unanalyzed URLs (⚠️ tool/form/data pages first)
- [ ] **Issue 2:** Build consolidated block inventory across every page
- [ ] **Issue 3:** Diff needed blocks vs. existing library (4 NC variants + boilerplate)
- [ ] **Issue 3:** Record each gap (name, base block, driving URLs, why existing won't fit)
- [ ] **Issue 3:** Produce the block-gap determination report (per-cluster coverage + new-block list)
- [ ] **Issue 4 (conditional):** If forms confirmed → enable `forms-excat`, convert affected pages
- [ ] **Issue 5 (conditional):** Generate each flagged new block/variant (scoped `body.north-carolina`), validate
- [ ] **Issue 6 (follow-on):** Plan bulk migration of the 46 pages once blocks exist

## Deliverable
Primary: the **block-gap report** (Issue 3) — per template cluster, which existing blocks cover it and which new blocks are required (with justification + driving URLs), or an explicit "fully covered" verdict. Conditional deliverables: forms conversion (Issue 4) and new blocks (Issue 5).

## Execution note
The plan is finalized and ready to run: **analyze all 46 pages (Issue 2) → produce the gap report (Issue 3)**, with Issues 4–5 triggered by findings. Clustering, page analysis, plugin enablement, and any block generation modify files and drive a browser, so they require **Execute mode** — approve the plan / switch to Execute mode to begin.

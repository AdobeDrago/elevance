# Search, documents, and autocomplete

The active search deployment is **adobedrago/elevance-nc**, branch **main**, with
DA document discovery limited to **/docs/gpp**. Configuration is in
`asset-index.config.json`; it contains no credentials. All new visual rules are
scoped to `body.north-carolina`. Other site themes continue to use their own page
query index without loading the NC document index or phrase catalog.

## Runtime

The repository supplies `/search.html`, a complete NC results page using the
existing header, footer, theme metadata and search block. It requires no new DA
page or hand-edited imported content. The NC header retains its desktop toggle and
mobile menu behavior, and submits a GET form to `/search.html?q=...`.

| Host | Documents | Suggestions |
| --- | --- | --- |
| localhost / loopback, `*.aem.page`, `*.hlx.page` | `/asset-index-preview.json` | `/search-key-phrases-preview.json` |
| `*.aem.live`, `*.hlx.live`, custom production hosts | `/asset-index.json` | `/search-key-phrases.json` |

Pages come from `/query-index.json` on the current site. Both sources are fetched
once per page and combined by path; either source can fail independently. Search
requires three non-space characters, debounces by 200 ms, normalizes accents/case/
punctuation/whitespace, and requires every query term. Ranking prefers an exact
title, title prefix, title terms, H1, description, body text, then other metadata.
Records with `noindex` are ignored. PDFs open in a new tab with a protected opener;
page links use the current tab. A live status reports loading, counts, empty
results and incomplete/unavailable sources.

Results render **10 at a time by default**, with Previous/Next controls, a full match count,
visible range and current page announced in the live status. The controls appear
only when more than one page is available. Page buttons reuse the ranked matches,
move focus to the first result and scroll the results into view. They neither
fetch indexes again nor repeat matching and ranking. Partial-source warnings stay
visible on every page.

The selected page is shareable as `/search.html?q=care&page=2`, and browser
Back/Forward restores it. Invalid page values fall back to page one; pages beyond
the available matches use the final page. New queries, autocomplete selections
and clearing search reset pagination. Page one omits the `page` parameter.

The NC results page follows the provider search design: a gray background,
Search Results heading, Search Again field, filter sidebar, and a results column
with bold linked titles, destination URLs, separate descriptions and PDF icons.
Mobile stacks the controls and result column. Header search retains its overlay.

Results per page offers 10, 20, 30, 40 or 50, with 10 as the default. The content
filters are Policies, Guidelines & Manuals; Claims & Billing; Prior Authorization
& Eligibility; and Forms. Multiple selected categories use OR matching. Recognized
`category`, `topic` and `tags` values take precedence. Where those are absent or
unrecognized, categories fall back to title/H1/path keywords. Body text is never
used to assign categories, and unclassified records remain in unfiltered results.
The current AEM index has empty category values, so authoring metadata is needed
for precise categorization beyond this conservative fallback.

Changing a filter or page size reuses ranked matches, resets to page one, and
preserves the query. Both controls are shareable (`filter=forms&size=20`) and
restore on browser Back/Forward. Default size 10 and empty filters omit their URL
parameters. PDF opens remain protected, and descriptions/URLs are displayed as
text rather than added to the title link.

This is client-side pagination: it bounds result rendering, not index downloads
or the initial matching pass. With 1,000 matches at the default size, only 10 result entries are
created in the document at once (99% fewer than rendering every match). The full
ranked result array remains in memory while the query is active.

Autocomplete uses titles and H1s only. It shows up to eight options, supports
Arrow Up/Down, Enter, Escape, Tab, pointer selection and focus/blur, and maintains
combobox/listbox ARIA state. Failure to load suggestions leaves ordinary search
working. Escape closes suggestions first, then the existing overlay interaction.

## Query efficiency and benchmark

The runtime caches the merged result of each source combination, including failure
status, for the page lifetime. Relative and absolute forms of the same index URL
share a request. Preview/live and page-only source combinations stay separate.

The first eligible query prepares each searchable record once. Later queries reuse
normalized fields and scan them separately, avoiding a second combined copy of PDF
text. Original records remain available for result display. Autocomplete similarly
prepares each catalog once, uses its generated `normalized` values, and caches word
boundaries and source counts. Older catalogs without normalized values still work.

These caches treat record arrays and catalog arrays as **immutable snapshots**.
Callers that replace data must supply a new array and unchanged/new record objects,
rather than mutating an already-prepared snapshot. Prepared data uses weak keys so
unused snapshots can be garbage-collected. Cached downloaded indexes remain alive
for the page lifetime, as before. Normalization no longer repeats the whitespace
pass already performed when punctuation is collapsed.

Run a repeatable comparison against the original algorithms from commit `4d6d36d`:

```sh
npm run bench:search
# Adjust synthetic text volume and repetitions:
npm run bench:search -- --sizes 100,500,1000 --characters 12000 --phrases 5000 --iterations 3
```

The benchmark uses deterministic synthetic PDFs with varied text lengths, topics,
accents, cross-field queries, body-only matches and missing terms. `--characters`
sets the approximate average body length; individual bodies range from half to
one-and-a-half times that value. It verifies identical ordered results against the
original algorithms before timing. The JSON report includes parsing, one-time
preparation, approximate additional retained heap, and median/p95 query durations.
The command enables explicit garbage collection for the heap estimate.

Sample run on 2026-09-28, Node.js 22.23.3 / Apple M5 Pro, using the defaults
above (36 timed queries per algorithm and dataset):

| Synthetic PDFs | JSON size | Original median | Cached median | Cached p95 | One-time preparation | Additional retained heap |
| --- | --- | --- | --- | --- | --- | --- |
| 100 | 1.18 MiB | 34.64 ms | 0.41 ms | 0.63 ms | 58.72 ms | ~1.51 MiB |
| 500 | 5.90 MiB | 172.94 ms | 1.98 ms | 3.04 ms | 152.74 ms | ~7.37 MiB |
| 1,000 | 11.84 MiB | 338.02 ms | 3.91 ms | 6.13 ms | 295.81 ms | ~14.79 MiB |

For 5,000 autocomplete phrases, median query time was **2.23 ms → 0.14 ms**
(p95 **2.49 ms → 0.32 ms**), with **1.03 ms** of one-time preparation. All
ordered results matched the original implementation. Timings and heap estimates
vary by machine, text distribution and garbage collection; they are observations,
not pass/fail thresholds.

This measures local CPU work with data already available. It does **not** measure
network transfer, browser rendering, the 200 ms input debounce, browser peak memory,
or performance on phones. The first query still pays preparation cost; retaining
normalized text also consumes memory. Larger deployed indexes may still need a
worker, an index built during generation, or smaller downloads. Use real DA data
and mobile measurements before treating these numbers as production guarantees.

## Final environment setup

1. In AEM Site Admin / Index Admin for **adobedrago/elevance-nc**, enable the page
   index using the committed `helix-query.yaml` definition and reindex. This
   repository is repoless: the checked-in YAML is the versioned definition to
   apply through Site Admin; adding it to Git does not activate the site's
   Configuration Service by itself. Confirm `/query-index.json` returns the
   expected page records and fields. Do not add `fstab.yaml`.
2. Create an Adobe Developer Console OAuth Server-to-Server credential for the
   target Adobe organization. In DA User Admin, select **adobedrago**, then the
   specific **elevance-nc** site, and grant its technical-account email read
   access. A valid IMS token without this grant still produces a DA HTTP 403.
3. Add repository Actions secrets `ADOBE_CLIENT_ID`, `ADOBE_CLIENT_SECRET`, and
   `ADOBE_SCOPES`. Confirm scopes exposed by that credential. The source project's
   scopes were `openid,AdobeID,additional_info.projectedProductContext,read_organizations,aem.frontend.all`.
   Do not store a long-lived `DA_IMS_TOKEN` secret.
4. After merging, dispatch **Refresh search indexes** once and inspect all four
   generated outputs. Preview/publish representative files under `/docs/gpp` to
   validate the appropriate tier; ensure at least one supported file exists in
   DA under that root. Test a PDF body phrase, then unpreview/unpublish a document
   and verify removal on the next run.

The workflow requests a short-lived IMS token, masks it, verifies the first
configured DA root, and exposes `DA_IMS_TOKEN` only to subsequent steps. Secrets
and OAuth response bodies are never included in generated files.

## Platform limitation: preview-only HTML pages

Adobe documents that its managed query index includes **published pages only**,
on both `.aem.page` and `.aem.live`. Therefore the specified two-source architecture
can separate preview/live **documents**, but cannot discover never-published HTML
pages on preview. Satisfying that additional acceptance criterion would require a
separate preview page crawler/index and its associated scope/configuration.
The implementation does not claim preview-only page coverage.

References:
- [AEM indexing behavior and activation](https://www.aem.live/developer/indexing)
- [Index definition syntax](https://www.aem.live/docs/indexing-reference)
- [DA List API response and authentication](https://docs.da.live/developers/api/list)
- [Adobe OAuth token API](https://developer.adobe.com/developer-console/docs/guides/authentication/ServerToServerAuthentication/ims)

## Generation and reliability

```sh
npm ci
npm run test:search-index
npm run lint
npm run build:json
# With a freshly obtained token provided through the environment:
npm run search:index:da
```

Generation order is preview documents, live documents, preview phrases, live
phrases. Delivery origins derive from the configured org/site/branch. Directory
listings are authenticated and serial; asset work is limited to two concurrent
files, with PDF pages extracted serially. Non-PDF formats receive filename
metadata only. PDFs use embedded titles or humanized filenames, normalized text,
a 240-character description, and a 250,000-character content cap.

Every delivery HEAD check precedes reuse. A valid unchanged delivery Last-Modified
and matching configuration/environment fingerprint allow reuse without GET or PDF
parsing. A 404/410 removes a record. Redirects fail closed so a delivery request
cannot silently switch to another tier or source. Transient/network failures use
bounded exponential retries; every request has a 30-second timeout. Access errors
fail with an explicit credential/site-access message.

`minimumFiles` guards the **DA discovery count**; it does not require a minimum
number of delivered files. This allows all unpublished documents to be removed
while still protecting against an empty or incorrect crawl root. `maxFiles`
refuses truncation. `allowPartial: false` preserves the previous file if any
required asset fails. Each completed output uses an atomic rename; identical
serialized JSON is not rewritten. A workflow failure never commits partially
completed output sets.

Phrase generation requires a matching, fingerprinted asset index, follows page
index pagination, filters excluded routes and `noindex`, and counts each source
path once per normalized phrase (an identical title and H1 count once). The
maximum-phrase limit fails rather than silently truncating.

The workflow runs on relevant pushes to **main**, manual dispatch, and UTC
quarter-hours (`:00`, `:15`, `:30`, `:45`). GitHub schedules may start late and run
only from the default branch. One non-cancelling concurrency group prevents
simultaneous scheduled writes. Only the four validated output files are staged
and committed; unchanged runs create no commit. An intervening branch update
causes a normal push rejection rather than a force push; rerun using the new head.
Repository rules must permit the workflow's normal `contents: write` commit.

Manual dispatch accepts a comma-separated `roots` override, for example
`/docs/gpp`. An override **replaces** configured roots for that run
and is applied to both generators/fingerprints; the next scheduled run returns to
`/docs/gpp`. Output paths must be distinct, safe relative JSON paths without symlinks.

## Validation boundaries

Automated tests use real PDF.js parsing, mocked DA/delivery responses and a DOM
for accessibility/interaction checks. The four checked-in generated files are
empty placeholders until the first credentialed run. No DA grants, Site Admin
changes, secrets, live documents, or remote workflow runs are created by this code
change. End-to-end delivery verification follows the setup steps above.

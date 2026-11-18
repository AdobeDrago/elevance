# Plan: Page templates in the Document Authoring Library (North Carolina + Elevance)

> **Status: ready to run, but execution needs Execute mode.** Plan mode only allows planning and read-only checks, so nothing below has been run yet. Switch to Execute mode and send "go ahead" again; work starts at Step 1, with the Elevance half first.

## Goal
Give authors on both sites a **Templates** list in the Document Authoring (DA) Library. Each template is a ready-made page that drops in the right block structure, placeholder copy and page metadata. There are four templates per site:

| Template | North Carolina (`elevance-nc`, theme `north-carolina`) | Elevance (`elevance`, grs-provider, no theme) |
|---|---|---|
| **Home page** | Based on `/north-carolina-provider/home`: welcome hero → icon bar → text + PDF lists → featured cards → link directory | Based on `/grs-provider`: hero → link cards → two-column Availity panel → news section → tools & resources list → join-network CTA |
| **Interior overview** | Based on `/resources` or `/patient-care`: banner → intro → icon links → promo rows / resource cards → link directory | Based on `/grs-provider/join-the-network`: title + intro → cards → tools & resources → CTA |
| **Document reference** | Based on `/manuals-and-guides` or `/medical-policies-and-clinical-guidelines`: banner → intro → doc-link accordion / PDF lists → link directory | Based on `/grs-provider/policies-manuals-and-guides`: title + intro → headed document lists → tools & resources → CTA |
| **Content page** | Based on `/prior-authorization` or `/training-resources`: banner → two-column content → text links → CTA banner → link directory | Based on `/grs-provider/benefits-and-pharmacy` or `/learn-about-availity`: title → prose sections → tools & resources → CTA |

## Approach
1. **Generate the templates with an import script, not by hand.** The project rule is that pages under `content/` are produced by an import script and the bulk-import runner. A new `tools/importer/import-library-templates.js` will load each representative page and keep its section and block structure. It will then swap real copy for clear placeholders ("Page title", "Intro paragraph — replace", "Link label") and write the result to `/docs/library/templates/<template-name>`. Images become one shared placeholder image.
2. **Set the right metadata in each template.**
   - North Carolina templates: `theme: north-carolina`, `nav: /fragments/nav`, `footer: /fragments/footer`, plus placeholder `title` and `description`.
   - Elevance templates: a placeholder `title` and `description` only, matching the site's current pages.
3. **Keep each site's templates in its own DA space.** North Carolina templates go to `adobedrago/elevance-nc`; Elevance templates go to `adobedrago/elevance`.
4. **Register the templates in each site's DA Library.**
   - Add a `templates` sheet listing each template's name and path.
   - Add a **Templates** row to the site's DA `library` configuration that points at that sheet.
   - Read the current library configuration first, so existing entries such as Blocks are kept.
5. **Confirm every Document Authoring change with you first.** Nothing is previewed or published live as part of this work.

## Execution order
- **Phase A — Elevance** (this workspace's site): Steps 1–4 for Elevance, then the Elevance half of Step 5. This can start as soon as Execute mode is on.
- **Phase B — North Carolina:** needs the workspace switched to the `elevance-nc` site, so its local files and its DA space stay in sync. If that can't be done here, Phase B moves to a session opened on that site. Phase A doesn't depend on it.
- **Phase C — Wrap-up:** the author check in DA on both sites (Step 6), then the documentation and pull request (Step 7).

## Constraints and risks
- **This workspace is the Elevance site.** The local content folder is the `elevance` DA space. North Carolina pages and templates can't be kept in sync locally unless the workspace is switched to the `elevance-nc` site. If switching isn't possible here, the North Carolina half needs a session opened on that site, or support's help. This is resolved before any North Carolina upload.
- **Where each site's content lives** is checked from its site configuration before uploading, not assumed.
- **The North Carolina source pages exist only on the North Carolina preview** (`main--elevance-nc--adobedrago.aem.page`). The import script will read them from there.
- **Interactive blocks are left out.** The prior-auth lookup, forms library and news archive run on sample data and are tied to one page each, so they don't belong in reusable templates.
- **Custom North Carolina blocks may not appear in the editor's block picker.** The templates partly solve this, because authors get working block tables to copy. Registering the blocks themselves stays a separate follow-up.
- **The exact sheet format for DA Library templates** (column names, absolute or relative paths) is checked against the existing library configuration and the DA Library documentation before anything is written.
- **Uploads need DA access to be on.** If a DA upload is refused for permissions, the Adobe credentials option in Settings → LLM Permissions has to be turned on before that step can be retried.

## Checklist

### 1. Discovery (read-only)
- [ ] Read each site's configuration to confirm its content source (`elevance`, `elevance-nc`).
- [ ] Read each site's current DA `library` configuration and note existing entries (e.g. Blocks) so they're kept.
- [ ] Confirm the DA Library "Templates" sheet format (columns and path style) against the existing config and the DA docs.
- [ ] Check whether `/docs/library/templates/` already exists in either DA space; if it does, decide whether to reuse or replace it.
- [ ] Confirm whether this workspace can be switched to the `elevance-nc` site for the North Carolina half; if not, plan that half for a separate session.

### 2. Template definitions
- [ ] Pick the final representative source page for each of the 8 templates (table above).
- [ ] For each template, define which sections and blocks to keep, how many repeating items to keep (e.g. 2 promo rows, 3 cards, 4 icon links), and the placeholder text.
- [ ] Choose one placeholder image per site from existing media.
- [ ] Set the template names authors will see, e.g. "NC – Interior overview" and "Elevance – Document reference".

### 3. Import script
- [ ] Write `tools/importer/import-library-templates.js`, which:
  - reuses each site's existing cleanup and section transformers;
  - keeps blocks as authored;
  - replaces copy, links and images with placeholders;
  - trims repeated items;
  - injects per-site metadata;
  - maps each source URL to `/docs/library/templates/<name>`.
- [ ] Add a URL list for each site: `tools/importer/urls-library-templates-nc.txt` and `urls-library-templates-elevance.txt`.
- [ ] Bundle the script and run the bulk import for the Elevance templates (the current workspace site).
- [ ] Switch to the `elevance-nc` site, then bundle and run the import for the North Carolina templates.

### 4. Local verification
- [ ] Preview each template: blocks render, sections and backgrounds are correct, and no real copy or real links remain.
- [ ] North Carolina templates: the page has the `north-carolina` theme and the shared nav and footer load.
- [ ] Elevance templates: they render with the default Elevance styling, and no North Carolina styling leaks in.
- [ ] Check mobile layout for each template.

### 5. Document Authoring upload *(each step confirmed with you first; nothing published)*
- [ ] Upload the 4 Elevance template pages to `adobedrago/elevance` under `/docs/library/templates/`, then confirm each matches its local file.
- [ ] Create the Elevance `templates` sheet and add the **Templates** entry to its `library` configuration, keeping existing entries.
- [ ] Upload the 4 North Carolina template pages to `adobedrago/elevance-nc` under `/docs/library/templates/`, then confirm each matches its local file.
- [ ] Create the North Carolina `templates` sheet and add the **Templates** entry to its `library` configuration, keeping existing entries.

### 6. Author check
- [ ] In DA, open a new document on each site, open Library → Templates, insert each template, and confirm the blocks and metadata come through intact.
- [ ] Note any template the Library can't insert cleanly and fix it in the import script, then re-import and re-upload.

### 7. Documentation
- [ ] Add a "Library templates" section to AGENTS.md: where the templates live, how to regenerate them, and how they're registered.
- [ ] Add a short "Start from a template" note to the author guide's page-setup steps.
- [ ] Commit the import script, URL lists and docs on a new branch, and open a pull request when you ask for it.

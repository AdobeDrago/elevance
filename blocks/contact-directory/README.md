# contact-directory

Scannable, accessible directory of phone and email contacts for the Healthy Blue
North Carolina provider site. Authors type plain text; the block builds the links.

## Authoring (Document Authoring)

| contact-directory |                       |         |
| ----------------- | --------------------- | ------- |
| Label             | Phone number or email | Note    |

- One row per contact. Rows render in authored order; nothing is grouped or sorted.
- **Phone number or email** — type it as plain text (`844-594-5072`,
  `nc_provider@healthybluenc.com`). No links, `tel:` or `mailto:` needed.
  - Phone: digits with dashes, spaces, parentheses (and an optional leading `+`)
    become a `tel:` link using digits only. 10-digit numbers get `+1`
    (`844-594-5072` → `tel:+18445945072`).
  - Email becomes a `mailto:` link.
  - Anything else stays as authored.
- **Note** (optional) — short text such as `TTY 711`, shown as a small badge.

## Variations

- `contact-directory` — cards; 1 column on mobile, 2 from 481px, 3 from 992px.
- `contact-directory (compact)` — a two-column list (label | link + note) for
  narrow sidebars.

## Accessibility

- Each link is at least 44px tall.
- Each link is described by its contact label (`aria-describedby`), so screen
  readers announce "844-594-5072, Provider Services · Healthy Blue".

## Universal Editor fields

N/A (Document Authoring project)

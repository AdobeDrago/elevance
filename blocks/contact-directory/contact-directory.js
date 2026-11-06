/*
 * contact-directory — scannable list of phone / email contacts.
 *
 * Authoring: one row per contact, three cells: Label | Phone or email | Note.
 * Authors type plain text; the block derives tel: / mailto: links.
 * Variant `compact` renders a two-column list for narrow sidebars (CSS only).
 *
 * Decorated DOM:
 *   .contact-directory > ul.contact-directory-list > li.contact-directory-item
 *     > p.contact-directory-label#id
 *     > p.contact-directory-value > a[href^="tel:" | "mailto:"]  (or plain text)
 *     > p.contact-directory-note                                 (optional badge)
 */

const PHONE_CHARS = /^\+?[\d\s\-().]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let instance = 0;

/**
 * Returns a tel: href for a phone-like string, or null if it is not a phone.
 * 10-digit (NANP) numbers get +1; 11-digit numbers starting with 1 get +.
 * @param {string} text
 * @returns {string|null}
 */
export function toTelHref(text) {
  if (!PHONE_CHARS.test(text)) return null;
  const digits = text.replace(/\D/g, '');
  // 3-digit service codes (711, 211) or 7–15 digit numbers; rejects years etc.
  if (digits.length !== 3 && (digits.length < 7 || digits.length > 15)) return null;
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `tel:+${digits}`;
  return `tel:${text.trim().startsWith('+') ? '+' : ''}${digits}`;
}

/**
 * Returns a mailto: href for an email address, or null.
 * @param {string} text
 * @returns {string|null}
 */
export function toMailtoHref(text) {
  return EMAIL.test(text) ? `mailto:${text}` : null;
}

/** Moves a cell's content into a fresh element, unwrapping a lone <p>. */
function cellContent(cell, tag, className) {
  const el = document.createElement(tag);
  el.className = className;
  const source = cell.children.length === 1 && cell.firstElementChild.tagName === 'P'
    ? cell.firstElementChild
    : cell;
  el.append(...source.childNodes);
  return el;
}

function buildValue(cell, labelId) {
  const text = cell.textContent.replace(/\s+/g, ' ').trim();
  const tel = toTelHref(text);
  const mailto = tel ? null : toMailtoHref(text);
  if (!tel && !mailto) return cellContent(cell, 'p', 'contact-directory-value');

  const p = document.createElement('p');
  p.className = 'contact-directory-value';
  const a = document.createElement('a');
  a.href = tel || mailto;
  a.className = tel ? 'contact-directory-phone' : 'contact-directory-email';
  if (labelId) a.setAttribute('aria-describedby', labelId);
  if (mailto) {
    // allow long addresses to wrap after the @ instead of overflowing
    const [user, domain] = text.split('@');
    a.append(`${user}@`, document.createElement('wbr'), domain);
  } else {
    a.textContent = text;
  }
  p.append(a);
  return p;
}

export default function decorate(block) {
  instance += 1;
  const ul = document.createElement('ul');
  ul.className = 'contact-directory-list';

  [...block.children].forEach((row, i) => {
    const [labelCell, valueCell, noteCell] = row.children;
    if (!labelCell && !valueCell) return;
    if (!row.textContent.trim()) return;

    const li = document.createElement('li');
    li.className = 'contact-directory-item';
    const labelId = `contact-directory-${instance}-${i}`;

    if (labelCell) {
      const label = cellContent(labelCell, 'p', 'contact-directory-label');
      label.id = labelId;
      li.append(label);
    }
    if (valueCell && valueCell.textContent.trim()) {
      li.append(buildValue(valueCell, labelCell ? labelId : null));
    }
    if (noteCell && noteCell.textContent.trim()) {
      li.append(cellContent(noteCell, 'p', 'contact-directory-note'));
    }
    ul.append(li);
  });

  block.replaceChildren(ul);
}

/*
 * forms-accordion — categorized library of provider forms, grouped into
 * collapsible topic sections plus a standalone "PCP Change Form" list.
 *
 * Source: https://provider.healthybluenc.com/north-carolina-provider/forms
 * (section.accordions of .accordion-item panels — each an .accordion-title
 * with a plus/minus-circle toggle over .accordion-content holding
 * div.pdflist links — followed by an "h2 + ul.pdflist" PCP Change Form list).
 *
 * Fetches the GPP forms-library service and buckets documents by the fixed
 * topic list below; whatever has no topic and a title starting with
 * "PCP Change Form" becomes the trailing PCP Change Form list.
 */

import { decorateIcons, sampleRUM } from '../../scripts/aem.js';
import { fetchFormsData } from '../../scripts/lookup-service.js';

const DOC_BASE_URL = 'https://provider.healthybluenc.com';

const ACCORDION_TOPICS = [
  'Prior Authorizations',
  'Claims & Billing',
  'Behavioral Health',
  'Pharmacy',
  'Maternal Child Services',
  'Other Forms',
];

function resolveDocUrl(uri) {
  if (!uri) return '#';
  return uri.startsWith('/') ? `${DOC_BASE_URL}${uri}` : uri;
}

function buildDocLink(doc) {
  const a = document.createElement('a');
  a.className = 'forms-accordion-link';
  a.href = resolveDocUrl(doc.URI);
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', `${doc.title} PDF`);
  a.textContent = doc.title;
  return a;
}

function buildAccordionItem(topic, docs, open) {
  const icon = document.createElement('span');
  icon.className = 'forms-accordion-item-icon';
  const closedIcon = document.createElement('span');
  closedIcon.className = 'icon icon-plus-circle';
  const openIcon = document.createElement('span');
  openIcon.className = 'icon icon-minus-circle';
  icon.append(closedIcon, openIcon);

  const title = document.createElement('span');
  title.className = 'forms-accordion-item-title';
  title.textContent = topic;

  const summary = document.createElement('summary');
  summary.className = 'forms-accordion-item-label';
  summary.append(icon, title);

  const body = document.createElement('div');
  body.className = 'forms-accordion-item-body';
  docs.forEach((doc) => body.append(buildDocLink(doc)));

  const details = document.createElement('details');
  details.className = 'forms-accordion-item';
  details.open = open;
  details.append(summary, body);
  return details;
}

function buildPcpSection(docs) {
  const section = document.createElement('div');
  section.className = 'forms-accordion-pcp';

  const heading = document.createElement('h2');
  heading.textContent = 'PCP Change Form';

  const list = document.createElement('ul');
  list.className = 'forms-accordion-pcp-list';
  docs.forEach((doc) => {
    const li = document.createElement('li');
    li.append(buildDocLink(doc));
    list.append(li);
  });

  section.append(heading, list);
  return section;
}

export default async function decorate(block) {
  block.textContent = '';

  const list = document.createElement('div');
  list.className = 'forms-accordion-list';
  list.textContent = 'Loading forms…';
  block.append(list);

  try {
    const data = await fetchFormsData();
    const docs = data?.AllDocs ?? [];

    list.textContent = '';
    ACCORDION_TOPICS.forEach((topic, index) => {
      const topicDocs = docs.filter((doc) => Array.isArray(doc.topic) && doc.topic.includes(topic));
      list.append(buildAccordionItem(topic, topicDocs, index === 0));
    });

    const pcpDocs = docs.filter((doc) => (!doc.topic || doc.topic.length === 0)
      && (doc.title || '').startsWith('PCP Change Form'));
    block.append(buildPcpSection(pcpDocs));
    decorateIcons(block);
  } catch (err) {
    list.textContent = 'Unable to load forms right now. Please try again later.';
    block.dataset.loadError = err.message;
    sampleRUM('error', { source: 'forms-accordion', target: err.message });
  }
}

import { createModal } from '../blocks/modal/modal.js';

const INTERSTITIAL_CLASS = 'external-link-interstitial';
const SKIP_ATTRIBUTE = 'data-skip-external-link-interstitial';
let dialogOpening = false;

function isExternalLink(link) {
  if (!link || link.hasAttribute('download') || link.hasAttribute(SKIP_ATTRIBUTE)) return false;

  const url = new URL(link.href, window.location.href);
  return ['http:', 'https:'].includes(url.protocol) && url.origin !== window.location.origin;
}

function createDialogContent(destination) {
  const title = document.createElement('h2');
  title.id = 'external-link-interstitial-title';
  title.append("You're leaving our ", document.createElement('br'), 'site');

  const description = document.createElement('p');
  description.id = 'external-link-interstitial-description';
  description.textContent = 'Would you like to continue?';

  const actions = document.createElement('div');
  actions.className = 'external-link-interstitial-actions';

  const continueLink = document.createElement('a');
  continueLink.className = 'external-link-interstitial-continue';
  continueLink.href = destination;
  continueLink.target = '_blank';
  continueLink.rel = 'noopener';
  continueLink.textContent = 'Yes, please continue';

  const cancelButton = document.createElement('button');
  cancelButton.className = 'external-link-interstitial-cancel';
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';

  actions.append(continueLink, cancelButton);
  return {
    actions,
    cancelButton,
    continueLink,
    description,
    title,
  };
}

async function openExternalLinkInterstitial(link) {
  if (dialogOpening || document.querySelector(`.${INTERSTITIAL_CLASS}`)) return;
  dialogOpening = true;

  try {
    const content = createDialogContent(link.href);
    const { block, dialog, showModal } = await createModal([
      content.title,
      content.description,
      content.actions,
    ]);

    block.classList.add(INTERSTITIAL_CLASS);
    dialog.setAttribute('aria-labelledby', content.title.id);
    dialog.setAttribute('aria-describedby', content.description.id);

    content.cancelButton.addEventListener('click', () => dialog.close());
    content.continueLink.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => link.focus(), { once: true });

    showModal();
    content.cancelButton.focus();
  } finally {
    dialogOpening = false;
  }
}

export default function decorateExternalLinks(doc) {
  if (!doc.body.classList.contains('north-carolina')) return;

  doc.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (
      event.defaultPrevented
      || link?.closest(`.${INTERSTITIAL_CLASS}`)
      || !isExternalLink(link)
    ) return;

    event.preventDefault();
    openExternalLinkInterstitial(link).catch(() => window.location.assign(link.href));
  });
}

/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: healthybluenc (North Carolina provider) site-wide cleanup.
 * All selectors verified against migration-work/cleaned.html.
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
    // Overlays / modals + in-page search that would interfere with block parsing.
    // Found in cleaned.html:
    //   <div class="search-area hidden s_screen"> in-page search widget (first child of <main>)
    //   <div class="modal"> "You're leaving our site" interstitial
    //   <div class="modal_background">
    //   <div class="email-optin-modal"> email sign-up modal form
    WebImporter.DOMUtils.remove(element, [
      '.search-area',
      '.modal',
      '.modal_background',
      '.email-optin-modal',
    ]);
  }

  if (hookName === H.after) {
    // Non-authorable site chrome. Selectors from cleaned.html:
    //   <a class="skip" ...> skip links
    //   <header id="header"> site header (logo, login, members, search)
    //   <nav id="navigation"> main + utility navigation
    //   <footer id="footer"> footer
    //   <iframe id="destination_publishing_iframe_wellpoint_0"> Adobe ID sync iframe
    //   <link rel="stylesheet" ...> conditional-comment stylesheet link
    WebImporter.DOMUtils.remove(element, [
      'a.skip',
      'header#header',
      'nav#navigation',
      'footer#footer',
      'iframe',
      'link',
      'noscript',
    ]);
  }
}

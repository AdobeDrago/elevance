export default function decorate(block) {
  [...block.children].forEach((content) => {
    content.className = 'more-resources-content';
    [...content.children].forEach((divs) => {
      divs.className = 'more-resources-card';

      [...divs.children].forEach((child) => {
        switch (child.tagName) {
          case 'P':
            if (child.classList.contains('button-container')) {
              child.className = 'more-resources-card-arrow-link';
              child.querySelector('a').className = '';
            } else {
              child.className = 'more-resources-card-description';
            }
            break;
          case 'H1':
          case 'H2':
          case 'H3':
          case 'H4':
          case 'H5':
          case 'H6':
            child.className = 'more-resources-card-title';
            break;
          default:
            break;
        }
      });
    });
  });
}

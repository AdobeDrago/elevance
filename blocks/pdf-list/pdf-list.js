export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.classList.add('pdf-list');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.classList.add('pdf-list-item');

    const links = row.querySelectorAll('a');
    if (links.length > 0) {
      links.forEach((link) => {
        link.classList.remove('button');
        link.setAttribute('download', '');
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');

        const srText = document.createElement('span');
        srText.className = 'sr-only';
        srText.textContent = ' (PDF download)';
        link.append(srText);

        li.append(link);
      });
      ul.append(li);
    } else if (row.textContent.trim()) {
      li.textContent = row.textContent.trim();
      ul.append(li);
    }
  });

  block.textContent = '';
  block.append(ul);
}

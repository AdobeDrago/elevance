const params = new URLSearchParams(window.location.search);
const name = params.get('block') || 'cards-topics';
const authorView = params.get('view') === 'author';
const samples = await fetch('./samples.json').then((response) => response.json());
const sample = samples[name];
const label = document.querySelector('.sample-label');
const main = document.querySelector('main');

if (!sample) {
  document.body.className = 'appear documentation-sample';
  label.textContent = 'No sample is defined for this block.';
} else {
  const viewTitle = authorView ? 'Illustrative authoring table' : 'Local rendered sample';
  const note = sample.note || 'Example content for documentation.';
  label.textContent = `${viewTitle}: ${name}. Not an existing DA page. ${note}`;
  document.title = `${name} ${authorView ? 'authoring table' : 'rendered sample'} | Author guide`;

  if (authorView) {
    document.body.className = 'appear documentation-sample';
    const table = document.createElement('table');
    const heading = table.createTHead().insertRow().insertCell();
    heading.colSpan = Math.max(...sample.rows.map((row) => row.length));
    const variant = sample.classes ? ` (${sample.classes.join(', ')})` : '';
    heading.textContent = `${name}${variant}`;
    const body = table.createTBody();
    sample.rows.forEach((cells) => {
      const row = body.insertRow();
      cells.forEach((content) => { row.insertCell().innerHTML = content; });
    });
    main.append(table);
  } else {
    const section = document.createElement('div');
    const block = document.createElement('div');
    block.classList.add(name, ...(sample.classes || []));
    sample.rows.forEach((cells) => {
      const row = document.createElement('div');
      cells.forEach((content) => {
        const cell = document.createElement('div');
        cell.innerHTML = content;
        row.append(cell);
      });
      block.append(row);
    });
    section.append(block);
    main.append(section);
    // Use the site's real decorators and block modules, including theme and buttons.
    await import('../../scripts/scripts.js');
    document.body.classList.add('documentation-sample');
  }
}

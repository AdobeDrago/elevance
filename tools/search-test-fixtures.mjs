import { readFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function fixture(test) {
  const config = JSON.parse(await readFile(new URL('../asset-index.config.json', import.meta.url)));
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'elevance-search-'));
  test.after(() => rm(cwd, { recursive: true, force: true }));
  return {
    config, cwd, token: 'test-token', wait: async () => {},
  };
}

// A real, minimal two-page PDF exercises PDF.js instead of mocking the extraction library.
export function samplePDF(title = 'Clinical Guide') {
  const streams = ['Prior authorization therapy', 'Second page treatment criteria'];
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ...streams.map((value) => {
      const stream = `BT /F1 12 Tf 50 700 Td (${value}) Tj ET`;
      return `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    }),
    `<< /Title (${title}) >>`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 8 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf));
}

export const modified = 'Fri, 25 Sep 2026 16:37:53 GMT';

export function mockDA(config, state = {}) {
  const calls = [];
  const prefix = `/${config.org}/${config.site}`;
  const listing = state.listing || {
    '/pdfs': [
      { path: `${prefix}/pdfs/clinical-guide.pdf`, ext: 'pdf' },
      { path: `${prefix}/pdfs/preview-only.pdf`, ext: 'pdf' },
      { path: `${prefix}/pdfs/source-only.pdf`, ext: 'pdf' },
      { path: `${prefix}/pdfs/forms` },
      { path: `${prefix}/pdfs/forms` },
      { path: `${prefix}/pdfs/logo.png`, ext: 'png' },
    ],
    '/pdfs/forms': [
      { path: `${prefix}/pdfs/forms/referral-form.docx`, ext: 'docx' },
      { path: `${prefix}/pdfs/clinical-guide.pdf`, ext: 'pdf' },
    ],
  };
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    const file = decodeURIComponent(parsed.pathname);
    calls.push({ url: parsed, options });
    if (parsed.hostname === 'admin.da.live') {
      const root = file.replace(`/list${prefix}`, '');
      return Response.json(listing[root] || []);
    }
    const missing = file.endsWith('source-only.pdf')
      || (file.endsWith('preview-only.pdf') && parsed.hostname.endsWith('.aem.live'))
      || state.removed?.includes(file);
    if (missing) return new Response(null, { status: state.missingStatus || 404 });
    if (state.fail?.includes(file)) return new Response(null, { status: 503 });
    const headers = { 'last-modified': state.modified || modified };
    if (options.method === 'HEAD') return new Response(null, { headers });
    return new Response(samplePDF(state.title ?? 'Clinical Guide'), { headers });
  };
  return { fetchImpl, calls };
}

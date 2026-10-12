import path from 'node:path';
import {
  cleanText, cliOptions, deliveryOrigin, fingerprint, isMain, listURL, readConfig,
  readJSON, request, runCLI, validateConfig, validateOutputPaths, writeJSON,
} from './search-index-utils.mjs';

export function assetPath(value, config) {
  const prefix = `/${config.org}/${config.site}`;
  if (typeof value !== 'string' || !value.startsWith(`${prefix}/`)) {
    throw new Error('DA returned a path outside the configured site');
  }
  const relative = value.slice(prefix.length);
  // eslint-disable-next-line no-control-regex
  if (relative.includes('\\') || /[?#\u0000-\u001f]/u.test(relative)
    || relative.split('/').some((part) => part === '..' || part === '.')) {
    throw new Error(`Unsafe DA path: ${relative}`);
  }
  if (!config.roots.some((root) => relative === root || relative.startsWith(`${root}/`))) {
    throw new Error(`DA returned a path outside the configured roots: ${relative}`);
  }
  return relative;
}

export async function discoverAssets(config, token, dependencies = {}) {
  const pending = [...config.roots];
  const directories = new Set();
  const files = new Map();
  while (pending.length) {
    const directory = pending.shift();
    if (!directories.has(directory)) {
      directories.add(directory);
      const { body } = await request(listURL(config, directory), {
        headers: { Authorization: `Bearer ${token}` }, responseType: 'json',
      }, dependencies);
      if (!Array.isArray(body)) throw new Error(`Invalid DA listing at ${directory}`);
      for (const entry of body) {
        const relative = assetPath(entry.path, config);
        if (!entry.ext) pending.push(relative);
        else if (config.extensions.includes(entry.ext.toLowerCase())) files.set(relative, entry);
        if (files.size > config.maxFiles) throw new Error('maxFiles exceeded; refusing a truncated index');
      }
    }
  }
  if (files.size < config.minimumFiles) {
    throw new Error('DA discovery is below minimumFiles; preserving the existing index');
  }
  return [...files.keys()].sort();
}

export function filenameTitle(file) {
  const stem = path.posix.basename(file).replace(/\.[^.]+$/, '');
  return cleanText(stem.replace(/[-_]+/g, ' ')).replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

export async function extractPDF(bytes, config) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false });
  try {
    const pdf = await task.promise;
    const metadata = await pdf.getMetadata();
    const title = cleanText(metadata.info?.Title || metadata.metadata?.get('dc:title') || '');
    const pages = config.pdfMaxPages ? Math.min(pdf.numPages, config.pdfMaxPages) : pdf.numPages;
    let content = '';
    const cap = config.contentMaxCharacters;
    for (let number = 1; number <= pages && content.length < cap; number += 1) {
      const page = await pdf.getPage(number);
      try {
        const text = await page.getTextContent();
        content = cleanText(`${content} ${text.items.map((item) => item.str || '').join(' ')}`)
          .slice(0, config.contentMaxCharacters);
      } finally {
        page.cleanup();
      }
    }
    return { title, content };
  } finally {
    await task.destroy();
  }
}

async function indexAsset(file, config, environment, previous, dependencies) {
  const url = `${deliveryOrigin(config, environment)}${file.split('/').map(encodeURIComponent).join('/')}`;
  const { response } = await request(url, { method: 'HEAD', allowMissing: true }, dependencies);
  if ([404, 410].includes(response.status)) return null;
  const modified = response.headers.get('last-modified');
  const lastModified = modified && Number.isFinite(Date.parse(modified))
    ? new Date(modified).toISOString() : '';
  if (lastModified && previous?.lastModified === lastModified) return previous;
  const type = path.posix.extname(file).slice(1).toLowerCase();
  let extracted = { title: '', content: '' };
  if (type === 'pdf') {
    const { body, response: download } = await request(url, {
      responseType: 'bytes', allowMissing: true,
    }, dependencies);
    if ([404, 410].includes(download.status)) return null;
    // If the document changed between HEAD and GET, refuse to cache mismatched text/metadata.
    if (modified && download.headers.get('last-modified') !== modified) {
      throw new Error(`Delivery changed during indexing: ${file}; retry the run`);
    }
    extracted = await (dependencies.extractPDF || extractPDF)(body, config);
  }
  const title = cleanText(extracted.title) || filenameTitle(file);
  const content = cleanText(extracted.content).slice(0, config.contentMaxCharacters);
  return {
    path: file,
    title,
    header: title,
    description: content.slice(0, 240),
    content,
    topic: 'documents',
    type,
    lastModified,
  };
}

export async function buildAssetIndex(config, environment, options = {}) {
  validateConfig(config);
  const { token = process.env.DA_IMS_TOKEN, cwd = process.cwd(), ...dependencies } = options;
  if (!token) throw new Error('DA_IMS_TOKEN is required');
  const origin = deliveryOrigin(config, environment);
  await validateOutputPaths(config, cwd);
  const output = path.join(cwd, config.outputs[environment]);
  const previous = await readJSON(output);
  const configFingerprint = fingerprint(config, environment);
  const cached = new Map((previous?.fingerprint === configFingerprint
    && previous?.environment === environment && previous?.origin === origin
    ? previous.data : []).map((record) => [record.path, record]));
  const files = await discoverAssets(config, token, dependencies);
  const records = new Array(files.length);
  const failures = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(config.concurrency, files.length) }, async () => {
    while (next < files.length) {
      const index = next;
      next += 1;
      try {
        records[index] = await indexAsset(
          files[index],
          config,
          environment,
          cached.get(files[index]),
          dependencies,
        );
      } catch (error) {
        failures.push(`${files[index]}: ${error.message}`);
      }
    }
  }));
  if (failures.length && !config.allowPartial) {
    throw new Error(`Preserving complete index; ${failures.length} asset(s) failed:\n${failures.join('\n')}`);
  }
  const data = records.filter(Boolean);
  const result = {
    total: data.length,
    offset: 0,
    limit: data.length,
    environment,
    origin,
    fingerprint: configFingerprint,
    data,
  };
  if (failures.length) result.failures = failures.sort();
  const changed = await writeJSON(output, result);
  return { ...result, changed };
}

if (isMain(import.meta.url)) {
  await runCLI(async () => {
    const options = cliOptions();
    const result = await buildAssetIndex(await readConfig(options.config), options.environment);
    console.log(`${options.environment}: ${result.total} assets, ${result.changed ? 'updated' : 'unchanged'}`);
  });
}

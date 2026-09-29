import { createHash, randomUUID } from 'node:crypto';
import {
  readFile, writeFile, rename, mkdir, lstat, rm,
} from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ENVIRONMENTS = ['preview', 'live'];
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

export function cleanText(value = '') {
  return String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
}

export function deliveryOrigin(config, environment) {
  if (!ENVIRONMENTS.includes(environment)) throw new Error('Expected preview or live environment');
  return `https://${config.branch}--${config.site}--${config.org}.aem.${environment === 'preview' ? 'page' : 'live'}`;
}

export function validateRoots(roots) {
  if (!Array.isArray(roots) || !roots.length || roots.some((root) => (
    typeof root !== 'string' || !/^\/[a-zA-Z0-9_/-]+$/.test(root)
    || root === '/' || root.endsWith('/') || root.includes('//')
  ))) throw new Error('roots must contain narrow absolute directory paths, never the site root');
  return [...new Set(roots)].sort();
}

export function outputPaths(config) {
  const outputs = ENVIRONMENTS.flatMap((env) => [
    config.outputs?.[env], config.keyPhrases?.outputs?.[env],
  ]);
  if (new Set(outputs).size !== 4 || outputs.some((file) => (
    typeof file !== 'string' || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.json$/.test(file)
    || ['package.json', 'package-lock.json', 'asset-index.config.json'].includes(file)
  ))) throw new Error('The four outputs must be unique safe repository-relative JSON paths');
  return outputs;
}

export async function validateOutputPaths(config, cwd = process.cwd()) {
  const outputs = outputPaths(config);
  for (const file of outputs) {
    let current = cwd;
    for (const segment of file.split('/')) {
      current = path.join(current, segment);
      try {
        if ((await lstat(current)).isSymbolicLink()) throw new Error(`Output uses a symlink: ${file}`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
  return outputs;
}

export function validateConfig(config) {
  for (const key of ['org', 'site', 'branch']) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config[key] || '')) {
      throw new Error(`Invalid ${key} in asset-index configuration`);
    }
  }
  validateRoots(config.roots);
  outputPaths(config);
  if (!Array.isArray(config.extensions) || !config.extensions.length
    || config.extensions.some((ext) => !/^[a-z0-9]+$/.test(ext))) {
    throw new Error('extensions must contain lowercase file extensions');
  }
  for (const key of ['minimumFiles', 'maxFiles', 'contentMaxCharacters', 'concurrency']) {
    if (!Number.isSafeInteger(config[key]) || config[key] < 1) throw new Error(`Invalid ${key}`);
  }
  if (config.minimumFiles > config.maxFiles) throw new Error('minimumFiles exceeds maxFiles');
  if (!Number.isSafeInteger(config.pdfMaxPages) || config.pdfMaxPages < 0) {
    throw new Error('Invalid pdfMaxPages');
  }
  if (typeof config.allowPartial !== 'boolean') throw new Error('allowPartial must be boolean');
  const phrases = config.keyPhrases;
  for (const key of ['minimumLength', 'maximumLength', 'maximumPhrases']) {
    if (!Number.isSafeInteger(phrases[key]) || phrases[key] < 1) throw new Error(`Invalid ${key}`);
  }
  if (phrases.minimumLength > phrases.maximumLength
    || !/^\/[a-zA-Z0-9_/-]+\.json$/.test(phrases.pageIndexPath || '')
    || !Array.isArray(phrases.excludePaths)
    || phrases.excludePaths.some((route) => !/^\/[a-zA-Z0-9_/-]+$/.test(route))) {
    throw new Error('Invalid keyPhrases configuration');
  }
  return config;
}

export async function readConfig(file) {
  const config = JSON.parse(await readFile(file, 'utf8'));
  validateConfig(config);
  await validateOutputPaths(config);
  return config;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function fingerprint(config, environment) {
  return createHash('sha256').update(JSON.stringify(stable({
    schemaVersion: 1, config, environment,
  }))).digest('hex');
}

export async function readJSON(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeJSON(file, data) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  try {
    if (await readFile(file, 'utf8') === serialized) return false;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, serialized, { flag: 'wx' });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
  return true;
}

// Consume response bodies inside the retry boundary. The timeout also covers body reads.
export async function request(url, options = {}, dependencies = {}) {
  const {
    fetchImpl = fetch,
    wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); }),
  } = dependencies;
  const { responseType, allowMissing, ...init } = options;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, {
        ...init, redirect: 'error', signal: AbortSignal.timeout(30000),
      });
      if ([401, 403].includes(response.status)) {
        throw new Error(`HTTP ${response.status}: credential/access failure at ${new URL(url).hostname}. Check OAuth scopes and DA site read access.`);
      }
      if (allowMissing && [404, 410].includes(response.status)) return { response, body: null };
      if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
      let body = null;
      if (responseType === 'json') body = await response.json();
      if (responseType === 'bytes') body = new Uint8Array(await response.arrayBuffer());
      return { response, body };
    } catch (error) {
      if (attempt === 3 || (response && !response.ok && !RETRY_STATUSES.has(response.status))) {
        throw error;
      }
      await wait(Math.min(1000 * (2 ** attempt), 8000));
    }
  }
  throw new Error('Request failed');
}

export function listURL(config, root) {
  return `https://admin.da.live/list/${config.org}/${config.site}${root}`;
}

export function cliOptions(argv = process.argv.slice(2)) {
  const options = { config: 'asset-index.config.json', environment: 'preview' };
  for (let index = 0; index < argv.length; index += 2) {
    const key = { '--config': 'config', '--delivery-environment': 'environment' }[argv[index]];
    if (!key || !argv[index + 1]) throw new Error(`Invalid argument: ${argv[index]}`);
    options[key] = argv[index + 1];
  }
  if (!ENVIRONMENTS.includes(options.environment)) throw new Error('Expected preview or live');
  return options;
}

export function isMain(metaURL) {
  return process.argv[1] && metaURL === pathToFileURL(path.resolve(process.argv[1])).href;
}

export async function runCLI(callback) {
  try {
    await callback();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

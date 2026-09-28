import { appendFile } from 'node:fs/promises';
import {
  isMain, listURL, readConfig, request, runCLI, validateOutputPaths,
} from './search-index-utils.mjs';

export default async function prepareWorkflow() {
  const config = await readConfig('asset-index.config.json');
  const outputs = await validateOutputPaths(config);
  if (process.argv.includes('--validate-only')) return;
  const names = ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET', 'ADOBE_SCOPES'];
  for (const name of names) {
    if (!process.env[name]) throw new Error(`Missing GitHub Actions secret: ${name}`);
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.ADOBE_CLIENT_ID,
    client_secret: process.env.ADOBE_CLIENT_SECRET,
    scope: process.env.ADOBE_SCOPES,
  });
  const { body: credentials } = await request('https://ims-na1.adobelogin.com/ims/token/v3', {
    method: 'POST', body, responseType: 'json',
  });
  const token = credentials?.access_token;
  if (typeof token !== 'string' || !token || /\s/.test(token)) {
    throw new Error('Adobe IMS did not return a valid access token');
  }
  // Mask before any further step can expose the token. Never print OAuth response bodies.
  console.log(`::add-mask::${token}`);
  const { body: listing } = await request(listURL(config, config.roots[0]), {
    headers: { Authorization: `Bearer ${token}` }, responseType: 'json',
  });
  if (!Array.isArray(listing)) throw new Error('DA verification returned an invalid listing');
  if (!process.env.GITHUB_ENV || !process.env.GITHUB_OUTPUT) {
    throw new Error('Token minting must run inside GitHub Actions');
  }
  await appendFile(process.env.GITHUB_ENV, `DA_IMS_TOKEN=${token}\n`);
  await appendFile(process.env.GITHUB_OUTPUT, `files=${JSON.stringify(outputs)}\n`);
}

if (isMain(import.meta.url)) await runCLI(prepareWorkflow);

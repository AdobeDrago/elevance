import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import {
  normalizeText, preparePhrases, rankPhrases,
} from '../scripts/search-autocomplete.js';
import { prepareSearchData, searchRecords } from '../scripts/search-data.js';
import { referencePhrases, referenceSearch } from './search-reference.mjs';
import { isMain, runCLI } from './search-index-utils.mjs';

const TOPICS = ['Care management', 'Prior authorization', 'Behavioral health', 'Pharmacy',
  'Claims', 'Provider training', 'Maternity', 'Café resources'];
export const SEARCH_QUERIES = ['care', 'care management 0', 'prior auth', 'behavioral health',
  'pdf pharmacy', 'outpatient criteria', 'authorization treatment', 'café resources',
  'claims guidance', 'guide 42', 'management medical', 'doesnotexist'];

// Deterministic synthetic text, with varied vocabulary/lengths and unique bodies.
// It models text volume, not actual DA documents or a measured production distribution.
export function createSearchCorpus(count, characters = 12000) {
  return Array.from({ length: count }, (_, index) => {
    const topic = TOPICS[index % TOPICS.length];
    const related = TOPICS[(index + 3) % TOPICS.length];
    const sentence = `Section ${index}. ${topic}: médical guidance and ${related} resources. `;
    const length = Math.max(100, Math.round(characters * (0.5 + (index % 11) / 10)));
    const text = sentence.repeat(Math.ceil(length / sentence.length)).slice(0, length);
    const tail = index % 7 === 0 ? ' Outpatient criteria for authorization treatment.' : '';
    return {
      path: `/pdfs/guide-${index}.pdf`,
      title: `${topic} ${index}`,
      header: `${topic} guide`,
      description: `Provider guidance: ${related}.`,
      content: `${text}${tail}`,
      topic: 'medical documents',
      type: 'pdf',
      robots: index % 29 === 28 ? 'noindex' : '',
    };
  });
}

export function createPhraseCatalog(count) {
  return Array.from({ length: count }, (_, index) => {
    const phrase = `${TOPICS[index % TOPICS.length]} guide ${index}`;
    return { phrase, normalized: normalizeText(phrase), sourceCount: (index % 9) + 1 };
  });
}

function summarize(times) {
  const sorted = [...times].sort((a, b) => a - b);
  return {
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
  };
}

function compareQueries(records, queries, reference, optimized, iterations) {
  // Warm both paths and verify every query before collecting timings.
  for (const query of queries) {
    assert.deepEqual(optimized(records, query), reference(records, query));
  }
  const referenceTimes = [];
  const optimizedTimes = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const query of queries) {
      const runs = [
        { search: reference, times: referenceTimes },
        { search: optimized, times: optimizedTimes },
      ];
      if (iteration % 2) runs.reverse();
      for (const { search, times } of runs) {
        const start = performance.now();
        search(records, query);
        times.push(performance.now() - start);
      }
    }
  }
  const before = summarize(referenceTimes);
  const after = summarize(optimizedTimes);
  return { before, after, medianSpeedup: before.medianMs / after.medianMs };
}

function measurePreparation(records, prepare) {
  globalThis.gc?.();
  const heapBefore = process.memoryUsage().heapUsed;
  const start = performance.now();
  prepare(records);
  const milliseconds = performance.now() - start;
  globalThis.gc?.();
  return {
    milliseconds,
    // Approximate retained heap, not browser peak memory. Only report with explicit GC.
    retainedHeapMiB: globalThis.gc
      ? (process.memoryUsage().heapUsed - heapBefore) / (1024 ** 2) : null,
  };
}

function parseOptions(args) {
  const result = {
    sizes: [100, 500, 1000], characters: 12000, phrases: 5000, iterations: 3,
  };
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index].slice(2);
    const value = args[index + 1];
    if (!args[index].startsWith('--') || !(name in result) || !value) {
      throw new Error(`Unknown or missing benchmark option: ${args[index]}`);
    }
    if (name === 'sizes') result.sizes = value.split(',').map(Number);
    else result[name] = Number(value);
  }
  const numbers = [...result.sizes, result.characters, result.phrases, result.iterations];
  if (numbers.some((number) => !Number.isSafeInteger(number) || number < 1)) {
    throw new Error('Benchmark options must be positive integers');
  }
  return result;
}

export function runBenchmark(options) {
  const search = options.sizes.map((count) => {
    const serialized = JSON.stringify(createSearchCorpus(count, options.characters));
    const start = performance.now();
    const records = JSON.parse(serialized);
    const parseMs = performance.now() - start;
    return {
      documents: count,
      jsonMiB: Buffer.byteLength(serialized) / (1024 ** 2),
      parseMs,
      preparation: measurePreparation(records, prepareSearchData),
      queries: compareQueries(
        records,
        SEARCH_QUERIES,
        referenceSearch,
        searchRecords,
        options.iterations,
      ),
    };
  });
  const phrases = createPhraseCatalog(options.phrases);
  return {
    environment: { node: process.version, platform: process.platform, cpu: os.cpus()[0]?.model },
    options,
    scope: 'Synthetic local CPU benchmark; excludes network, DOM rendering, debounce and mobile devices.',
    queryCountPerAlgorithm: SEARCH_QUERIES.length * options.iterations,
    resultsEquivalent: true,
    search,
    autocomplete: {
      phrases: phrases.length,
      preparation: measurePreparation(phrases, preparePhrases),
      queries: compareQueries(
        phrases,
        SEARCH_QUERIES,
        referencePhrases,
        rankPhrases,
        options.iterations,
      ),
    },
  };
}

if (isMain(import.meta.url)) {
  await runCLI(async () => {
    console.log(JSON.stringify(runBenchmark(parseOptions(process.argv.slice(2))), null, 2));
  });
}

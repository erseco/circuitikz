/**
 * What a host pays to ship the converter, over and above `@schemd/core`.
 *
 * The whole public entry is bundled with nothing shaken away — what registry
 * size tools report, because they bundle `import * from '@schemd/circuitikz'`
 * — and `@schemd/core` is left external, because the host already ships it and
 * this package only peers on it.
 *
 * A budget moves only in the pull request whose code moves it, with a comment
 * here saying what paid for the bytes, measured against the build before it,
 * as `@schemd/core` records its own. REQUIREMENTS.md §8.5 sets the ceiling the
 * 0.1.0 release must fit under.
 */
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const BUDGETS = [
	{
		label: 'Package bundle (every public export, @schemd/core external)',
		module: '../src/index.ts',
		entry: (path) => `import * as converter from ${JSON.stringify(path)};globalThis.schemdCircuitikz=converter;`,
		/* M1 adds a bounded scanner, span-aware parser, exact coordinate resolver,
		   diagnostics and host validation. M0 measured 533 B gzip / 455 B brotli;
		   M1 measured 4406 B gzip / 3942 B brotli after front-end hardening.
		   M2 adds graph construction, component/label semantics, emission, geometry
		   preflight and independent verification: 8615 B gzip / 7762 B brotli.
		   M3 families, unary ground and precise UTF-16 label spans measure
		   9174 B gzip / 8278 B brotli and retain these same 9 KiB gates.
		   Review fixes (T-endpoint and dead-end wire rejection in the graph, subpath
		   cycle and its rejection after to[...], recovery resync, empty option entries)
		   measure 8615 -> 8892 B gzip on M2 and 9181 -> 9458 B gzip / 8278 -> 8530 B
		   brotli on M3, so the gzip gate
		   moves to 9.5 KiB; brotli keeps 9 KiB. Both stay below R-8.5.3's 12 KiB ceiling. */
		maxGzipBytes: 9.5 * 1024,
		maxBrotliBytes: 9 * 1024
	}
];

const virtualEntry = 'virtual:schemd-circuitikz-size-entry';

/** Bundle one entry and return its minified, gzip and brotli byte counts. */
async function measure({ module, entry }) {
	const modulePath = fileURLToPath(new URL(module, import.meta.url));
	const result = await build({
		configFile: false,
		logLevel: 'silent',
		plugins: [
			{
				name: 'schemd-circuitikz-size-entry',
				enforce: 'pre',
				resolveId(id) {
					if (id === virtualEntry) return `\0${virtualEntry}`;
				},
				load(id) {
					if (id === `\0${virtualEntry}`) return entry(modulePath);
				}
			}
		],
		build: {
			minify: true,
			rollupOptions: { input: virtualEntry, treeshake: true, external: [/^@schemd\/core(?:\/|$)/] },
			target: 'es2022',
			write: false
		}
	});

	const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output;
	const chunks = outputs.filter((item) => item.type === 'chunk' && item.code.length > 0);
	if (chunks.length !== 1) throw new Error(`Expected one chunk; received ${chunks.length}.`);
	return {
		minifiedBytes: Buffer.byteLength(chunks[0].code),
		gzipBytes: gzipSync(chunks[0].code, { level: 9 }).byteLength,
		brotliBytes: brotliCompressSync(chunks[0].code, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).byteLength
	};
}

const format = (bytes) => `${bytes.toLocaleString('en-US')} B`;
const failures = [];
for (const budget of BUDGETS) {
	const { minifiedBytes, gzipBytes, brotliBytes } = await measure(budget);
	console.log(
		`${budget.label}: ${format(minifiedBytes)} minified, ${format(brotliBytes)} brotli-11 (budget ${format(budget.maxBrotliBytes)}), ` +
			`${format(gzipBytes)} gzip (budget ${format(budget.maxGzipBytes)})`
	);
	if (gzipBytes > budget.maxGzipBytes) failures.push(`${budget.label} exceeds its gzip budget by ${format(gzipBytes - budget.maxGzipBytes)}.`);
	if (brotliBytes > budget.maxBrotliBytes) failures.push(`${budget.label} exceeds its brotli-11 budget by ${format(brotliBytes - budget.maxBrotliBytes)}.`);
}

if (failures.length > 0) throw new Error(failures.join('\n'));

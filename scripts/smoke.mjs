/** Smoke test of the built package (R-8.6.2) and the browser half of R-2.2.2. Run after `bun run build`. */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'vite';
import { buildNetlist, compileSchematic, parseSchematicFence } from '@schemd/core';

const root = new URL('../', import.meta.url);
const major = Number(process.versions.node.split('.')[0]);
assert.ok(major >= 24, `Node.js ${process.versions.node} is not supported: use Node.js 24 or later.`);

/** Every module under src, nested ones included, as a path without its extension. */
async function modules(directory, prefix = '') {
	const names = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) names.push(...await modules(new URL(`${entry.name}/`, directory), `${prefix}${entry.name}/`));
		else if (entry.name.endsWith('.ts')) names.push(`${prefix}${entry.name.slice(0, -'.ts'.length)}`);
	}
	return names;
}

// The build emitted every module, as code and as declarations: a stale or partial dist fails here.
for (const name of await modules(new URL('src/', root))) {
	for (const extension of ['.js', '.d.ts']) {
		const path = `dist/${name}${extension}`;
		const text = await readFile(new URL(path, root), 'utf8').catch(() => assert.fail(`${path} is missing: run bun run build.`));
		assert.ok(text.trim().length > 0, `${path} is empty.`);
	}
}

// The built entry loads in Node.js and exports exactly the public API.
const converter = await import(new URL('dist/index.js', root).href);
assert.deepEqual(Object.keys(converter).sort(), ['canonical', 'connectivityDifference', 'connectivityOf', 'convertCircuitikz'], 'dist/index.js does not export the public API.');

// The built converter on a supported circuit. Until M2 that is the pending diagnostic over the
// environment; from M2 on, this converts the issue example instead (R-8.6.2).
const fixture = (file) => readFile(new URL(`tests/fixtures/conformance/series-battery/${file}`, root), 'utf8');
const input = await fixture('input.tex');
const result = converter.convertCircuitikz(input);
// Compared as a detached copy, so any prototype compares equal, as in the fuzz contract.
assert.deepEqual(structuredClone(result), {
	ok: false, source: undefined, fence: undefined, sourceMap: [],
	diagnostics: [{ code: 'unsupported', message: 'Conversion is not implemented yet; this milestone validates the supported input syntax only.', line: 1, column: 1, endColumn: 7, severity: 'error' }]
}, 'The built converter does not answer a supported circuit as the source does.');

// The built topology helpers read core's netlist of the expected document as the TeX wires it.
const meta = JSON.parse(await fixture('meta.json'));
const netlist = buildNetlist(compileSchematic(await fixture('expected.schemd'), parseSchematicFence(meta.fence)).document);
assert.equal(converter.connectivityDifference(meta.connectivity, converter.connectivityOf(netlist)), undefined, 'The built connectivityOf disagrees with the fixture.');

/* Browser and worker hosts: bundle the built entry as one script and run it in a fresh V8 context,
   which has only the language's own globals (no process, require, window or document): any use of
   a host global throws there, and anything that ran must answer as Node.js did. Vite would only warn
   and swap an import of a Node.js module for an empty one, so that import is refused outright. */
const hostModule = (id) => id.startsWith('node:') || builtinModules.includes(id.split('/')[0]);
const bundled = await build({
	configFile: false, logLevel: 'silent',
	plugins: [{
		name: 'refuse-host-modules', enforce: 'pre',
		resolveId(id, importer) {
			if (hostModule(id)) throw new Error(`${importer ?? 'dist'} imports the Node.js module ${id}, which a browser or worker does not have.`);
		}
	}],
	build: { write: false, target: 'es2022', minify: false, lib: { entry: fileURLToPath(new URL('dist/index.js', root)), formats: ['iife'], name: 'Circuitikz' } }
});
// An iife build cannot split into chunks, so its one chunk is the whole script.
const [script] = (Array.isArray(bundled) ? bundled.flatMap((item) => item.output) : bundled.output).filter((item) => item.type === 'chunk');
const context = Object.create(null);
runInNewContext(`${script.code}\nresult = Circuitikz.convertCircuitikz(${JSON.stringify(input)});`, context, { timeout: 2000 });
assert.deepEqual(structuredClone(context.result), structuredClone(result), 'The browser bundle answers differently from Node.js.');

console.log(`PASS: Node.js ${process.versions.node} loads every built module and the public API, and a browser bundle with no host globals converts as Node.js does.`);

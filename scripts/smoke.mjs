/** Exercise shipped JS, declarations, and a browser-target bundle without host globals. */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { build } from 'vite';
import { buildNetlist, compileSchematic, parseSchematicFence } from '@schemd/core';
import * as converter from '../dist/index.js';

assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'Use supported Node.js 24+');
assert.deepEqual(Object.keys(converter).sort(), ['canonical', 'connectivityDifference', 'connectivityOf', 'convertCircuitikz']);
const input = await readFile(new URL('../tests/fixtures/conformance/series-battery/input.tex', import.meta.url), 'utf8');
const expected = converter.convertCircuitikz(input);
assert.equal(expected.ok, true);
assert.deepEqual(expected.diagnostics, []);
const source = await readFile(new URL('../tests/fixtures/conformance/series-battery/expected.schemd', import.meta.url), 'utf8');
const meta = JSON.parse(await readFile(new URL('../tests/fixtures/conformance/series-battery/meta.json', import.meta.url), 'utf8'));
assert.equal(expected.source, source);
assert.equal(converter.connectivityDifference(meta.connectivity, converter.connectivityOf(buildNetlist(compileSchematic(source, parseSchematicFence(meta.fence)).document))), undefined);

async function modules(directory, prefix = '') {
	const paths = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) paths.push(...await modules(new URL(`${entry.name}/`, directory), `${prefix}${entry.name}/`));
		else if (entry.name.endsWith('.ts')) paths.push(`${prefix}${entry.name.slice(0, -3)}`);
	}
	return paths;
}
for (const name of await modules(new URL('../src/', import.meta.url))) {
	assert.ok((await readFile(new URL(`../dist/${name}.js`, import.meta.url), 'utf8')).length >= 0);
	assert.ok((await readFile(new URL(`../dist/${name}.d.ts`, import.meta.url), 'utf8')).length >= 0);
}

const result = await build({
	configFile: false, logLevel: 'silent',
	build: {
		write: false, target: 'es2022',
		lib: { entry: new URL('../dist/index.js', import.meta.url).pathname, formats: ['iife'], name: 'Circuitikz' }
	}
});
const outputs = Array.isArray(result) ? result.flatMap((r) => r.output) : result.output;
const chunks = outputs.filter((o) => o.type === 'chunk');
assert.equal(chunks.length, 1);
const context = Object.assign(Object.create(null), { TextEncoder, TextDecoder });
runInNewContext(`${chunks[0].code}\nresult = Circuitikz.convertCircuitikz(${JSON.stringify(input)});`, context, { timeout: 2000 });
assert.deepEqual(JSON.parse(JSON.stringify(context.result)), JSON.parse(JSON.stringify(expected)));
assert.equal(context.process, undefined);
assert.equal(context.require, undefined);
assert.equal(context.document, undefined);
assert.equal(context.window, undefined);
console.log(`PASS: Node ${process.versions.node} built exports, recursive JS/declaration outputs, and browser/worker-compatible bundle without Node or DOM globals.`);

import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const rejected = (diagnostics) => `{ok:false,source:undefined,fence:undefined,sourceMap:[],diagnostics:${diagnostics}}`;
const error = (fields) => `{code:'syntax',message:'m',line:1,column:1,endColumn:1,severity:'error',${fields}}`;

/** Runs the real fuzz script against a stand-in converter in a scratch package, so a converter
 * that breaks the contract can be shown to fail the gate. Nothing in src or dist changes. */
async function fuzz(converter, args = ['--cases=1', '--seed=1']) {
	const directory = await mkdtemp(join(tmpdir(), 'circuitikz-fuzz-contract-'));
	try {
		for (const path of ['scripts', 'dist', 'tests/fixtures/conformance/one', 'tests/fixtures/rejections/two']) await mkdir(join(directory, path), { recursive: true });
		await symlink(resolve('node_modules'), join(directory, 'node_modules'), 'dir');
		await cp('scripts/fuzz.mjs', join(directory, 'scripts/fuzz.mjs'));
		await writeFile(join(directory, 'package.json'), '{"type":"module"}');
		await writeFile(join(directory, 'dist/index.js'), converter);
		await writeFile(join(directory, 'dist/limits.js'), 'export const LIMITS = {sourceLength:4,braceDepth:2,statements:2,pathElements:2,components:2};');
		await writeFile(join(directory, 'tests/fixtures/conformance/one/input.tex'), '\\begin{circuitikz}\\end{circuitikz}');
		await writeFile(join(directory, 'tests/fixtures/rejections/two/input.tex'), '\\begin{circuitikz}\\draw (0,0)\\end{circuitikz}');
		const result = spawnSync(process.execPath, ['scripts/fuzz.mjs', ...args], { cwd: directory, encoding: 'utf8', timeout: 15_000 });
		expect(result.error).toBeUndefined();
		const failure = await readFile(join(directory, 'fuzz-failure-1.json'), 'utf8').then(JSON.parse, () => undefined);
		return { status: result.status, output: result.stdout + result.stderr, failure };
	} finally { await rm(directory, { force: true, recursive: true }); }
}

describe('fuzz infrastructure', () => {
	it('passes a converter that keeps the contract, across every input mode', async () => {
		const result = await fuzz(`export function convertCircuitikz(){return ${rejected(`[${error('')}]`)};}`, ['--cases=40', '--seed=1']);
		expect(result.status).toBe(0);
		expect(result.output).toContain('Fuzz seed: 1; cases: 40');
		expect(result.output).toContain('PASS: 40 reproducible fuzz cases (80 conversions).');
		expect(result.failure).toBeUndefined();
	});

	it('writes a minimized reproducible input and exits nonzero for a thrown error', async () => {
		const { status, failure } = await fuzz('export function convertCircuitikz(){throw new Error("controlled failure");}');
		expect(status).toBe(1);
		expect(failure).toMatchObject({ seed: 1, index: 0, original: '%%%', input: '', error: 'Error: controlled failure' });
	});

	it('terminates a hung converter in its worker and records the responsible input', async () => {
		const { status, failure } = await fuzz('export function convertCircuitikz(){while(true){}}');
		expect(status).toBe(1);
		expect(failure).toMatchObject({ index: 0, original: '%%%', input: '', error: 'Worker exceeded the per-input 2000 ms deadline.' });
	}, 20_000);

	// Each stand-in breaks one clause of R-8.3.2 on every input, so the minimized input is empty.
	it.each([
		{ name: 'a result of the wrong shape', converter: 'return {ok:"no",diagnostics:[],sourceMap:[]};', error: 'AssertionError' },
		{ name: 'a different result on the second call', converter: `globalThis.n=(globalThis.n??0)+1;return ${rejected(`[${error("message:'m'+globalThis.n")}]`)};`, error: 'conversion is not deterministic' },
		{ name: 'ok with an error diagnostic', converter: `return {ok:true,source:'',fence:undefined,sourceMap:[],diagnostics:[${error('')}]};`, error: 'AssertionError' },
		{ name: 'a diagnostic on a line the input lacks', converter: `return ${rejected(`[${error('line:2')}]`)};`, error: 'AssertionError' },
		{ name: 'a span past the end of its line', converter: `return ${rejected(`[${error('column:9,endColumn:9')}]`)};`, error: 'AssertionError' },
		{ name: 'an end column before its start', converter: `return ${rejected(`[${error('column:2,endColumn:1')}]`)};`, error: 'AssertionError' },
		{ name: 'diagnostics out of order', converter: `return ${rejected(`[${error('column:3,endColumn:3')},${error('')}]`)};`, error: 'AssertionError' },
		{ name: 'an internal diagnostic', converter: `return ${rejected(`[${error("code:'internal'")}]`)};`, error: 'An internal diagnostic is always a converter bug.' },
		{ name: 'an unknown diagnostic field', converter: `return ${rejected(`[${error('extra:1')}]`)};`, error: 'AssertionError' },
		{ name: 'a rejection that still returns source', converter: `return {ok:false,source:'x',fence:undefined,sourceMap:[],diagnostics:[${error('')}]};`, error: 'AssertionError' }
	])('fails the gate for $name', async ({ converter, error: expected }) => {
		const { status, failure } = await fuzz(`export function convertCircuitikz(){${converter}}`);
		expect(status).toBe(1);
		expect(failure?.index).toBe(0);
		expect(failure?.input).toBe('');
		expect(failure?.error).toContain(expected);
	});

	it.each(['--cases=0', '--cases=1000001', '--cases=1.5', '--seed=0', '--seed=x'])('rejects the out-of-range argument %s before running', async (argument) => {
		const { status, output, failure } = await fuzz('export function convertCircuitikz(){throw new Error("never called");}', [argument]);
		expect(status).toBe(1);
		expect(output).toMatch(/--(cases|seed) must be an integer from 1 through \d+/);
		expect(failure).toBeUndefined();
	});
});

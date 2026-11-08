import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const rejected = (diagnostics) => `{ok:false,source:undefined,fence:undefined,sourceMap:[],diagnostics:${diagnostics}}`;
const error = (fields) => `{code:'syntax',message:'m',line:1,column:1,endColumn:1,severity:'error',${fields}}`;
// A source core accepts, as M2 emits it: one component inside its fence.
const accepted = (fields) => `{ok:true,source:'capacitor:C1 "100" at (180, 80) #cyan\\n',fence:{bounds:{width:400,height:200},title:'T'},sourceMap:[{schemdLine:1,line:1,column:1,endColumn:1}],diagnostics:[],${fields}}`;
// Reports at the very end of the input: the last line, one past its last UTF-16 unit.
const atEnd = (split) => `const lines=t.split(${split});const line=lines.length;const column=lines[line-1].length+1;return ${rejected('[{code:\'syntax\',message:\'m\',line,column,endColumn:column,severity:\'error\'}]')};`;

/** Runs the real fuzz script against a stand-in converter in a scratch package, so a converter
 * that breaks the contract can be shown to fail the gate. Nothing in src or dist changes. */
async function fuzz(converter, args = ['--cases=1', '--seed=1'], output = 'fuzz-failure-1.json') {
	const directory = await mkdtemp(join(tmpdir(), 'circuitikz-fuzz-contract-'));
	try {
		for (const path of ['scripts', 'dist', 'tests/fixtures/conformance/one', 'tests/fixtures/rejections/two']) await mkdir(join(directory, path), { recursive: true });
		await symlink(resolve('node_modules'), join(directory, 'node_modules'), 'dir');
		await cp('scripts/fuzz.mjs', join(directory, 'scripts/fuzz.mjs'));
		await writeFile(join(directory, 'package.json'), '{"type":"module"}');
		await writeFile(join(directory, 'dist/index.js'), converter);
		await writeFile(join(directory, 'dist/limits.js'), 'export const LIMITS = {sourceLength:4,braceDepth:2,junctions:2,statements:2,pathElements:2,components:2};');
		await writeFile(join(directory, 'tests/fixtures/conformance/one/input.tex'), '\\begin{circuitikz}\\end{circuitikz}');
		await writeFile(join(directory, 'tests/fixtures/rejections/two/input.tex'), '\\begin{circuitikz}\\draw (0,0)\\end{circuitikz}');
		const result = spawnSync(process.execPath, ['scripts/fuzz.mjs', ...args], { cwd: directory, encoding: 'utf8', timeout: 15_000 });
		expect(result.error).toBeUndefined();
		const failure = await readFile(join(directory, output), 'utf8').then(JSON.parse, () => undefined);
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
		{ name: 'a rejection that still returns source', converter: `return {ok:false,source:'x',fence:undefined,sourceMap:[],diagnostics:[${error('')}]};`, error: 'AssertionError' },
		{ name: 'a rejection that still returns a fence', converter: `return {ok:false,source:undefined,fence:{},sourceMap:[],diagnostics:[${error('')}]};`, error: 'AssertionError' },
		{ name: 'a rejection that still returns a source map', converter: `return {ok:false,source:undefined,fence:undefined,sourceMap:[{}],diagnostics:[${error('')}]};`, error: 'AssertionError' },
		{ name: 'diagnostics that are not an array', converter: 'return {ok:true,source:"",fence:undefined,sourceMap:[],diagnostics:{}};', error: 'AssertionError' },
		{ name: 'a source map that is not an array', converter: `return {ok:false,source:undefined,fence:undefined,sourceMap:{},diagnostics:[${error('')}]};`, error: 'AssertionError' },
		{ name: 'a rejection with no error, only a warning', converter: `return ${rejected(`[${error("severity:'warning'")}]`)};`, error: 'AssertionError' },
		{ name: 'an unknown diagnostic code', converter: `return ${rejected(`[${error("code:'bogus'")}]`)};`, error: 'AssertionError' },
		{ name: 'an unknown severity beside an error', converter: `return ${rejected(`[${error('')},${error("severity:'info'")}]`)};`, error: 'AssertionError' },
		{ name: 'an empty message', converter: `return ${rejected(`[${error("message:''")}]`)};`, error: 'AssertionError' },
		{ name: 'a message that is not a string', converter: `return ${rejected(`[${error("message:['m']")}]`)};`, error: 'AssertionError' },
		{ name: 'line 0', converter: `return ${rejected(`[${error('line:0')}]`)};`, error: 'AssertionError' },
		{ name: 'column 0', converter: `return ${rejected(`[${error('column:0,endColumn:1')}]`)};`, error: 'AssertionError' },
		{ name: 'a fractional column', converter: `return ${rejected(`[${error('column:1.5,endColumn:2')}]`)};`, error: 'AssertionError' },
		{ name: 'a column given as a string', converter: `return ${rejected(`[${error("column:'1'")}]`)};`, error: 'AssertionError' },
		{ name: 'a missing diagnostic field', converter: `return ${rejected("[{code:'syntax',message:'m',line:1,column:1,severity:'error'}]")};`, error: 'AssertionError' },
		{ name: 'a later line before an earlier one', converter: `return ${rejected(`[${error('')},${error('')}].map((d,i)=>({...d,line:i?1:2}))`)};`, error: 'AssertionError' },
		{ name: 'a success that core rejects', converter: `return {...${accepted('')},source:'capacitor:C1 at (900, 80) #cyan\\n'};`, error: 'AssertionError' },
		{ name: 'a success with no fence', converter: `return {...${accepted('')},fence:undefined};`, error: 'SchematicSyntaxError: Parser options must be an object.' },
		{ name: 'a success whose source map misses a line', converter: `return {...${accepted('')},sourceMap:[]};`, error: 'AssertionError' },
		{ name: 'a success with no source', converter: `return {...${accepted('')},source:undefined};`, error: 'AssertionError' }
	])('fails the gate for $name', async ({ converter, error: expected }) => {
		const { status, failure } = await fuzz(`export function convertCircuitikz(){${converter}}`);
		expect(status).toBe(1);
		expect(failure?.index).toBe(0);
		expect(failure?.input).toBe('');
		expect(failure?.error).toContain(expected);
	});

	// Controls: inputs at the edge of the contract that a correct converter may return.
	it.each([
		{ name: 'a success core compiles, with a warning', converter: `return {...${accepted('')},diagnostics:[${error("severity:'warning'")}]};` },
		{ name: 'two diagnostics at the same position', converter: `return ${rejected(`[${error('')},${error('')}]`)};` },
		{ name: 'a span that ends one past the last unit of every input, CR, CRLF and emoji included', converter: atEnd('/\\r\\n|\\r|\\n/') }
	])('passes a converter that returns $name, across every input mode', async ({ converter }) => {
		const result = await fuzz(`export function convertCircuitikz(t){${converter}}`, ['--cases=200', '--seed=1']);
		expect(result.output).toContain('PASS: 200 reproducible fuzz cases (400 conversions).');
		expect(result.status).toBe(0);
	});

	it.each([
		{ name: 'counts CRLF as two lines', split: '/[\\r\\n]/', input: '\r\n' },
		{ name: 'counts only LF line ends', split: "'\\n'", input: '\r' },
		{ name: 'measures columns in UTF-8 bytes', split: '/\\r\\n|\\r|\\n/', input: 'α', bytes: true }
	])('minimizes to the line end it gets wrong when a converter $name', async ({ split, input, bytes }) => {
		const converter = bytes ? atEnd(split).replace('lines[line-1].length', 'Buffer.byteLength(lines[line-1])') : atEnd(split);
		const { status, failure } = await fuzz(`export function convertCircuitikz(t){${converter}}`, ['--cases=200', '--seed=1']);
		expect(status).toBe(1);
		expect(failure?.input).toBe(input);
		expect(failure?.error).toContain('AssertionError');
	});

	it('minimizes to the one character that breaks a converter, from a random input', async () => {
		const { status, failure } = await fuzz('export function convertCircuitikz(t){if(t.includes("α"))throw new Error("alpha");return ' + rejected(`[${error('')}]`) + ';}', ['--cases=200', '--seed=1']);
		expect(status).toBe(1);
		expect(failure?.original).toContain('α');
		expect(failure?.original.length).toBeGreaterThan(1);
		expect(failure?.input).toBe('α');
		expect(failure?.error).toBe('Error: alpha');
	});

	it('replays the same failure from the same seed, and another from a different seed', async () => {
		const converter = 'export function convertCircuitikz(t){if(t.includes("α"))throw new Error("alpha");return ' + rejected(`[${error('')}]`) + ';}';
		const first = await fuzz(converter, ['--cases=200', '--seed=1']);
		const again = await fuzz(converter, ['--cases=200', '--seed=1']);
		const other = await fuzz(converter, ['--cases=200', '--seed=2']);
		expect(again.failure).toEqual(first.failure);
		expect(other.status).toBe(1);
		expect(other.output).toContain('Fuzz seed: 2; cases: 200');
		expect(other.output).toContain('fuzz-failure-2.json');
	});

	it('records the options a failure needs and replays them while minimizing', async () => {
		const { status, failure } = await fuzz(`export function convertCircuitikz(t,o){if(o?.strict)throw new Error("strict");return ${rejected(`[${error('')}]`)};}`, ['--cases=200', '--seed=1']);
		expect(status).toBe(1);
		expect(failure).toMatchObject({ options: { strict: true }, input: '', error: 'Error: strict' });
		expect(failure?.index).toBeGreaterThan(0);
	});

	it('fails the gate when the converter ends its worker', async () => {
		const { status, failure } = await fuzz('export function convertCircuitikz(){process.exit(3);}');
		expect(status).toBe(1);
		expect(failure).toMatchObject({ index: 0, original: '%%%', input: '', error: 'Worker exited 3' });
	});

	it('checks the inputs at each ceiling and one past it before any random input', async () => {
		// The stand-in limits are 4 characters, 2 braces, 2 junctions, 2 statements, 2 path elements and 2 components.
		const wrap = (text) => `\\begin{circuitikz}\n${text}\n\\end{circuitikz}`;
		const junctions = (n) => Array.from({ length: n }, (_, i) => `\\draw (${i * 2},0) -- (${i === 0 ? '-0.10' : `${i * 2 - 1}.90`},0) (${i * 2},0) -- (${i * 2}.10,0) (${i * 2},0) -- (${i * 2},0.10);`).join('\n');
		const grounds = (n) => Array.from({ length: n }, (_, i) => `\\draw (${i * 2},0) node[ground]{};`).join('\n');
		const expected = ['%%%', '%%%%', '%%%%%', '%'.repeat(1_000_000), ...[2, 3].flatMap((n) => [
			'{'.repeat(n), wrap(junctions(n)), wrap(grounds(n)), wrap('\\draw (0,0);'.repeat(n)), wrap('\\draw (0,0)' + ' -- (1,0)'.repeat(n - 1) + ';'), wrap('\\draw (0,0)' + ' to[R] (1,0)'.repeat(n) + ';')
		])];
		const { status, failure } = await fuzz(`import {writeFileSync} from 'node:fs';export function convertCircuitikz(t,o){globalThis.seen??=[];globalThis.seen.push([t,o]);writeFileSync('seen.json',JSON.stringify(globalThis.seen));return ${rejected(`[${error('')}]`)};}`, [`--cases=${expected.length}`, '--seed=1'], 'seen.json');
		expect(status).toBe(0);
		const seen = failure.filter((_, i) => i % 2 === 0);
		expect(seen.map(([text]) => text)).toEqual(expected);
		// Only the million-character input raises the source ceiling to fit it.
		expect(seen.map(([, options]) => options ?? null)).toEqual(expected.map((_, i) => i === 3 ? { maxSourceLength: 1_000_000 } : null));
	});

	it('uses the CI seed and case count by default', async () => {
		const result = await fuzz(`export function convertCircuitikz(){throw new Error("stop");}`, []);
		expect(result.output).toContain('Fuzz seed: 6049357; cases: 20000');
		expect(result.status).toBe(1);
	});

	it('accepts the largest seed', async () => {
		const result = await fuzz(`export function convertCircuitikz(){return ${rejected(`[${error('')}]`)};}`, ['--cases=1', '--seed=4294967295']);
		expect(result.output).toContain('Fuzz seed: 4294967295; cases: 1');
		expect(result.status).toBe(0);
	});

	it.each(['--cases=0', '--cases=1000001', '--cases=1.5', '--cases=', '--cases=-1', '--seed=0', '--seed=x', '--seed=4294967296', '--seed=-1', '--seed=NaN'])('rejects the out-of-range argument %s before running', async (argument) => {
		const { status, output, failure } = await fuzz('export function convertCircuitikz(){throw new Error("never called");}', [argument]);
		expect(status).toBe(1);
		expect(output).toMatch(/--(cases|seed) must be an integer from 1 through \d+/);
		expect(failure).toBeUndefined();
	});
});

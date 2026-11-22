import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Paths from this file, not the working directory, so the suite runs from anywhere.
const repository = fileURLToPath(new URL('..', import.meta.url));
const pending = "{ok:false,source:undefined,fence:undefined,sourceMap:[],diagnostics:[{code:'unsupported',message:'Conversion is not implemented yet; this milestone validates the supported input syntax only.',line:1,column:1,endColumn:7,severity:'error'}]}";
const api = 'export const canonical=(c)=>c;export const connectivityOf=()=>[];export const connectivityDifference=()=>undefined;';
// A stand-in for the built package that keeps every clause: two modules, one nested, each with code and declarations.
const good = {
	'src/index.ts': '', 'src/nested/deep.ts': '',
	'dist/index.js': `${api}export function convertCircuitikz(){return ${pending};}`,
	'dist/index.d.ts': 'export {};', 'dist/nested/deep.js': 'export {};', 'dist/nested/deep.d.ts': 'export {};'
};

/** Runs the real smoke script in a scratch package whose dist is a stand-in, so a broken build can be
 * shown to fail it. The series-battery fixture and node_modules are the repository's own. */
async function smoke(files) {
	const directory = await mkdtemp(join(tmpdir(), 'circuitikz-smoke-'));
	try {
		// A junction on Windows needs no symlink privilege; elsewhere the type is ignored.
		await symlink(join(repository, 'node_modules'), join(directory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
		await cp(join(repository, 'scripts/smoke.mjs'), join(directory, 'scripts/smoke.mjs'));
		await cp(join(repository, 'tests/fixtures/conformance/series-battery'), join(directory, 'tests/fixtures/conformance/series-battery'), { recursive: true });
		await writeFile(join(directory, 'package.json'), '{"type":"module"}');
		for (const [path, text] of Object.entries({ ...good, ...files })) {
			if (text === null) continue;
			await mkdir(dirname(join(directory, path)), { recursive: true });
			await writeFile(join(directory, path), text);
		}
		const result = spawnSync(process.execPath, ['scripts/smoke.mjs'], { cwd: directory, encoding: 'utf8', timeout: 30_000 });
		expect(result.error).toBeUndefined();
		return { status: result.status, output: result.stdout + result.stderr };
	} finally { await rm(directory, { force: true, recursive: true }); }
}

const convert = (body) => ({ 'dist/index.js': `${api}export function convertCircuitikz(){${body}}` });

describe('smoke infrastructure', () => {
	it('passes a built package that keeps every clause', async () => {
		const { status, output } = await smoke({});
		expect(output).toContain('PASS: Node.js');
		expect(status).toBe(0);
	}, 30_000);

	it.each([
		{ name: 'a module with no built code', files: { 'dist/nested/deep.js': null }, error: 'dist/nested/deep.js is missing' },
		{ name: 'a module with no declarations', files: { 'dist/nested/deep.d.ts': null }, error: 'dist/nested/deep.d.ts is missing' },
		{ name: 'a module built as an empty file', files: { 'dist/nested/deep.js': '\n' }, error: 'dist/nested/deep.js is empty' },
		{ name: 'a source module added after the last build', files: { 'src/late.ts': '' }, error: 'dist/late.js is missing' },
		{ name: 'an entry that throws while loading', files: { 'dist/index.js': 'throw new Error("broken entry");' }, error: 'broken entry' },
		{ name: 'a public export left out', files: { 'dist/index.js': good['dist/index.js'].replace('export const canonical=(c)=>c;', '') }, error: 'does not export the public API' },
		{ name: 'an extra export', files: { 'dist/index.js': `${good['dist/index.js']}export const debug=1;` }, error: 'does not export the public API' },
		{ name: 'a converter that throws', files: convert('throw new Error("convert broke");'), error: 'convert broke' },
		{ name: 'a converter that answers otherwise', files: convert(`return {...${pending},diagnostics:[]};`), error: 'does not answer a supported circuit as the source does' },
		{ name: 'a rejection that leaves out its source key', files: convert(`const {source,...rest}=${pending};return rest;`), error: 'does not answer a supported circuit as the source does' },
		{ name: 'a connectivity helper that disagrees with core', files: { 'dist/index.js': good['dist/index.js'].replace('connectivityDifference=()=>undefined', "connectivityDifference=()=>'R1.in'") }, error: 'connectivityOf disagrees' },
		// Host globals: each loads in Node.js but not in the bundle's context.
		{ name: 'a module that reads process at load', files: { 'dist/nested/deep.js': 'export const env = process.env.HOME;', 'dist/index.js': `import './nested/deep.js';${good['dist/index.js']}` }, error: 'process is not defined' },
		{ name: 'a converter that calls require', files: convert(`require('node:fs');return ${pending};`), error: 'require' },
		// Vite alone would only warn and bundle an empty stand-in for each of these.
		{ name: 'a converter that imports a node: module', files: { 'dist/index.js': `import {readFileSync} from 'node:fs';${api}export function convertCircuitikz(){readFileSync;return ${pending};}` }, error: 'imports the Node.js module node:fs' },
		{ name: 'a module that imports a bare builtin', files: { 'dist/nested/deep.js': "import 'path';export {};", 'dist/index.js': `import './nested/deep.js';${good['dist/index.js']}` }, error: 'imports the Node.js module path' },
		{ name: 'a module that imports a builtin subpath', files: { 'dist/nested/deep.js': "import {promises} from 'fs';export const p=promises;", 'dist/index.js': `import './nested/deep.js';${good['dist/index.js']}` }, error: 'imports the Node.js module fs' },
		{ name: 'a converter that touches the DOM', files: convert(`document.title;return ${pending};`), error: 'document is not defined' },
		{ name: 'a converter that answers differently without process', files: convert(`return typeof process==='undefined'?{...${pending},sourceMap:[1]}:${pending};`), error: 'answers differently from Node.js' },
		{ name: 'a converter that hangs without process', files: convert(`while(typeof process==='undefined'){}return ${pending};`), error: 'Script execution timed out' }
	])('fails the smoke test for $name', async ({ files, error }) => {
		const { status, output } = await smoke(files);
		expect(output).not.toContain('PASS');
		expect(output).toContain(error);
		expect(status).toBe(1);
	}, 30_000);

	it.each([
		{ name: 'a declaration-only module that emits an empty export', files: { 'src/types.ts': '', 'dist/types.js': 'export {};', 'dist/types.d.ts': 'export type X = 1;' } },
		{ name: 'a module only the entry imports, bundled into one script', files: { 'dist/nested/deep.js': 'export const message = "m";', 'dist/index.js': `import {message} from './nested/deep.js';${api}export function convertCircuitikz(){return message==='m'?${pending}:null;}` } },
		{ name: 'a converter that returns a null-prototype result', files: convert(`return Object.assign(Object.create(null),${pending});`) }
	])('passes a built package with $name', async ({ files }) => {
		const { status, output } = await smoke(files);
		expect(output).toContain('PASS: Node.js');
		expect(status).toBe(0);
	}, 30_000);

	it('runs in release:check and in CI, after the build', async () => {
		const manifest = JSON.parse(await readFile(join(repository, 'package.json'), 'utf8'));
		expect(manifest.scripts['test:smoke']).toBe('node scripts/smoke.mjs');
		expect(manifest.scripts['release:check']).toContain('bun run test:fuzz:contract && bun run test:smoke');
		const workflow = await readFile(join(repository, '.github/workflows/ci.yml'), 'utf8');
		expect(workflow.indexOf('run: bun run test:smoke')).toBeGreaterThan(workflow.indexOf('run: bun run test:fuzz:contract'));
	});
});

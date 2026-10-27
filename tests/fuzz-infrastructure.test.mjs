import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/** A controlled broken converter proves failures and hangs cannot turn the
 * fuzz gate green; these are test-only packages, never changes to src or dist. */
async function brokenConverter(source, sourceLength) {
	const directory = await mkdtemp(join(tmpdir(), 'circuitikz-fuzz-contract-'));
	try {
		for (const path of ['scripts', 'dist', 'tests/fixtures/conformance/one']) await mkdir(join(directory, path), { recursive: true });
		await symlink(resolve('node_modules'), join(directory, 'node_modules'), 'dir');
		await cp('scripts/fuzz.mjs', join(directory, 'scripts/fuzz.mjs'));
		await writeFile(join(directory, 'package.json'), '{"type":"module"}');
		await writeFile(join(directory, 'dist/index.js'), source);
		await writeFile(join(directory, 'dist/limits.js'), `export const LIMITS = {sourceLength:${sourceLength},braceDepth:2,junctions:2,statements:2,pathElements:2,components:2};`);
		await writeFile(join(directory, 'tests/fixtures/conformance/one/input.tex'), '\\begin{circuitikz}\\end{circuitikz}');
		const result = spawnSync(process.execPath, ['scripts/fuzz.mjs', '--cases=1', '--seed=1'], { cwd: directory, encoding: 'utf8', timeout: 15_000 });
		expect(result.error).toBeUndefined();
		expect(result.status).toBe(1);
		const failure = JSON.parse(await readFile(join(directory, 'fuzz-failure-1.json'), 'utf8'));
		expect(failure.seed).toBe(1);
		expect(failure.index).toBe(0);
		expect(failure.input).toBe('');
		return failure;
	} finally { await rm(directory, { force: true, recursive: true }); }
}

describe('fuzz infrastructure', () => {
	it('writes a minimized reproducible input and exits nonzero for a thrown error', async () => {
		const failure = await brokenConverter('export function convertCircuitikz(){throw new Error("controlled failure");}', 4);
		expect(failure.original).toBe('%%%');
		expect(failure.error).toBe('Error: controlled failure');
	});

	it('terminates a hung converter in its worker and records the responsible input', async () => {
		const failure = await brokenConverter('export function convertCircuitikz(){while(true){}}', 1);
		expect(failure.original).toBe('');
		expect(failure.error).toBe('Worker exceeded the per-input 2000 ms deadline.');
	}, 20_000);
});

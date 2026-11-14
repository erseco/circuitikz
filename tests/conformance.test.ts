/// <reference types="vite/client" />
import { buildNetlist, compileSchematic, diagnoseSchematic, parseSchematicFence } from '@schemd/core';
import { describe, expect, it } from 'vitest';

import { convertCircuitikz, connectivityDifference, connectivityOf } from '../src/index';

/**
 * The conformance corpus: one directory per case under
 * `tests/fixtures/conformance/`, each holding
 *
 * - `input.tex`: the CircuiTikZ, exactly as an author would write it;
 * - `expected.schemd`: the byte-exact document the converter must emit;
 * - `meta.json`: the fence, where the case came from, a note on anything
 *   non-obvious it pins, and the connectivity the TeX describes.
 *
 * Until `convertCircuitikz` exists (milestone M2) this suite checks the corpus
 * itself: every expected document must be one `@schemd/core` accepts, routes
 * on its first pass, and wires as the TeX does. M2 adds the assertion that the
 * converter's output equals `expected.schemd` byte for byte — see
 * REQUIREMENTS.md §7.2.
 */

interface Meta {
	readonly origin: string;
	readonly fence: string;
	readonly note: string;
	readonly connectivity: readonly (readonly string[])[];
}

const read = (pattern: Record<string, unknown>) =>
	new Map(Object.entries(pattern).map(([path, value]) => [path.split('/').at(-2)!, value]));

const inputs = read(import.meta.glob('./fixtures/conformance/*/input.tex', { query: '?raw', import: 'default', eager: true }));
const outputs = read(import.meta.glob('./fixtures/conformance/*/expected.schemd', { query: '?raw', import: 'default', eager: true }));
const metas = read(import.meta.glob('./fixtures/conformance/*/meta.json', { import: 'default', eager: true }));

const cases = [...inputs.keys()].sort();

describe('conformance corpus', () => {
	it('finds the cases it is meant to check', () => {
		/* A glob that matched nothing would make every other case vacuous. */
		expect(cases).toContain('series-battery');
		expect(cases.length).toBeGreaterThanOrEqual(2);
	});

	it('gives every case all three files', () => {
		expect([...outputs.keys()].sort()).toEqual(cases);
		expect([...metas.keys()].sort()).toEqual(cases);
	});

	describe.each(cases)('%s', (name) => {
		const input = inputs.get(name) as string;
		const expected = outputs.get(name) as string;
		const meta = metas.get(name) as Meta;
		const fence = parseSchematicFence(meta.fence)!;

		it('records where it came from and what it pins', () => {
			expect(meta.origin.length).toBeGreaterThan(0);
			expect(meta.note.length).toBeGreaterThan(0);
			expect(input).toMatch(/^\\begin\{circuitikz\}/);
		});

		it('ends every file with exactly one newline', () => {
			for (const text of [input, expected]) expect(text).toMatch(/[^\n]\n$/);
		});

		it('converts the TeX byte-for-byte with one precise mapping per nonblank line', () => {
			const result = convertCircuitikz(input);
			expect(result.diagnostics).toEqual([]);
			expect(result.ok).toBe(true);
			expect(result.source).toBe(expected);
			expect(result.fence).toEqual(fence);
			const lines = expected.split('\n').flatMap((line, index) => line.trim() === '' ? [] : [index + 1]);
			expect(result.sourceMap.map((m) => m.schemdLine)).toEqual(lines);
			for (const map of result.sourceMap) {
				expect(map.column).toBeGreaterThan(0);
				expect(map.endColumn).toBeGreaterThan(map.column);
				expect(map.endColumn).toBeLessThanOrEqual(input.split('\n')[map.line - 1]!.length + 1);
			}
		});

		it('expects a document schemd accepts without a single diagnostic', () => {
			expect(diagnoseSchematic(expected, fence)).toEqual([]);
		});

		it('expects a document that routes on its first pass', () => {
			expect(compileSchematic(expected, fence).routing.attempts).toBe(0);
		});

		it('expects the connectivity the TeX describes', () => {
			const actual = connectivityOf(buildNetlist(compileSchematic(expected, fence).document));
			expect(connectivityDifference(meta.connectivity, actual)).toBeUndefined();
		});
	});
});

/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

/**
 * Rules REQUIREMENTS.md states, checked rather than trusted to review.
 *
 * Each pattern is assembled from pieces so this file does not trip its own
 * checks when it reads the test tree.
 */

const sources = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const tests = import.meta.glob(['./**/*.ts', '!./source-policy.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<
	string,
	string
>;

/** Every line of every file that matches, as `file:line: text`. */
function offenders(files: Record<string, string>, pattern: RegExp): string[] {
	const found: string[] = [];
	for (const [path, text] of Object.entries(files)) {
		text.split('\n').forEach((line, index) => {
			if (pattern.test(line)) found.push(`${path}:${index + 1}: ${line.trim()}`);
		});
	}
	return found;
}

const word = (...parts: string[]) => new RegExp(parts.join(''));

const SOURCE_RULES: readonly (readonly [string, RegExp])[] = [
	/* REQUIREMENTS.md §8.1: coverage is earned, never excused. */
	['a coverage-ignore comment', word('(istanbul|c8|v8)', '\\s+ignore')],
	/* §2.4: the type checker is not argued with. */
	['a type-checker suppression', word('@ts-', '(ignore|nocheck|expect-error)')],
	['an explicit any', word('(:\\s*any\\b|\\bas\\s+any\\b|<any>|\\bany\\[\\])')],
	/* §2.3: determinism. */
	['a clock or random source', word('(Math\\.random|Date\\.now|new\\s+Date\\b|performance\\.now)')],
	['a locale-dependent call', word('(localeCompare|toLocale\\w*\\(|\\bIntl\\.)')],
	/* §2.2: a pure function of its input. */
	['console output', word('\\bconsole\\.')],
	['dynamic code', word('(\\beval\\(|new\\s+Function\\b)')],
	['a dynamic regular expression', word('new\\s+RegExp\\b')],
	['Node.js or I/O', word("(\\bprocess\\.|\\brequire\\(|from\\s+'node:|\\bfetch\\(|\\bimport\\()")],
	/* §2.1: the compiler is reached through its public entry only. */
	['a deep import into @schemd/core', word("from\\s+'@schemd/core/")]
];

describe('source policy', () => {
	it('finds the files it is meant to police', () => {
		expect(Object.keys(sources).length).toBeGreaterThanOrEqual(3);
		expect(Object.keys(tests).length).toBeGreaterThanOrEqual(3);
	});

	it.each(SOURCE_RULES)('src contains no %s', (_, pattern) => {
		expect(offenders(sources, pattern)).toEqual([]);
	});

	it('writes every relative import with the .js extension Node resolves', () => {
		const imports = offenders(sources, /from\s+'\.{1,2}\//);
		expect(imports.length).toBeGreaterThan(0);
		expect(imports.filter((line) => !/from\s+'\.{1,2}\/[^']+\.js'/.test(line))).toEqual([]);
	});

	it('skips, focuses, or defers no test', () => {
		expect(offenders(tests, word('\\b(it|test|describe)\\.', '(skip|only|todo|fails)\\b'))).toEqual([]);
		expect(offenders(tests, word('\\b(xit|xdescribe|fit|fdescribe)', '\\('))).toEqual([]);
	});

	it('flags what it is meant to flag', () => {
		/* A rule whose pattern can never match protects nothing. */
		const samples = [
			'/* istanbul ignore next */',
			'// @ts-ignore',
			'const value: any = 1;',
			'const seed = Math.random();',
			"a.localeCompare(b)",
			'console.log(value);',
			'eval(code);',
			'new RegExp(text);',
			"import { readFile } from 'node:fs';",
			"import { x } from '@schemd/core/dist/parser.js';"
		];
		SOURCE_RULES.forEach(([name, pattern], index) => {
			expect(pattern.test(samples[index]!), name).toBe(true);
		});
	});
});

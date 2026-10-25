/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import * as ts from 'typescript/unstable/ast';

/**
 * Rules REQUIREMENTS.md states, checked rather than trusted to review.
 *
 * Each pattern is assembled from pieces so this file does not trip its own
 * checks when it reads the test tree.
 */

const sources = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const tests = import.meta.glob(['./**/*.{ts,mjs}', '!./source-policy.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<
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

/** Use the installed TypeScript 7 scanner: quoted literals and comments are
 * tokens, so multiline and double-quoted imports cannot bypass the line rules. */
function syntaxOffenders(source: string): string[] {
	const found: string[] = [];
	const scanner = ts.createScanner(true, undefined, source);
	const tokens: { kind: ts.SyntaxKind; value: string }[] = [];
	const templates: number[] = [];
	for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFile; kind = scanner.scan()) {
		const top = templates.length - 1;
		if (kind === ts.SyntaxKind.OpenBraceToken && top >= 0) templates[top]! += 1;
		if (kind === ts.SyntaxKind.CloseBraceToken && top >= 0) {
			if (templates[top] === 0) {
				kind = scanner.reScanTemplateToken(false);
				if (kind === ts.SyntaxKind.TemplateTail) templates.pop();
			} else templates[top]! -= 1;
		}
		if (kind === ts.SyntaxKind.TemplateHead) templates.push(0);
		tokens.push({ kind, value: kind === ts.SyntaxKind.StringLiteral ? scanner.getTokenValue() : scanner.getTokenText() });
	}
	const forbidden = new Set(['process', 'require', 'console', 'eval', 'Function', 'RegExp', 'Date', 'performance', 'Intl',
		'window', 'document', 'navigator', 'globalThis', 'fetch', 'XMLHttpRequest', 'WebSocket']);
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index]!;
		if (token.kind === ts.SyntaxKind.AnyKeyword) found.push('explicit any');
		if (token.kind === ts.SyntaxKind.Identifier && forbidden.has(token.value)) found.push(`host or dynamic global ${token.value}`);
		if (token.kind === ts.SyntaxKind.ImportKeyword && tokens[index + 1]?.kind === ts.SyntaxKind.OpenParenToken) found.push('dynamic import');
		if (token.kind === ts.SyntaxKind.StringLiteral && ['from', 'import'].includes(tokens[index - 1]?.value ?? '')) {
			const value = token.value;
			if (value !== '@schemd/core' && !(value.startsWith('./') || value.startsWith('../'))) found.push(`external module ${value}`);
			if ((value.startsWith('./') || value.startsWith('../')) && !value.endsWith('.js')) found.push(`relative extension ${value}`);
		}
		if (token.value === 'Math' && tokens[index + 1]?.value === '[' && tokens[index + 2]?.value === 'random') found.push('indexed randomness');
	}
	return found;
}

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

	it('enforces policy through TypeScript syntax tokens as well as text', () => {
		for (const [name, source] of Object.entries(sources)) expect(syntaxOffenders(source), name).toEqual([]);
		expect(syntaxOffenders('import x\nfrom "node:fs";')).toContain('external module node:fs');
		expect(syntaxOffenders('export * from "@schemd/core/dist/a.js";')).toContain('external module @schemd/core/dist/a.js');
		expect(syntaxOffenders('import x from "./missing-extension";')).toContain('relative extension ./missing-extension');
		expect(syntaxOffenders('import\n("./a.js");')).toContain('dynamic import');
		expect(syntaxOffenders('type X = Array<any>;')).toContain('explicit any');
		expect(syntaxOffenders('Math["random"]();')).toContain('indexed randomness');
		for (const name of ['window', 'document', 'process', 'console', 'eval', 'Function', 'Date', 'RegExp']) {
			expect(syntaxOffenders(`${name}["x"];`)).toContain(`host or dynamic global ${name}`);
		}
		expect(syntaxOffenders('import type { SchematicFence } from "@schemd/core"; export * from "./a.js"; Math.floor(1);')).toEqual([]);
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

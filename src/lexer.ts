import type { Token } from './ast.js';
import { Diagnostics, limit } from './diagnostics.js';
import { LIMITS } from './limits.js';

/** ASCII control words are TeX commands; all offsets count UTF-16 units. */
function letter(value: string): boolean {
	return value >= 'A' && value <= 'Z' || value >= 'a' && value <= 'z';
}

/** Bounded scanner. Comments and whitespace are consumed once and never emitted. */
export function scan(source: string, diagnostics: Diagnostics): Token[] {
	const tokens: Token[] = [];
	let cursor = 0;
	let line = 1;
	let column = 1;
	let depth = 0;
	while (cursor < source.length) {
		const c = source[cursor]!;
		if (c === '\r' || c === '\n') {
			cursor += c === '\r' && source[cursor + 1] === '\n' ? 2 : 1;
			line += 1;
			column = 1;
			continue;
		}
		if (c === ' ' || c === '\t' || c === '\f') { cursor += 1; column += 1; continue; }
		if (c === '%') {
			while (cursor < source.length && source[cursor] !== '\r' && source[cursor] !== '\n') { cursor += 1; column += 1; }
			continue;
		}
		const start = cursor;
		const startColumn = column;
		let kind: Token['kind'] = 'symbol';
		cursor += 1;
		if (c === '\\') {
			kind = 'command';
			if (letter(source[cursor] ?? '')) {
				while (cursor < source.length && letter(source[cursor]!)) cursor += 1;
			} else if (cursor < source.length && source[cursor] !== '\r' && source[cursor] !== '\n') cursor += 1;
		} else if ('-- ++ |- -|'.split(' ').includes(source.slice(start, start + 2))) cursor += 1;
		else if (!'{}[](),;=+-|$^*"'.includes(c)) {
			kind = 'atom';
			while (cursor < source.length && !' \t\f\r\n\\%{}[](),;=+-|$^*"'.includes(source[cursor]!)) cursor += 1;
		}
		column += cursor - start;
		const token: Token = { kind, value: source.slice(start, cursor), start, end: cursor, line, column: startColumn, endColumn: column };
		tokens.push(token);
		if (c === '{') {
			if (depth === LIMITS.braceDepth) { limit(diagnostics, 'brace nesting depth', LIMITS.braceDepth, token); break; }
			depth += 1;
		} else if (c === '}' && depth > 0) depth -= 1;
	}
	tokens.push({ kind: 'eof', value: '', start: cursor, end: cursor, line, column, endColumn: column });
	return tokens;
}

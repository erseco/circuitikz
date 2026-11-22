import type { Token } from './ast.js';
import { Diagnostics, syntax, unsupported } from './diagnostics.js';

/** The public core 1.1 micro-math command inventory (src/math-label.ts). */
const COMMANDS = new Set(['alpha', 'beta', 'Delta', 'cdot', 'infty', 'lambda', 'langle', 'le', 'ge', 'mu', 'neq', 'Omega', 'omega', 'oplus', 'phi', 'pi', 'pm', 'rangle', 'rightarrow', 'sigma', 'sqrt', 'theta', 'times']);

/** Validate before quoting: core's DSL has no escaped-double-quote production. */
export function labelOf(tokens: readonly Token[], source: string, diagnostics: Diagnostics): string | undefined {
	let parts = tokens;
	if (parts[0]?.value === '{' && parts[1]?.value === '$' && parts.at(-2)?.value === '$' && parts.at(-1)?.value === '}') parts = parts.slice(1, -1);
	const math = parts[0]?.value === '$' && parts.at(-1)?.value === '$' && parts.length > 1;
	if (math) parts = parts.slice(1, -1);
	const output: string[] = [];
	let previous: Token | undefined;
	for (const token of parts) {
		if (previous !== undefined) {
			let comment = false;
			for (let i = previous.end; i < token.start; i += 1) {
				const c = source[i]!;
				if (c === '%') comment = true;
				else if (c === '\n' || c === '\r') { if (!comment) output.push(' '); comment = false; if (c === '\r' && source[i + 1] === '\n') i += 1; }
				else if (!comment) output.push(c === '\t' ? ' ' : c);
			}
		}
		previous = token;
		if (token.kind === 'command') {
			if (math && ['\\,', '\\;', '\\ '].includes(token.value)) output.push(' ');
			else if (math && COMMANDS.has(token.value.slice(1))) output.push(token.value);
			else unsupported(diagnostics, `Label command ${token.value}`, token);
			continue;
		}
		let offset = 0;
		for (const c of token.value) {
			if (/[\p{L}\p{N}]/u.test(c) || " .,-+/():'".includes(c) || math && '{}_^'.includes(c)) output.push(c);
			else unsupported(diagnostics, `Label character ${c}`, { ...token, start: token.start + offset, end: token.start + offset + c.length, column: token.column + offset, endColumn: token.column + offset + c.length });
			offset += c.length;
		}
	}
	if (output.length === 0) { syntax(diagnostics, 'a non-empty label', tokens[0]!); return undefined; }
	return output.join('');
}

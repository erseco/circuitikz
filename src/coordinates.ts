import type { Coordinate, Point, ResolvedSegment, Span, SyntaxTree, Token } from './ast.js';
import { Diagnostics, overflow, precision, reference, syntax, unsupported } from './diagnostics.js';
import { textOf, through } from './lexer.js';
import { SCALE } from './limits.js';

/** Exact decimal parsing; multiplication is guarded before it can lose precision. */
export function decimal(text: string, span: Span, diagnostics: Diagnostics): number | undefined {
	let cursor = text[0] === '-' || text[0] === '+' ? 1 : 0;
	const negative = text[0] === '-';
	let digits = 0;
	let value = 0;
	while (cursor < text.length && text[cursor]! >= '0' && text[cursor]! <= '9') {
		const digit = text.charCodeAt(cursor) - 48;
		if (value > Math.floor((Number.MAX_SAFE_INTEGER - digit) / 10)) { overflow(diagnostics, span); return undefined; }
		value = value * 10 + digit;
		cursor += 1;
		digits += 1;
	}
	let fraction = 0;
	let places = 0;
	if (text[cursor] === '.') {
		cursor += 1;
		while (cursor < text.length && text[cursor]! >= '0' && text[cursor]! <= '9') {
			if (places === 2) { precision(diagnostics, text, span); return undefined; }
			fraction = fraction * 10 + text.charCodeAt(cursor) - 48;
			places += 1;
			cursor += 1;
		}
	}
	if (digits === 0 || text.slice(cursor) !== '' && text.slice(cursor) !== 'cm') {
		unsupported(diagnostics, `Coordinate value ${text}`, span); return undefined;
	}
	if (value > Math.floor((Number.MAX_SAFE_INTEGER - fraction * (places === 1 ? 10 : 1)) / SCALE)) {
		overflow(diagnostics, span); return undefined;
	}
	const magnitude = value * SCALE + fraction * (places === 1 ? 10 : 1);
	return negative && magnitude !== 0 ? -magnitude : magnitude;
}

/** TikZ names may contain spaces, numbers and Unicode (manual §17.2.1).
 * Coordinate-system punctuation, macros and grouping are never literal names. */
export function isName(value: string): boolean {
	if (value.length === 0) return false;
	for (let i = 0; i < value.length; i += 1) {
		const c = value[i]!;
		if (c < ' ' || '.,:()$\\{}[]|;='.includes(c)) return false;
	}
	return true;
}

/** Parse the bounded token list inside a coordinate's parentheses. */
export function coordinate(tokens: readonly Token[], mode: 'absolute' | '+' | '++', span: Span, diagnostics: Diagnostics): Coordinate | undefined {
	const name = textOf(tokens);
	if (mode === 'absolute' && isName(name)) {
		return { kind: 'reference', name, span };
	}
	const comma = tokens.findIndex((t) => t.value === ',');
	if (comma < 0) { unsupported(diagnostics, 'This coordinate form', span); return undefined; }
	const scalar = (parts: readonly Token[]): number | undefined => {
		const signed = parts.length === 2 && (parts[0]!.value === '+' || parts[0]!.value === '-');
		if (parts.length !== 1 && !signed) {
			syntax(diagnostics, 'a decimal coordinate with optional cm units', span); return undefined;
		}
		return decimal(parts.map((p) => p.value).join(''), through(parts[0]!, parts.at(-1)!), diagnostics);
	};
	const x = scalar(tokens.slice(0, comma));
	const y = scalar(tokens.slice(comma + 1));
	return x === undefined || y === undefined ? undefined : { kind: 'point', x, y, mode, span };
}

/** Resolve names and relative reference points in source order, without recursion. */
export function resolveCoordinates(tree: SyntaxTree, diagnostics: Diagnostics): ResolvedSegment[] {
	const names = new Map<string, Point>();
	const segments: ResolvedSegment[] = [];
	const define = (name: string, point: Point, span: Span): void => {
		if (names.has(name)) reference(diagnostics, name, true, span);
		else names.set(name, point);
	};
	const resolve = (at: Coordinate, base: Point | undefined, first: Point | undefined): Point | undefined => {
		if (at.kind === 'reference') {
			const point = names.get(at.name);
			if (point === undefined) reference(diagnostics, at.name, false, at.span);
			return point;
		}
		if (at.kind === 'cycle') return first;
		if (at.mode === 'absolute') return { x: at.x, y: at.y };
		if (base === undefined) return undefined;
		const x = at.x + base.x;
		const y = at.y + base.y;
		if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) { overflow(diagnostics, at.span); return undefined; }
		return { x, y };
	};
	for (const statement of tree.statements) {
		let current: Point | undefined = { x: 0, y: 0 };
		let base: Point | undefined = current;
		let first: Point | undefined = current;
		if (statement.kind === 'coordinate') {
			const point = resolve(statement.at, base, first);
			if (point !== undefined) define(statement.name, point, statement.span);
			continue;
		}
		let initial = true;
		let currentSpan = statement.span;
		for (const element of statement.elements) {
			if (element.kind === 'ground') {
				if (current !== undefined) segments.push({ from: current, to: current, fromSpan: currentSpan, toSpan: currentSpan, operation: 'ground', keys: element.keys, span: element.span });
				continue;
			}
			if (element.kind === 'name') {
				if (current !== undefined) define(element.name, current, element.span);
				continue;
			}
			const point = resolve(element.at, base, first);
			if (initial) { first = point; initial = false; }
			if (element.kind === 'segment' && current !== undefined && point !== undefined) {
				segments.push({ fromSpan: currentSpan, toSpan: element.at.span, from: current, to: point, operation: element.operation, keys: element.keys, span: element.span });
			}
			current = point;
			currentSpan = element.at.span;
			if (element.at.kind !== 'point' || element.at.mode !== '+') base = point;
		}
	}
	return segments;
}

import type { Span } from './ast.js';
import type { CircuitikzDiagnostic, CircuitikzDiagnosticCode } from './types.js';

/** Central diagnostic sink; stable sorting preserves phase order at ties. */
export class Diagnostics {
	readonly items: CircuitikzDiagnostic[] = [];

	constructor(readonly strict: boolean) {}

	add(code: CircuitikzDiagnosticCode, message: string, span: Span, warning = false): void {
		this.items.push({ code, message, line: span.line, column: span.column, endColumn: span.endColumn,
			severity: warning && !this.strict ? 'warning' : 'error' });
	}

	sorted(): CircuitikzDiagnostic[] {
		return [...this.items].sort((a, b) => a.line - b.line || a.column - b.column);
	}
}

export function limit(d: Diagnostics, resource: string, maximum: number, span: Span): void {
	d.add('limit', `The ${resource} limit is ${maximum}; split the circuit into smaller environments.`, span);
}

export function syntax(d: Diagnostics, expected: string, span: Span): void {
	d.add('syntax', `Expected ${expected}; correct the statement before converting it.`, span);
}

export function unsupported(d: Diagnostics, construct: string, span: Span): void {
	d.add('unsupported', `${construct} is not supported; use the documented CircuiTikZ subset instead.`, span);
}

export function environment(d: Diagnostics, span: Span): void {
	d.add('unsupported', 'Pass a single \\begin{circuitikz} … \\end{circuitikz} environment, with only whitespace or comments outside it.', span);
}

export function precision(d: Diagnostics, value: string, span: Span): void {
	d.add('syntax', `${value} has more than two decimal places; use at most two decimal places without rounding.`, span);
}

export function overflow(d: Diagnostics, span: Span): void {
	d.add('limit', 'The coordinate exceeds the exact integer range; use smaller coordinates or relative offsets.', span);
}

export function reference(d: Diagnostics, name: string, duplicate: boolean, span: Span): void {
	d.add('reference', duplicate
		? `Coordinate ${name} is already defined; give the second definition a different name.`
		: `Coordinate ${name} is not defined; define it before using it.`, span);
}

export function presentation(d: Diagnostics, key: string, span: Span): void {
	d.add('unsupported', `Presentation option ${key} was ignored; schemd draws its own style.`, span, true);
}

function geometry(d: Diagnostics, message: string, span: Span): void {
	d.add('geometry', message, span);
}

export function componentGeometry(d: Diagnostics, from: string, to: string, reason: string, span: Span): void {
	geometry(d, `Component segment ${from} to ${to} ${reason} (endpoints in hundredths of a TikZ unit); use an axis-aligned segment at least 0.84 TikZ units long.`, span);
}

export function overlap(d: Diagnostics, span: Span): void {
	geometry(d, 'Segments overlap along their length; separate them or join them at explicit endpoints.', span);
}

export function internal(d: Diagnostics, reason: string, span: Span): void {
	d.add('internal', `Conversion verification failed: ${reason}; please report this with the input.`, span);
}

export function placementOverlap(d: Diagnostics, first: string, second: string, span: Span): void {
	geometry(d, `Components ${first} and ${second} overlap at the required scale; increase their separation.`, span);
}

export function labelExtent(d: Diagnostics, id: string, span: Span): void {
	geometry(d, `Component ${id} or its label exceeds the fixed canvas; shorten the label or enlarge the circuit geometry.`, span);
}

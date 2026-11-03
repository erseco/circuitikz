import type { Span } from './ast.js';
import type { CircuitikzDiagnostic, CircuitikzDiagnosticCode } from './types.js';

/** Central diagnostic sink; stable sorting preserves phase order at ties. */
export class Diagnostics {
	readonly items: CircuitikzDiagnostic[] = [];

	add(code: CircuitikzDiagnosticCode, message: string, span: Span): void {
		this.items.push({ code, message, line: span.line, column: span.column, endColumn: span.endColumn, severity: 'error' });
	}

	sorted(): CircuitikzDiagnostic[] {
		return [...this.items].sort((a, b) => a.line - b.line || a.column - b.column);
	}
}

/** `advice` says what to write instead, since splitting helps one ceiling and not another. */
export function limit(d: Diagnostics, resource: string, maximum: number, advice: string, span: Span): void {
	d.add('limit', `The ${resource} limit is ${maximum}; ${advice}.`, span);
}

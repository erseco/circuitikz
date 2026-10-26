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

export function limit(d: Diagnostics, resource: string, maximum: number, span: Span): void {
	d.add('limit', `The ${resource} limit is ${maximum}; split the circuit into smaller environments.`, span);
}

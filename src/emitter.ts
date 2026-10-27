import type { SchematicFence, SchematicOrientation } from '@schemd/core';
import type { Circuit } from './circuit.js';
import type { Point, Span } from './ast.js';
import type { CircuitikzMapping } from './types.js';
import { MARGIN } from './limits.js';

export interface Emission { readonly source: string; readonly fence: SchematicFence; readonly sourceMap: readonly CircuitikzMapping[] }

/** The one TikZ-vertex to canvas mapping (R-5.3.1): translate, flip y, add the margin. */
export function canvas(circuit: Circuit, v: Point): Point {
	return { x: v.x - circuit.bounds.minX + MARGIN, y: circuit.bounds.maxY - v.y + MARGIN };
}

/** Orientation is derived from semantic terminal order, including polarity swaps.
 * The midpoint rounds down after the y flip (R-5.3.4); the even margin does not change it. */
export function placement(circuit: Circuit, from: number, to: number, reverse: boolean): { x: number; y: number; orientation: SchematicOrientation } {
	const a = circuit.vertices[from]!, b = circuit.vertices[to]!, p = canvas(circuit, a), q = canvas(circuit, b);
	const dx = (b.x - a.x) * (reverse ? -1 : 1), dy = (b.y - a.y) * (reverse ? -1 : 1);
	return { x: Math.floor((p.x + q.x) / 2), y: Math.floor((p.y + q.y) / 2),
		orientation: from === to ? 'right' : dx > 0 ? 'right' : dx < 0 ? 'left' : dy < 0 ? 'down' : 'up' };
}

/** Emit source once; the graph's expected connectivity already exists. */
export function emit(circuit: Circuit, title: string): Emission {
	const lines: string[] = [];
	const sourceMap: CircuitikzMapping[] = [];
	const add = (line: string, span: Span): void => {
		lines.push(line); sourceMap.push({ schemdLine: lines.length, line: span.line, column: span.column, endColumn: span.endColumn });
	};
	for (const part of circuit.parts) {
		const p = placement(circuit, part.from, part.to, part.first !== part.spec.canonical);
		const options = [part.spec.variant === '' ? '' : `${part.spec.kind === 'ground' ? 'style' : 'type'}=${part.spec.variant}`, p.orientation === 'right' ? '' : `orientation=${p.orientation}`].filter((v) => v !== '');
		add(`${part.spec.kind}:${part.id}${part.spec.label === undefined ? '' : ` "${part.spec.label}"`} at (${p.x}, ${p.y}) #${part.spec.color}${options.length === 0 ? '' : ` [${options.join(' ')}]`}`, part.span);
	}
	for (const junction of circuit.junctions) {
		const v = canvas(circuit, circuit.vertices[junction.vertex]!);
		add(`junction:${junction.id} at (${v.x}, ${v.y}) #slate`, junction.span);
	}
	if (circuit.connections.length > 0) lines.push('');
	for (const edge of circuit.connections) add(`${edge.from} -> ${edge.to} #${edge.color} [ortho]`, edge.span);
	return { source: lines.join('\n') + '\n', fence: { bounds: { width: circuit.bounds.width, height: circuit.bounds.height }, title }, sourceMap };
}

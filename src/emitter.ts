import type { SchematicFence } from '@schemd/core';
import type { Circuit } from './circuit.js';
import type { Span } from './ast.js';
import type { CircuitikzMapping } from './types.js';
import { MARGIN } from './limits.js';

export interface Emission { readonly source: string; readonly fence: SchematicFence; readonly sourceMap: readonly CircuitikzMapping[] }

/** Orientation is derived from semantic terminal order, including polarity swaps. */
export function placement(circuit: Circuit, from: number, to: number, reverse: boolean): { x: number; y: number; orientation: string } {
	const a = circuit.vertices[from]!, b = circuit.vertices[to]!;
	const dx = (b.x - a.x) * (reverse ? -1 : 1), dy = (b.y - a.y) * (reverse ? -1 : 1);
	return { x: Math.floor(((a.x - circuit.bounds.minX) + (b.x - circuit.bounds.minX)) / 2) + MARGIN,
		y: Math.floor(((circuit.bounds.maxY - a.y) + (circuit.bounds.maxY - b.y)) / 2) + MARGIN,
		orientation: dx > 0 ? 'right' : dx < 0 ? 'left' : dy < 0 ? 'down' : 'up' };
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
		const options = [part.spec.variant === '' ? '' : `type=${part.spec.variant}`, p.orientation === 'right' ? '' : `orientation=${p.orientation}`].filter((v) => v !== '');
		add(`${part.spec.kind}:${part.id} "${part.spec.label ?? part.id}" at (${p.x}, ${p.y}) #${part.spec.color}${options.length === 0 ? '' : ` [${options.join(' ')}]`}`, part.span);
	}
	for (const junction of circuit.junctions) {
		const v = circuit.vertices[junction.vertex]!;
		add(`junction:${junction.id} "${junction.id}" at (${v.x - circuit.bounds.minX + MARGIN}, ${circuit.bounds.maxY - v.y + MARGIN}) #slate`, junction.span);
	}
	if (circuit.connections.length > 0) lines.push('');
	for (const edge of circuit.connections) add(`${edge.from} -> ${edge.to} #${edge.color} [ortho]`, edge.span);
	return { source: lines.join('\n') + '\n', fence: { bounds: { width: circuit.bounds.width, height: circuit.bounds.height }, title }, sourceMap };
}

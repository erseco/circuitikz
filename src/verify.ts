import { buildNetlist, compileSchematic, diagnoseSchematic } from '@schemd/core';
import type { Circuit } from './circuit.js';
import type { Emission } from './emitter.js';
import { MARGIN } from './limits.js';
import { connectivityDifference, connectivityOf } from './topology.js';

/** Independently verify compiled identities, kinds, labels, orientation, position
 * and variants before comparing graph-derived nets with the actual netlist. */
export function verify(circuit: Circuit, output: Emission): string | undefined {
	const diagnostics = diagnoseSchematic(output.source, output.fence);
	if (diagnostics.length > 0) return diagnostics.map((d) => d.message).join('; ');
	const compiled = compileSchematic(output.source, output.fence).document;
	if (compiled.components.length !== circuit.parts.length + circuit.junctions.length) return 'The component inventory changed';
	for (const part of circuit.parts) {
		const actual = compiled.components.find((c) => c.id === part.id);
		if (actual === undefined || actual.kind !== part.spec.kind || actual.color.kind !== 'token' || actual.color.value !== part.spec.color || actual.label !== (part.spec.label ?? part.id)) return `Component ${part.id} changed identity, kind or label`;
		const a = circuit.vertices[part.from]!, b = circuit.vertices[part.to]!;
		const direction = b.x > a.x ? 0 : b.y < a.y ? 1 : b.x < a.x ? 2 : 3;
		const orientation = ['right', 'down', 'left', 'up'][(direction + (part.first === part.spec.canonical ? 0 : 2)) % 4]!;
		const x = Math.floor(((a.x - circuit.bounds.minX) + (b.x - circuit.bounds.minX)) / 2) + MARGIN;
		const y = Math.floor(((circuit.bounds.maxY - a.y) + (circuit.bounds.maxY - b.y)) / 2) + MARGIN;
		if (actual.x !== x || actual.y !== y || !('orientation' in actual) && orientation !== 'right'
			|| 'orientation' in actual && (actual.orientation ?? 'right') !== orientation) return `Component ${part.id} changed placement or orientation`;
		if (part.spec.variant !== '' && (!('variant' in actual) || actual.variant !== part.spec.variant)) return `Component ${part.id} changed variant`;
	}
	for (const junction of circuit.junctions) {
		const actual = compiled.components.find((c) => c.id === junction.id), vertex = circuit.vertices[junction.vertex]!;
		if (actual === undefined || actual.kind !== 'junction' || actual.label !== junction.id || actual.color.kind !== 'token' || actual.color.value !== 'slate'
			|| actual.x !== vertex.x - circuit.bounds.minX + MARGIN || actual.y !== circuit.bounds.maxY - vertex.y + MARGIN) return `Junction ${junction.id} changed identity, kind, label, color or position`;
	}

	return connectivityDifference(circuit.expected, connectivityOf(buildNetlist(compiled)));
}

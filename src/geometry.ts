import { componentObstacleRectangle, componentRectangle } from '@schemd/core';
import type { SchematicComponent } from '@schemd/core';
import type { Circuit } from './circuit.js';
import { Diagnostics, placementOverlap, labelExtent } from './diagnostics.js';
import { MARGIN } from './limits.js';
import { placement } from './emitter.js';

/** Preflight representability using core's public shape geometry, before the
 * correctness oracle runs. A fixed-cell broad phase bounds local comparisons. */
export function checkPlacement(circuit: Circuit, diagnostics: Diagnostics): void {
	const candidates: { component: SchematicComponent; span: Circuit['parts'][number]['span'] }[] = circuit.parts.map((part) => {
		const p = placement(circuit, part.from, part.to, part.first !== part.spec.canonical);
		const common = { id: part.id, label: part.spec.label ?? '', x: p.x, y: p.y, line: 1,
			orientation: p.orientation as 'right' | 'down' | 'left' | 'up', color: { kind: 'token' as const, value: 'slate' as const } };
		const kind = part.spec.kind;
		const component: SchematicComponent = kind === 'resistor' || kind === 'capacitor' || kind === 'inductor'
			? { ...common, kind } : { ...common, kind: 'source', variant: 'battery' };
		return { component, span: part.span };
	});
	for (const j of circuit.junctions) {
		const v = circuit.vertices[j.vertex]!;
		candidates.push({ component: { kind: 'junction', id: j.id, label: '', line: 1, x: v.x - circuit.bounds.minX + MARGIN,
			y: circuit.bounds.maxY - v.y + MARGIN, color: { kind: 'token', value: 'slate' } }, span: j.span });
	}
	const cells = new Map<string, number[]>();
	const rectangles = candidates.map(({ component }) => componentObstacleRectangle(component, 0));
	for (const [index, item] of candidates.entries()) {
		const extent = componentRectangle(item.component);
		if (extent.minX < 0 || extent.minY < 0 || extent.maxX > circuit.bounds.width || extent.maxY > circuit.bounds.height) {
			labelExtent(diagnostics, item.component.id, item.span);
		}
		const r = rectangles[index]!, seen = new Set<number>();
		let collision = false;
		for (let x = Math.floor(r.minX / 84); x <= Math.floor(r.maxX / 84); x += 1) {
			for (let y = Math.floor(r.minY / 84); y <= Math.floor(r.maxY / 84); y += 1) {
				const key = `${x},${y}`;
				let group = cells.get(key);
				if (group === undefined) { group = []; cells.set(key, group); }
				for (const previous of group) {
					if (seen.has(previous) || collision) continue;
					seen.add(previous);
					const p = rectangles[previous]!;
					if (r.minX < p.maxX && p.minX < r.maxX && r.minY < p.maxY && p.minY < r.maxY) {
						placementOverlap(diagnostics, candidates[previous]!.component.id, item.component.id, item.span);
						collision = true;
					}
				}
				group.push(index);
			}
		}
	}
}

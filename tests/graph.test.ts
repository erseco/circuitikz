import { expect, it } from 'vitest';
import { buildCircuit } from '../src/graph.js';
import { Diagnostics } from '../src/diagnostics.js';
import type { Segment } from '../src/circuit.js';
import { LIMITS } from '../src/limits.js';

const span = { start: 0, end: 1, line: 1, column: 1, endColumn: 2 };
it('checks the junction budget at the ceiling and before adding one more', () => {
	for (const extra of [0, 1]) {
		const segments: Segment[] = [];
		for (let i = 0; i < LIMITS.junctions + extra; i += 1) {
			for (const [dx, dy] of [[-10, 0], [10, 0], [0, 10]]) segments.push({ from: { x: i * 200, y: 0 }, to: { x: i * 200 + dx!, y: dy! }, fromSpan: span, toSpan: span, span, spec: undefined });
		}
		const d = new Diagnostics(false), circuit = buildCircuit(segments, span, d);
		if (extra === 0) {
			expect(d.items).toEqual([]);
			expect(circuit?.junctions).toHaveLength(512);
			expect(circuit?.expected).toEqual([]);
		} else {
			expect(circuit).toBeUndefined();
			expect(d.items).toEqual([{ code: 'limit', severity: 'error', message: 'The junctions limit is 512; split the circuit into smaller environments.', line: 1, column: 1, endColumn: 2 }]);
		}
	}
});

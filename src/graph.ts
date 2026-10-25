import { SCHEMATIC_LIMITS } from '@schemd/core';
import type { Point, Span } from './ast.js';
import type { Circuit, Connection, Junction, Part, Segment } from './circuit.js';
import { Diagnostics, componentGeometry, limit, overlap, unsupported } from './diagnostics.js';
import { LIMITS, MARGIN } from './limits.js';
import { canonical } from './topology.js';

/** Iterative path-compressed union-find. The earlier root wins every tie. */
class Nets {
	private readonly parents: number[] = [];
	add(): number { const id = this.parents.length; this.parents.push(id); return id; }
	find(id: number): number {
		let root = id;
		while (this.parents[root] !== root) root = this.parents[root]!;
		while (id !== root) { const next = this.parents[id]!; this.parents[id] = root; id = next; }
		return root;
	}
	join(a: number, b: number): boolean {
		const left = this.find(a), right = this.find(b);
		if (left === right) return false;
		this.parents[Math.max(left, right)] = Math.min(left, right); return true;
	}
}

/** Group collinear segments by primitive integer direction and offset, then
 * sweep intervals. Crossings never create vertices or electrical connections. */
function checkOverlaps(segments: readonly Segment[], minX: number, minY: number, diagnostics: Diagnostics): void {
	const groups = new Map<string, { low: number; high: number; span: Span }[]>();
	for (const segment of segments) {
		let dx = segment.to.x - segment.from.x, dy = segment.to.y - segment.from.y;
		if (dx === 0 && dy === 0) continue;
		let a = Math.abs(dx), b = Math.abs(dy);
		while (b !== 0) { const next = a % b; a = b; b = next; }
		dx /= a; dy /= a;
		if (dx < 0 || dx === 0 && dy < 0) { dx = -dx; dy = -dy; }
		const key = `${dx},${dy},${dx * (segment.from.y - minY) - dy * (segment.from.x - minX)}`;
		const start = dx === 0 ? segment.from.y : segment.from.x;
		const end = dx === 0 ? segment.to.y : segment.to.x;
		let group = groups.get(key);
		if (group === undefined) { group = []; groups.set(key, group); }
		group.push({ low: Math.min(start, end), high: Math.max(start, end), span: segment.span });
	}
	for (const group of groups.values()) {
		group.sort((a, b) => a.low - b.low || a.span.start - b.span.start);
		let high = group[0]!.high;
		for (let i = 1; i < group.length; i += 1) {
			const item = group[i]!;
			if (item.low < high) overlap(diagnostics, item.span);
			high = Math.max(high, item.high);
		}
	}
}

interface Anchor { readonly terminal: string; readonly color: string; readonly order: number; readonly start: boolean; readonly span: Span }
interface Link { readonly from: number; readonly to: number; readonly order: number; readonly wire: boolean; readonly span: Span }

/** Build expected nets before emission and independently contract a source-ordered
 * wire forest into terminal/junction connections. No emitted text is read here. */
export function buildCircuit(segments: readonly Segment[], span: Span, diagnostics: Diagnostics): Circuit | undefined {
	const vertices: { x: number; y: number; span: Span; degree: number }[] = [];
	const ids = new Map<string, number>();
	const nets = new Nets();
	const vertex = (p: Point, source: Span): number => {
		const key = `${p.x},${p.y}`;
		let id = ids.get(key);
		if (id === undefined) { id = nets.add(); ids.set(key, id); vertices.push({ ...p, span: source, degree: 0 }); }
		return id;
	};
	const parts: Part[] = [];
	const counts = new Map<string, number>();
	const links: Link[] = [];
	for (const [index, segment] of segments.entries()) {
		const from = vertex(segment.from, segment.fromSpan), to = vertex(segment.to, segment.toSpan);
		if (from === to && (segment.spec === undefined || segment.spec.kind === 'wire')) continue;
		vertices[from]!.degree += 1; if (segment.spec?.kind !== 'ground') vertices[to]!.degree += 1;
		if (segment.spec === undefined || segment.spec.kind === 'wire') {
			if (nets.join(from, to)) links.push({ from, to, order: index * 2, wire: true, span: segment.span });
			continue;
		}
		const spec = segment.spec;
		const dx = segment.to.x - segment.from.x, dy = segment.to.y - segment.from.y;
		if (spec.kind !== 'ground' && (dx !== 0 && dy !== 0 || Math.abs(dx) + Math.abs(dy) < 84)) {
			componentGeometry(diagnostics, `(${segment.from.x},${segment.from.y})`, `(${segment.to.x},${segment.to.y})`,
				dx !== 0 && dy !== 0 ? 'is diagonal' : dx === 0 && dy === 0 ? 'has zero length' : 'is too short', segment.span);
		}
		const count = (counts.get(spec.prefix) ?? 0) + 1;
		counts.set(spec.prefix, count);
		parts.push({ id: `${spec.prefix}${count}`, spec, from, to, first: spec.inverted ? spec.last : spec.first,
			last: spec.inverted ? spec.first : spec.last, span: segment.span });
	}
	let minX = 0, maxX = 0, minY = 0, maxY = 0;
	if (vertices.length > 0) {
		minX = maxX = vertices[0]!.x; minY = maxY = vertices[0]!.y;
		for (const v of vertices) { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); }
	}
	const width = maxX - minX + 2 * MARGIN, height = maxY - minY + 2 * MARGIN;
	if (width > SCHEMATIC_LIMITS.maximumBound || height > SCHEMATIC_LIMITS.maximumBound) {
		limit(diagnostics, 'canvas extent', SCHEMATIC_LIMITS.maximumBound - 2 * MARGIN, span); return undefined;
	}
	checkOverlaps(segments, minX, minY, diagnostics);
	const junctions: Junction[] = [];
	const anchors = new Map<number, Anchor>();
	for (const [id, v] of vertices.entries()) {
		if (v.degree < 3) continue;
		if (junctions.length === LIMITS.junctions) { limit(diagnostics, 'junctions', LIMITS.junctions, v.span); return undefined; }
		const name = `J${junctions.length + 1}`;
		junctions.push({ id: name, vertex: id, span: v.span });
		anchors.set(id, { terminal: `${name}.node`, color: 'slate', order: -1, start: false, span: v.span });
	}
	if (parts.length + junctions.length === 0) unsupported(diagnostics, 'A circuit without components or junctions', span);
	const expected = new Map<number, string[]>();
	const partBySpan = new Map(parts.map((part) => [part.span.start, part]));
	let extra = vertices.length;
	for (const [index, segment] of segments.entries()) {
		const part = partBySpan.get(segment.span.start);
		if (part === undefined) continue;
		for (const [at, port, start] of (part.spec.kind === 'ground' ? [[part.from, part.first, true] as const] : [[part.from, part.first, true], [part.to, part.last, false]] as const)) {
			const terminal = `${part.id}.${port}`, root = nets.find(at);
			let terminals = expected.get(root);
			if (terminals === undefined) { terminals = []; expected.set(root, terminals); }
			terminals.push(terminal);
			const id = extra++;
			anchors.set(id, { terminal, color: part.spec.color, order: index * 2 + (start ? 0 : 1), start, span: part.span });
			links.push({ from: start ? at : id, to: start ? id : at, wire: false, order: index * 2 + (start ? 0 : 1), span: part.span });
		}
	}
	const adjacency: number[][] = Array.from({ length: extra }, () => []);
	links.forEach((edge, index) => { adjacency[edge.from]!.push(index); adjacency[edge.to]!.push(index); });
	const hasAnchor = new Set([...expected.keys(), ...junctions.map((j) => nets.find(j.vertex))]);
	for (const edge of links) if (edge.wire && !hasAnchor.has(nets.find(edge.from))) unsupported(diagnostics, 'A wire connected to nothing', edge.span);
	const connections: Connection[] = [];
	const visited = new Set<number>();
	for (const [origin, anchor] of anchors) {
		for (const first of adjacency[origin]!) {
			if (visited.has(first)) continue;
			let at = origin, next = first;
			const chain: { edge: Link; forward: boolean }[] = [];
			for (;;) {
				const edge = links[next]!;
				visited.add(next);
				const forward = edge.from === at;
				chain.push({ edge, forward }); at = forward ? edge.to : edge.from;
				if (anchors.has(at) || adjacency[at]!.length !== 2) break;
				next = adjacency[at]!.find((id) => id !== next)!;
			}
			const other = anchors.get(at);
			if (other === undefined) continue;
			const wires = chain.filter((item) => item.edge.wire);
			let forward: boolean, order: number, source: Span;
			if (wires.length > 0) {
				const earliest = wires.reduce((a, b) => a.edge.order < b.edge.order ? a : b);
				forward = earliest.forward; order = earliest.edge.order; source = earliest.edge.span;
			} else {
				// Junction anchors are inserted before terminal anchors; otherwise
				// the first visited terminal is necessarily the earlier source event.
				forward = anchor.order < 0 ? other.start : true;
				order = anchor.order < 0 ? other.order : anchor.order;
				source = other.span;
			}
			connections.push({ from: forward ? anchor.terminal : other.terminal, to: forward ? other.terminal : anchor.terminal,
				color: forward ? anchor.color : other.color, span: source, order });
		}
	}
	connections.sort((a, b) => a.order - b.order);
	return { vertices, parts, junctions, connections, expected: canonical([...expected.values()]), bounds: { minX, maxY, width, height } };
}

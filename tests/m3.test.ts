import { buildNetlist, compileSchematic } from '@schemd/core';
import { describe, expect, it } from 'vitest';
import { canonical, connectivityOf, convertCircuitikz } from '../src/index.js';
import { LIMITS } from '../src/limits.js';

const wrap = (body: string, env = '') => `\\begin{circuitikz}${env}\n${body}\n\\end{circuitikz}`;
function converted(body: string, env = '') {
	const result = convertCircuitikz(wrap(body, env));
	expect(result.diagnostics, body).toEqual([]); expect(result.ok, body).toBe(true);
	const compilation = compileSchematic(result.source!, result.fence!);
	return { ...result, parts: compilation.document.components, nets: connectivityOf(buildNetlist(compilation.document)) };
}
const families = [
	['battery', 'source', 'B', 'positive', 'negative', 'battery'], ['battery2', 'source', 'B', 'positive', 'negative', 'battery'],
	['D', 'diode', 'D', 'anode', 'cathode', 'standard'], ['diode', 'diode', 'D', 'anode', 'cathode', 'standard'],
	['empty diode', 'diode', 'D', 'anode', 'cathode', 'standard'], ['full diode', 'diode', 'D', 'anode', 'cathode', 'standard'],
	['zD', 'diode', 'D', 'anode', 'cathode', 'zener'], ['leD', 'diode', 'D', 'anode', 'cathode', 'led'],
	['nos', 'switch', 'S', 'in', 'out', 'spst'], ['ospst', 'switch', 'S', 'in', 'out', 'spst'],
	['ncs', 'switch', 'S', 'in', 'out', 'spst'], ['cspst', 'switch', 'S', 'in', 'out', 'spst']
] as const;

describe.each(families)('%s family', (alias, kind, prefix, initial, final, variant) => {
	it.each([[1, 0], [-1, 0], [0, 1], [0, -1]])('preserves terminals and orientation along (%i,%i), including invert', (dx, dy) => {
		for (const invert of [false, true]) {
			const point = (n: number) => `(${dx * n},${dy * n})`;
			const result = converted(`\\draw ${point(-2)} to[R] ${point(0)} to[${alias}=part${invert ? ',invert' : ''}] ${point(2)} to[C] ${point(4)};`);
			const first = invert ? final : initial, last = invert ? initial : final;
			expect(result.nets).toEqual(canonical([['R1.in'], ['R1.out', `${prefix}1.${first}`], [`${prefix}1.${last}`, 'C1.in'], ['C1.out']]));
			const part = result.parts[1]!;
			expect(part).toMatchObject({ kind, label: 'part', id: `${prefix}1` });
			expect('diodeType' in part ? part.diodeType : 'variant' in part ? part.variant : '').toBe(variant);
			const base = dx > 0 ? 0 : dy < 0 ? 1 : dx < 0 ? 2 : 3;
			const expected = ['right', 'down', 'left', 'up'][(base + ((kind === 'source') !== invert ? 2 : 0)) % 4];
			expect('orientation' in part ? part.orientation : 'right').toBe(expected);
		}
	});
});

it.each(['battery', 'battery2'])('composes fixbatteries and invert for %s', (alias) => {
	for (const fix of [false, true]) for (const invert of [false, true]) {
		const result = converted(`\\draw (-2,0) to[R] (0,0) to[${alias}${invert ? ',invert' : ''}] (2,0) to[C] (4,0);`, fix ? '[fixbatteries]' : '');
		const positiveAtStart = fix === invert;
		expect(result.nets).toContainEqual([`B1.${positiveAtStart ? 'positive' : 'negative'}`, 'R1.out']);
	}
});

it('models earth ground as a unary terminal, including standalone and branch nodes', () => {
	const isolated = converted('\\draw (0,0) node[ground]{};');
	expect(isolated.source).toBe('ground:G1 "G1" at (80, 80) #slate [style=earth]\n');
	expect(isolated.parts[0]).toMatchObject({ kind: 'ground', groundStyle: 'earth' });
	expect(isolated.nets).toEqual([['G1.in']]);
	const result = converted('\\draw (0,0) to[R] (2,0) to[C] (4,0);\\draw (2,0) -- (2,-2) node[ground]{};');
	expect(result.nets).toEqual([['C1.in', 'G1.in', 'R1.out'], ['C1.out'], ['R1.in']]);
	expect(result.parts.map(({ id }) => id)).toEqual(['R1', 'C1', 'G1', 'J1']);
	expect(converted('\\draw (0,0) node[ground]{} to[R] (2,0);').nets).toEqual([['G1.in', 'R1.in'], ['R1.out']]);
});

it('counts ground declarations against the shared component ceiling before graph work', () => {
	const body = (n: number) => Array.from({ length: n }, (_, i) => `\\draw (${i * 2},0) node[ground]{};`).join('\n');
	expect(convertCircuitikz(wrap(body(LIMITS.components))).ok).toBe(true);
	const result = convertCircuitikz(wrap(body(LIMITS.components + 1)));
	expect(result.ok).toBe(false);
	expect(result.diagnostics.some((d) => d.code === 'limit' && d.message === 'The components limit is 512; split the circuit into smaller environments.')).toBe(true);
});

it.each(['node', 'node[ground]', 'node[ground]{text}', 'node[ground]{{}}', 'node[]{}', 'node[sground]{}', 'node[ground,ground]{}', 'node[ground,invert]{}', 'node[ground=1]{}', 'node[ground', 'node[ground];'])('rejects unsupported ground form %s without partial output', (node) => {
	const result = convertCircuitikz(wrap(`\\draw (0,0) ${node};\\draw (unknown);`));
	expect(result.ok).toBe(false); expect(result.sourceMap).toEqual([]);
	expect(result.diagnostics.some((d) => d.code === 'internal')).toBe(false);
	expect(result.diagnostics.some((d) => d.code === 'reference')).toBe(true);
});

it('retains recovery brace depth after consuming a malformed node body', () => {
	const result = convertCircuitikz(wrap('\\draw (0,0) node[ground]{bad; still};\\node {unsupported};'));
	expect(result.diagnostics.map((d) => d.message)).toEqual([
		'Expected }; correct the statement before converting it.',
		'\\node is not supported; use the documented CircuiTikZ subset instead.'
	]);
	expect(convertCircuitikz(wrap('\\draw (missing) node[ground]{};')).diagnostics.map((d) => d.code)).toEqual(['reference']);
});

it('warns for source-cited built-in pole decorations without changing nets', () => {
	for (const pole of ['*-o', 'o-*', 'd-o', 'o-d', 'd-', '-d', 'd-*', '*-d', 'd-d', '.-', '.-*', '.-o', '.-d', '-.', 'o-.', '*-.', 'd-.', '.-.']) {
		const result = convertCircuitikz(wrap(`\\draw (0,0) to[D,${pole}] (2,0) node[ground,thin]{};`));
		expect(result.ok, pole).toBe(true);
		expect(result.diagnostics.map((d) => d.severity)).toEqual(['warning', 'warning']);
		expect(convertCircuitikz(wrap(`\\draw (0,0) to[D,${pole}] (2,0);`), { strict: true }).ok).toBe(false);
	}
});

it.each(['sD', 'lasD', 'pD', 'oncs', 'spdt', 'sground', 'ground', 'battery3'])('does not approximate unsupported component %s', (alias) => {
	expect(convertCircuitikz(wrap(`\\draw (0,0) to[${alias}] (2,0);`)).ok).toBe(false);
});

it('rejects a ground body colliding with a mandatory junction instead of dropping the junction', () => {
	const result = convertCircuitikz(wrap('\\draw (0,0) to[R] (2,0) node[ground]{} to[C] (4,0);'));
	expect(result.ok).toBe(false);
	expect(result.diagnostics).toMatchObject([{ code: 'geometry', message: 'Components G1 and J1 overlap at the required scale; increase their separation.' }]);
});

it('underlines unsupported label characters at exact UTF-16 sub-token spans', () => {
	const result = convertCircuitikz(wrap('\\draw (0,0) to[R=ab@😀] (2,0);'));
	expect(result.diagnostics).toEqual([
		{ code: 'unsupported', severity: 'error', message: 'Label character @ is not supported; use the documented CircuiTikZ subset instead.', line: 2, column: 20, endColumn: 21 },
		{ code: 'unsupported', severity: 'error', message: 'Label character 😀 is not supported; use the documented CircuiTikZ subset instead.', line: 2, column: 21, endColumn: 23 }
	]);
});

it.each(families)('rejects zero, diagonal and undersized %s segments', (alias) => {
	for (const destination of ['(0,0)', '(1,1)', '(0.83,0)']) {
		const result = convertCircuitikz(wrap(`\\draw (0,0) to[${alias}] ${destination};`));
		expect(result.ok).toBe(false);
		expect(result.source).toBeUndefined();
		expect(result.diagnostics.some((d) => d.code === 'geometry')).toBe(true);
		expect(result.diagnostics.some((d) => d.code === 'internal')).toBe(false);
	}
});

it('preserves intended connectivity when independent components reorder and their source-order IDs change', () => {
	const a = '\\draw (0,0) to[R=left] (2,0);', b = '\\draw (4,0) to[R=right] (6,0);', wire = '\\draw (2,0) -- (4,0);';
	for (const body of [a + b + wire, b + wire + a, wire + b + a]) {
		const result = converted(body), labels = new Map(result.parts.map((part) => [part.id, part.label]));
		const meaning = canonical(result.nets.map((net) => net.map((terminal) => {
			const [id, port] = terminal.split('.'); return `${labels.get(id!)}.${port}`;
		})));
		expect(meaning).toEqual([['left.in'], ['left.out', 'right.in'], ['right.out']]);
	}
});

it('keeps equivalent aliases byte-identical apart from source maps', () => {
	for (const aliases of [['R', 'resistor', 'american resistor', 'european resistor'], ['C', 'capacitor'], ['L', 'inductor', 'cute inductor', 'european inductor', 'american inductor'], ['battery1', 'battery', 'battery2'], ['D', 'diode', 'empty diode', 'full diode'], ['nos', 'ncs', 'ospst', 'cspst']]) {
		const first = converted(`\\draw (0,0) to[${aliases[0]}=100] (2,0);`);
		for (const alias of aliases.slice(1)) {
			const result = converted(`\\draw (0,0) to[${alias}=100] (2,0);`);
			expect([result.source, result.fence, result.nets]).toEqual([first.source, first.fence, first.nets]);
		}
	}
});

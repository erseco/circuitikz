import { buildNetlist, compileSchematic } from '@schemd/core';
import { describe, expect, it } from 'vitest';
import { convertCircuitikz, connectivityOf, canonical } from '../src/index.js';
import { Diagnostics } from '../src/diagnostics.js';
import { labelOf } from '../src/labels.js';
import { scan } from '../src/lexer.js';

const wrap = (body: string, env = '') => `\\begin{circuitikz}${env}\n${body}\n\\end{circuitikz}`;
function convert(body: string, env = '') {
	const result = convertCircuitikz(wrap(body, env));
	expect(result.diagnostics, body).toEqual([]);
	expect(result.ok, body).toBe(true);
	const compiled = compileSchematic(result.source!, result.fence!);
	return { ...result, components: compiled.document.components, nets: connectivityOf(buildNetlist(compiled.document)) };
}

describe('M2 conversion', () => {
	it.each([
		['R', 'resistor'], ['resistor', 'resistor'], ['american resistor', 'resistor'], ['european resistor', 'resistor'],
		['C', 'capacitor'], ['capacitor', 'capacitor'], ['L', 'inductor'], ['inductor', 'inductor'],
		['american inductor', 'inductor'], ['cute inductor', 'inductor'], ['european inductor', 'inductor']
	])('maps %s independently to %s, without adding units', (alias, kind) => {
		const result = convert(`\\draw (0,0) to[${alias}=100] (2,0);`);
		expect(result.components).toHaveLength(1);
		expect(result.components[0]).toMatchObject({ kind, label: '100', x: 180, y: 80 });
		expect(result.source).not.toContain('Ω');
	});

	it.each([
		['(0,0)', '(2,0)', 'right'], ['(2,0)', '(0,0)', 'left'],
		['(0,0)', '(0,2)', 'up'], ['(0,2)', '(0,0)', 'down']
	])('preserves orientation from %s to %s', (a, b, orientation) => {
		const result = convert(`\\draw ${a} to[R] ${b};`);
		expect(result.components[0]).toMatchObject({ kind: 'resistor', label: 'R1' });
		expect('orientation' in result.components[0]! ? result.components[0].orientation : 'right').toBe(orientation);
	});

	it.each([[false, false], [true, false], [false, true], [true, true]])('preserves battery1 fix=%s invert=%s by terminal and orientation', (fix, invert) => {
		const result = convert(`\\draw (-2,0) to[R] (0,0) to[battery1${invert ? ',invert,invert' : ''}] (2,0) to[C] (4,0);`, fix ? '[fixbatteries]' : '');
		const first = fix !== invert ? 'negative' : 'positive', last = first === 'positive' ? 'negative' : 'positive';
		expect(result.nets).toEqual(canonical([['R1.in'], ['R1.out', `B1.${first}`], [`B1.${last}`, 'C1.in'], ['C1.out']]));
		expect(result.components[1]).toMatchObject({ kind: 'source', variant: 'battery' });
		expect('orientation' in result.components[1]! ? result.components[1].orientation : 'right').toBe(first === 'positive' ? 'left' : 'right');
	});

	it('swaps passive terminals on invert and preserves labels and IDs', () => {
		const result = convert('\\draw (0,0) to[R=one] (2,0) to[R=two,invert] (4,0);');
		expect(result.nets).toEqual([['R1.in'], ['R1.out', 'R2.out'], ['R2.in']]);
		expect(result.components.map(({ id, label }) => [id, label])).toEqual([['R1', 'one'], ['R2', 'two']]);
	});

	it('normalizes exact half-unit midpoints after flipping y', () => {
		const result = convert('\\draw (-0.01,-0.01) to[R] (0.84,-0.01);\\draw (2.84,-0.01) to[C] (2.84,0.84);');
		expect(result.components.map(({ x, y }) => [x, y])).toEqual([[122, 165], [365, 122]]);
		expect(result.fence?.bounds).toEqual({ width: 445, height: 245 });
	});

	it('resolves names, explicit cm, corners, + and ++ without synthetic corner junctions', () => {
		const result = convert('\\coordinate (A) at (0cm,0cm);\\draw (A) to[R] ++(2,0) coordinate (B) |- +(1,2) -- ++(0,3) to[C] (0,3) -| (A);');
		expect(result.components.map(({ kind }) => kind)).toEqual(['resistor', 'capacitor']);
		expect(result.nets).toEqual([['C1.in', 'R1.out'], ['C1.out', 'R1.in']]);
	});

	it('drops the last edge of a wire cycle and keeps junction nets intact', () => {
		const result = convert('\\draw (0,0) to[R] (2,0);\\draw (2,0) -- (4,0) -- (4,2) -- (2,2) -- cycle;');
		expect(result.components.map(({ id }) => id)).toEqual(['R1', 'J1']);
		expect(result.nets).toEqual([['R1.in'], ['R1.out']]);
		expect(result.source?.split('\n').filter((line) => line.includes(' -> '))).toHaveLength(1);
	});

	it('does not connect perpendicular geometric crossings without shared vertices', () => {
		const result = convert('\\draw (-2,0) to[R] (0,0) -- (4,0) to[C] (6,0);\\draw (2,-4) to[L] (2,-2) -- (2,2) to[R] (2,4);');
		expect(result.nets).toEqual(canonical([['R1.in'], ['R1.out', 'C1.in'], ['C1.out'], ['L1.in'], ['L1.out', 'R2.in'], ['R2.out']]));
		expect(result.components.filter((c) => c.kind === 'junction')).toEqual([]);
	});

	it('allows dangling wire stubs on a component without inventing a terminal', () => {
		const result = convert('\\draw (0,0) to[R] (2,0) -- (3,0);');
		expect(result.nets).toEqual([['R1.in'], ['R1.out']]);
		expect(result.source).toBe('resistor:R1 "R1" at (180, 80) #amber\n');
	});

	it('keeps a redundant zero-length wire from duplicating electrical connections', () => {
		const result = convert('\\draw (0,0) to[R] (2,0) -- (2,0);');
		expect(result.nets).toEqual([['R1.in'], ['R1.out']]);
	});

	it('validates and transcribes text/math labels, grouping and supported commands', () => {
		const text = convert('\\draw (0,0) to[R=Bob\'s 100.5 / (2): +] (2,0);');
		expect(text.components[0]?.label).toBe("Bob's 100.5 / (2): +");
		const math = convert('\\draw (0,0) to[R={$R_{1}^{2}\\,\\Omega\\;\\mu\\ alpha$}] (2,0);');
		expect(math.components[0]?.label).toBe('R_{1}^{2} \\Omega \\mu alpha');
		const comment = convert('\\draw (0,0) to[R=a  %gone\nb] (2,0);');
		expect(comment.components[0]?.label).toBe('a  b');
	});

	it('handles presentation-label keys with a warning and strict escalation', () => {
		for (const key of ['l_', 'l^', 'a', 'a_', 'a^']) {
			const input = wrap(`\\draw (0,0) to[R,${key}=text,-*,mirror] (2,0);`);
			const result = convertCircuitikz(input);
			expect(result.ok).toBe(true);
			expect(result.diagnostics.map((d) => d.severity)).toEqual(['warning', 'warning', 'warning']);
			expect(convertCircuitikz(input, { strict: true }).ok).toBe(false);
		}
	});

	it.each([
		'\\draw (0,0) to[R] (1,1);', '\\draw (0,0) to[C] (0,0);', '\\draw (0,0) to[L] (0.83,0);',
		'\\draw (0,0) to[R=one,l=two] (2,0);', '\\draw (0,0) to[R,C] (2,0);', '\\draw (0,0) to[V] (2,0);',
		'\\draw (0,0) to[R,v=2] (2,0);', '\\draw (0,0) to[short=label] (2,0);', '\\draw (0,0) to[short,invert] (2,0);',
		'\\draw (0,0) to[R=] (2,0);', '\\draw (0,0) to[R=$$] (2,0);', '\\draw (0,0) to[R={text}] (2,0);',
		'\\draw (0,0) to[R=100\\%] (2,0);', '\\draw (0,0) to[R=$\\frac{1}{2}$] (2,0);', '\\draw (0,0) to[R="text"] (2,0);',
		'\\draw (0,0) -- (2,0);', '\\draw (0,0) to[R] (2,0);\\draw (4,0) -- (6,0);',
		'\\draw (0,0) -- (3,0) -- (2,0) to[R] (2,2);',
		'\\draw (0,0) to[R] (0,2);\\draw (0,1) -- (0,3);',
		'\\draw (0,0) to[R] (2,0);\\draw (0,0) -- (2,2) -- (1,1);',
		'\\draw (0,0) to[R] (10485,0);', '\\draw (0,0) to[R] (0,10485);'
	])('rejects geometry or unsupported semantics without partial output: %s', (body) => {
		const result = convertCircuitikz(wrap(body));
		expect(result.ok).toBe(false);
		expect(result.source).toBeUndefined();
		expect(result.sourceMap).toEqual([]);
		expect(result.diagnostics.some((d) => d.code === 'internal')).toBe(false);
	});
});

describe('M2 metamorphic properties', () => {
	it('normalizes uniform integer coordinate translations byte-identically', () => {
		for (let x = -10; x <= 10; x += 2) {
			const shape = (dx: number, dy: number) => `\\draw (${dx},${dy}) to[R=100] (${dx + 2},${dy}) -- (${dx + 2},${dy + 2}) to[C] (${dx},${dy + 2}) -- cycle;`;
			expect(convert(shape(x, x + 3)).source).toBe(convert(shape(0, 0)).source);
		}
	});

	it('reverses wire-only paths and reorders independent wire statements without changing nets', () => {
		const components = '\\draw (0,0) to[R] (2,0);\\draw (4,0) to[C] (6,0);';
		const a = convert(components + '\\draw (2,0) -- (3,0) -- (4,0);');
		const b = convert('\\draw (4,0) -- (3,0) -- (2,0);' + components);
		expect(a.nets).toEqual(b.nets);
		expect(convertCircuitikz(wrap(components))).toEqual(convertCircuitikz(wrap(components)));
	});
});

it('reports empty math labels at the exact dollar token', () => {
	const d = new Diagnostics(false), source = '$$';
	expect(labelOf(scan(source, d).slice(0, -1), source, d)).toBeUndefined();
	expect(d.items).toEqual([{ code: 'syntax', severity: 'error', message: 'Expected a non-empty label; correct the statement before converting it.', line: 1, column: 1, endColumn: 2 }]);
});

it('preserves safe integer coordinates near the limit without midpoint overflow', () => {
	const result = convert('\\draw (90071992547408,0) to[R] (90071992547408.84,0);');
	expect(result.components[0]).toMatchObject({ x: 122, y: 80 });
});

it('normalizes whitespace within supported labels and preflights representability', () => {
	for (const [source, label] of [['a\nb', 'a b'], ['a\rb', 'a b'], ['a\r\nb', 'a b'], ['a\tb', 'a b']]) {
		expect(convert(`\\draw (0,0) to[R=${source}] (2,0);`).components[0]?.label).toBe(label);
	}
	for (const body of [
		'\\draw (0,0) to[R] (0.84,0) to[C] (0.84,0.84);',
		'\\draw (0,0) to[R] (2,0);\\draw (0,0.1) to[C] (2,0.1);\\draw (0,0.2) to[L] (2,0.2);',
		`\\draw (0,0) to[R=${'a'.repeat(500)}] (2,0);`
	]) {
		const result = convertCircuitikz(wrap(body));
		expect(result.ok).toBe(false);
		expect(result.diagnostics.some((d) => d.code === 'geometry')).toBe(true);
		expect(result.diagnostics.some((d) => d.code === 'internal')).toBe(false);
	}
});

it('rejects equal-start overlapping intervals and discards geometrically empty wire steps', () => {
	expect(convertCircuitikz(wrap('\\draw (0,0) -- (2,0);\\draw (0,0) -- (1,0) to[R] (1,2);')).diagnostics.some((d) => d.code === 'geometry')).toBe(true);
	expect(convert('\\draw (0,0) to[R] (2,0) -- (2,0);').components).toHaveLength(1);
});

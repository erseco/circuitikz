import { buildNetlist, compileSchematic, parseSchematicFence } from '@schemd/core';
import { describe, expect, it } from 'vitest';

import { canonical, connectivityDifference, connectivityOf } from '../src/index';

/** Compile a document with the real compiler and take its netlist. */
function netlistOf(source: string, bounds = '640x420') {
	const fence = parseSchematicFence(`schemd bounds="${bounds}" title="Topology"`)!;
	return buildNetlist(compileSchematic(source, fence).document);
}

const series = `source:B1 "B1" at (80, 180) #blue [type=battery orientation=down]
resistor:R1 "100" at (180, 80) #amber
resistor:R2 "200" at (380, 80) #amber

B1.negative -> R1.in #blue [ortho]
R1.out -> R2.in #amber [ortho]
R2.out -> B1.positive #amber [ortho]`;

describe('connectivityOf', () => {
	it('completes core 1.1 nets with isolated non-junction ports', () => {
		const netlist = netlistOf('resistor:R1 "R1" at (100, 100) #amber');
		expect(netlist.nodes.map(({ id, ports }) => ({ id, ports }))).toEqual([{ id: 'R1', ports: ['in', 'out'] }]);
		expect(netlist.nets).toEqual([]);
		expect(connectivityOf(netlist)).toEqual([['R1.in'], ['R1.out']]);
		/* R-5.1.3's intended graph must instead contain both singleton nets.
		   Keep the public oracle unchanged until this conflict is reviewed. */
		expect(connectivityDifference([['R1.in'], ['R1.out']], connectivityOf(netlist))).toBeUndefined();
	});
	it('lists each net as sorted ID.port keys, nets sorted', () => {
		expect(connectivityOf(netlistOf(series))).toEqual([
			['B1.negative', 'R1.in'],
			['B1.positive', 'R2.out'],
			['R1.out', 'R2.in']
		]);
	});

	it('collapses a junction into the one net it joins', () => {
		const source = `resistor:R1 "R1" at (120, 100) #amber
resistor:R2 "R2" at (420, 100) #amber
resistor:R3 "R3" at (270, 260) #amber [orientation=down]
junction:J1 "J1" at (270, 100) #slate

R1.out -> J1.node #amber [ortho]
J1.node -> R2.in #slate [ortho]
J1.node -> R3.in #slate [ortho]`;
		expect(connectivityOf(netlistOf(source))).toEqual([['R1.in'], ['R1.out', 'R2.in', 'R3.in'], ['R2.out'], ['R3.out']]);
	});

	it('joins nets that meet only through a chain of junctions', () => {
		/* Two junctions wired to each other: their nets are one conductor. */
		const source = `resistor:R1 "R1" at (100, 100) #amber
resistor:R2 "R2" at (520, 100) #amber
junction:JA "JA" at (240, 100) #slate
junction:JB "JB" at (380, 100) #slate

R1.out -> JA.node #amber [ortho]
JA.node -> JB.node #slate [ortho]
JB.node -> R2.in #slate [ortho]`;
		expect(connectivityOf(netlistOf(source))).toEqual([['R1.in'], ['R1.out', 'R2.in'], ['R2.out']]);
	});

	it('keeps two junctions on different nets apart', () => {
		const source = `resistor:R1 "R1" at (100, 100) #amber
resistor:R2 "R2" at (520, 100) #amber
resistor:R3 "R3" at (100, 300) #amber
resistor:R4 "R4" at (520, 300) #amber
junction:JA "JA" at (310, 100) #slate
junction:JB "JB" at (310, 300) #slate

R1.out -> JA.node #amber [ortho]
JA.node -> R2.in #slate [ortho]
R3.out -> JB.node #amber [ortho]
JB.node -> R4.in #slate [ortho]`;
		expect(connectivityOf(netlistOf(source))).toEqual([
			['R1.in'], ['R1.out', 'R2.in'], ['R2.out'], ['R3.in'], ['R3.out', 'R4.in'], ['R4.out']
		]);
	});

	it('does not depend on the order connections are written in', () => {
		const lines = series.split('\n');
		const reversed = [...lines.slice(0, 4), ...lines.slice(4).reverse()].join('\n');
		expect(connectivityOf(netlistOf(reversed))).toEqual(connectivityOf(netlistOf(series)));
	});
});

describe('canonical', () => {
	it('sorts by code unit, not locale', () => {
		/* 'Z' (0x5A) sorts before 'a' (0x61); a locale compare would not. */
		expect(canonical([['a.in', 'Z.out']])).toEqual([['Z.out', 'a.in']]);
	});

	it('sorts nets by their whole contents, not just their first terminal', () => {
		expect(
			canonical([
				['A.x', 'C.y'],
				['A.x', 'B.y']
			])
		).toEqual([
			['A.x', 'B.y'],
			['A.x', 'C.y']
		]);
	});

	it('drops repeated terminals and empty nets', () => {
		expect(canonical([['R1.in', 'R1.in', 'R2.out'], []])).toEqual([['R1.in', 'R2.out']]);
	});

	it('leaves equal keys where they are', () => {
		expect(canonical([['R1.in'], ['R1.in']])).toEqual([['R1.in'], ['R1.in']]);
	});
});

describe('connectivityDifference', () => {
	const circuit = [
		['B1.negative', 'R1.in'],
		['R1.out', 'R2.in']
	];

	it('finds no difference between two spellings of one circuit', () => {
		expect(
			connectivityDifference(circuit, [
				['R2.in', 'R1.out'],
				['R1.in', 'B1.negative']
			])
		).toBeUndefined();
	});

	it('names a terminal that lost its connection', () => {
		expect(connectivityDifference(circuit, [['R1.out', 'R2.in']])).toBe(
			'B1.negative should be connected to B1.negative, R1.in, but is not connected at all.'
		);
	});

	it('names a terminal on the wrong net', () => {
		expect(
			connectivityDifference(circuit, [
				['B1.negative', 'R1.in', 'R2.in'],
				['R1.out']
			])
		).toBe('B1.negative should be on the net {B1.negative, R1.in}, but is on {B1.negative, R1.in, R2.in}.');
	});

	it('names a terminal connected where the TeX left it free', () => {
		expect(connectivityDifference(circuit, [...circuit, ['R3.in']])).toBe(
			'R3.in is connected to {R3.in}, but should not be connected.'
		);
	});
});

/**
 * The topology oracle.
 *
 * A conversion is correct when the circuit it emits ties together exactly the
 * terminals the TeX tied together. Drawings may differ — schemd routes its own
 * wires — so the comparison is over connectivity, not geometry.
 *
 * In schemd a junction is a part whose one terminal, `node`, several
 * connections reach, so `buildNetlist` already puts everything wired to it on
 * one net. In CircuiTikZ the same point is just where paths meet. So the
 * canonical form drops junction terminals and names only real components'.
 */
import type { SchematicNetlist } from '@schemd/core';

import type { CircuitConnectivity } from './types.js';

/** Canonical connectivity of a schemd netlist, junctions left out. */
export function connectivityOf(netlist: SchematicNetlist): CircuitConnectivity {
	const junctions = new Set(netlist.nodes.filter((node) => node.kind === 'junction').map((node) => node.id));
	const nets = netlist.nets.map((net) =>
		net.terminals.filter((terminal) => !junctions.has(terminal.componentId)).map((terminal) => `${terminal.componentId}.${terminal.port}`)
	);
	const present = new Set(nets.flat());
	for (const node of netlist.nodes) {
		if (junctions.has(node.id)) continue;
		for (const port of node.ports) {
			const terminal = `${node.id}.${port}`;
			if (!present.has(terminal)) nets.push([terminal]);
		}
	}
	return canonical(nets);
}

/**
 * Sort each net and then the nets, by code unit rather than locale, so two
 * descriptions of one circuit compare equal however they were written. A net
 * left with no terminal — junctions wired only to each other — is dropped.
 */
export function canonical(nets: readonly (readonly string[])[]): CircuitConnectivity {
	return nets
		.filter((net) => net.length > 0)
		.map((net) => [...new Set(net)].sort(compare))
		.sort((left, right) => compare(left.join('\n'), right.join('\n')));
}

/**
 * The first difference between two connectivities, as a sentence, or
 * `undefined` when they describe one circuit. Both are canonicalised first.
 */
export function connectivityDifference(expected: CircuitConnectivity, actual: CircuitConnectivity): string | undefined {
	const netOf = (nets: CircuitConnectivity): Map<string, string> => {
		const owner = new Map<string, string>();
		for (const net of canonical(nets)) for (const terminal of net) owner.set(terminal, net.join(', '));
		return owner;
	};
	const wanted = netOf(expected);
	const found = netOf(actual);
	for (const [terminal, net] of wanted) {
		const other = found.get(terminal);
		if (other === undefined) return `${terminal} should be connected to ${net}, but is not connected at all.`;
		if (other !== net) return `${terminal} should be on the net {${net}}, but is on {${other}}.`;
	}
	for (const [terminal, net] of found) {
		if (!wanted.has(terminal)) return `${terminal} is connected to {${net}}, but should not be connected.`;
	}
	return undefined;
}

function compare(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

import { resolveCoordinates } from './coordinates.js';
import { Diagnostics, internal, limit, unsupported } from './diagnostics.js';
import { presentationKey, partOf } from './components.js';
import { checkPlacement } from './geometry.js';
import { emit } from './emitter.js';
import { buildCircuit } from './graph.js';
import { verify } from './verify.js';
import { scan } from './lexer.js';
import { optionsOf } from './options.js';
import { parse } from './parser.js';
import type { Key } from './ast.js';
import type { Segment } from './circuit.js';
import type { CircuitikzConversion, ConvertCircuitikzOptions } from './types.js';

/* CircuiTikZ's `voltage dir` choices: `RP` and `EF` set its internal fixbatteries flag, `old` and `noold` clear it. */
const VOLTAGE_DIRS = new Map([['RP', true], ['EF', true], ['old', false], ['noold', false]]);

/** The fixbatteries flag a `voltage dir=…` key sets, or undefined for any other key. */
function voltageDir(key: Key): boolean | undefined {
	return key.name === 'voltage dir' && key.value?.length === 1 ? VOLTAGE_DIRS.get(key.value[0]!.value) : undefined;
}

function keysOf(keys: readonly Key[], diagnostics: Diagnostics, environment: boolean): void {
	for (const key of keys) {
		if (environment && voltageDir(key) !== undefined) continue;
		if (!presentationKey(key, diagnostics)) unsupported(diagnostics, `Option ${key.name}`, key.span);
	}
}

/** Convert the documented subset, returning no partial source on failure.
 * Host argument errors throw TypeError; malformed TeX and verification failures are diagnostics. */
export function convertCircuitikz(source: string, options?: ConvertCircuitikzOptions): CircuitikzConversion {
	if (typeof source !== 'string') throw new TypeError('source must be a string containing one circuitikz environment.');
	const settings = optionsOf(options);
	const diagnostics = new Diagnostics(settings.strict);
	const origin = { start: 0, end: 0, line: 1, column: 1, endColumn: 1 };
	let beginning = origin;
	try {
		if (source.length > settings.maxSourceLength) limit(diagnostics, 'source length', settings.maxSourceLength, origin);
		else {
			const tokens = scan(source, diagnostics);
			if (diagnostics.items.length === 0) {
				const tree = parse(tokens, diagnostics);
				if (tree !== undefined) {
					beginning = tree.span;
					keysOf(tree.keys, diagnostics, true);
					for (const statement of tree.statements) if (statement.kind === 'draw') keysOf(statement.keys, diagnostics, false);
					const resolved = resolveCoordinates(tree, diagnostics);
					const segments: Segment[] = [];
					/* As in CircuiTikZ, the last `voltage dir` wins. */
					const fixed = tree.keys.map(voltageDir).filter((flag) => flag !== undefined).at(-1) ?? false;
					for (const segment of resolved) {
						const spec = segment.operation === 'to' ? partOf(segment.keys, source, fixed, segment.span, diagnostics) : undefined;
						if (segment.operation === '|-' || segment.operation === '-|') {
							const corner = segment.operation === '|-' ? { x: segment.from.x, y: segment.to.y } : { x: segment.to.x, y: segment.from.y };
							segments.push({ ...segment, to: corner, toSpan: segment.span, spec });
							segments.push({ ...segment, from: corner, fromSpan: segment.span, spec });
						} else segments.push({ ...segment, spec });
					}
					if (!diagnostics.items.some((d) => d.severity === 'error')) {
						const circuit = buildCircuit(segments, tree.span, diagnostics);
						if (circuit !== undefined) checkPlacement(circuit, diagnostics);
						if (circuit !== undefined && !diagnostics.items.some((d) => d.severity === 'error')) {
							const output = emit(circuit, settings.title);
							const difference = verify(circuit, output);
							if (difference === undefined) return { ok: true, ...output, diagnostics: diagnostics.sorted() };
							internal(diagnostics, difference, beginning);
						}
					}
				}
			}
		}
	} catch (error) { internal(diagnostics, error instanceof Error ? error.message : String(error), beginning); }
	return { ok: false, source: undefined, fence: undefined, sourceMap: [], diagnostics: diagnostics.sorted() };
}

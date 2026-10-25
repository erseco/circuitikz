/**
 * The mutation gate.
 *
 * Coverage says a line ran; it does not say a test would notice the line being
 * wrong. Each mutant below is a precise substitution in `src` plus the suites
 * that must fail once it is applied, and is named for the *property* it
 * breaks. A surviving mutant fails the gate.
 *
 * Two further rules, checked before anything runs:
 *
 * - `from` must occur exactly once in its file, tabs included, so a mutant
 *   breaks when the code around it is reformatted and someone has to re-read
 *   whether the property still holds.
 * - Every module under `src` carries at least one mutant, except the ones
 *   `EXEMPT` lists, which hold no logic. A new module arrives with its mutants.
 *
 * A mutant no input can tell apart from the original is equivalent: remove it
 * and say why in the pull request.
 */
import { cp, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* Type declarations and re-exports have no control flow.
 * Limit enforcement is mutated at every M1 call site. Junctions and margin
 * constants are reserved for M2, not exemptions for future logic; active
 * source-length and scale constants have their own mutants.
 * Equivalent mutant removed: loosening decimal's pre-multiply overflow guard
 * cannot change an observable result: the final scale guard rejects that
 * superset with the same diagnostic. The scale guard has a killed mutant.
 */
const EXEMPT = new Set(['src/index.ts', 'src/types.ts', 'src/ast.ts', 'src/circuit.ts']);

const mutants = [
	{
		name: 'a junction is recognised by its kind',
		file: 'src/topology.ts',
		from: "netlist.nodes.filter((node) => node.kind === 'junction')",
		to: "netlist.nodes.filter((node) => node.kind === 'port')",
		tests: ['tests/topology.test.ts', 'tests/conformance.test.ts']
	},
	{
		name: 'junction terminals are left out of the circuit',
		file: 'src/topology.ts',
		from: 'net.terminals.filter((terminal) => !junctions.has(terminal.componentId))',
		to: 'net.terminals.filter(() => true)',
		tests: ['tests/topology.test.ts', 'tests/conformance.test.ts']
	},
	{
		name: 'a terminal written twice on a net counts once',
		file: 'src/topology.ts',
		from: '.map((net) => [...new Set(net)].sort(compare))',
		to: '.map((net) => [...net].sort(compare))',
		tests: ['tests/topology.test.ts']
	},
	{
		name: 'a net with no terminal is dropped',
		file: 'src/topology.ts',
		from: '.filter((net) => net.length > 0)',
		to: '.filter(() => true)',
		tests: ['tests/topology.test.ts']
	},
	{
		name: 'terminals sort by code unit, not locale',
		file: 'src/topology.ts',
		from: 'return left < right ? -1 : left > right ? 1 : 0;',
		to: 'return left.localeCompare(right);',
		tests: ['tests/topology.test.ts']
	},
	{
		name: 'nets sort by their whole contents',
		file: 'src/topology.ts',
		from: "compare(left.join('\\n'), right.join('\\n'))",
		to: 'compare(left[0]!, right[0]!)',
		tests: ['tests/topology.test.ts']
	},
	{
		name: 'two spellings of one circuit compare equal',
		file: 'src/topology.ts',
		from: 'for (const net of canonical(nets))',
		to: 'for (const net of nets)',
		tests: ['tests/topology.test.ts']
	},
	{
		name: 'a terminal that lost its connection is named as such',
		file: 'src/topology.ts',
		from: 'if (other === undefined) return',
		to: 'if (false) return',
		tests: ['tests/topology.test.ts']
	},
	{
		name: 'a terminal on the wrong net is a difference',
		file: 'src/topology.ts',
		from: 'if (other !== net) return',
		to: 'if (false) return',
		tests: ['tests/topology.test.ts', 'tests/conformance.test.ts']
	},
	{
		name: 'a connection the TeX never made is a difference',
		file: 'src/topology.ts',
		from: 'if (!wanted.has(terminal)) return',
		to: 'if (false) return',
		tests: ['tests/topology.test.ts']
	},
	{
		name: 'comments end at CR as well as LF',
		file: 'src/lexer.ts',
		from: 'while (cursor < source.length && source[cursor] !== \'\\r\' && source[cursor] !== \'\\n\')',
		to: 'while (cursor < source.length && source[cursor] !== \'\\n\')',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'columns count UTF-16 units',
		file: 'src/lexer.ts',
		from: 'column += cursor - start;',
		to: 'column += [...source.slice(start, cursor)].length;',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'CRLF is one newline',
		file: 'src/lexer.ts',
		from: 'c === \'\\r\' && source[cursor + 1] === \'\\n\' ? 2 : 1',
		to: '1',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'escaped percent does not begin a comment',
		file: 'src/lexer.ts',
		from: 'kind = \'command\';',
		to: 'if (source[cursor] === \'%\') { cursor = source.length; } kind = \'command\';',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'brace budget is checked before further scanning',
		file: 'src/lexer.ts',
		from: 'depth === LIMITS.braceDepth',
		to: 'depth > LIMITS.braceDepth',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'multiline spans stay on the first line',
		file: 'src/lexer.ts',
		from: 'first.line === last.line ? last.endColumn : first.endColumn',
		to: 'last.endColumn',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'the source limit is inclusive',
		file: 'src/convert.ts',
		from: 'source.length > settings.maxSourceLength',
		to: 'source.length >= settings.maxSourceLength',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'strict escalates presentation warnings',
		file: 'src/diagnostics.ts',
		from: 'warning && !this.strict ? \'warning\' : \'error\'',
		to: 'warning ? \'warning\' : \'error\'',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'diagnostics sort by line then column',
		file: 'src/diagnostics.ts',
		from: 'a.line - b.line || a.column - b.column',
		to: 'b.line - a.line || a.column - b.column',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'coordinate precision is never rounded',
		file: 'src/coordinates.ts',
		from: 'places === 2',
		to: 'places === 3',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'coordinate digits are accumulated in base ten',
		file: 'src/coordinates.ts',
		from: 'value = value * 10 + digit;',
		to: 'value = value * 9 + digit;',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'negative zero is normalized',
		file: 'src/coordinates.ts',
		from: 'negative && magnitude !== 0',
		to: 'negative',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'fractional coordinate overflow is rejected',
		file: 'src/coordinates.ts',
		from: 'value > Math.floor((Number.MAX_SAFE_INTEGER - fraction * (places === 1 ? 10 : 1)) / SCALE)',
		to: 'false',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'relative sums reject overflow',
		file: 'src/coordinates.ts',
		from: '!Number.isSafeInteger(x) || !Number.isSafeInteger(y)',
		to: 'false',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'plus leaves the relative reference unchanged',
		file: 'src/coordinates.ts',
		from: 'element.at.kind !== \'point\' || element.at.mode !== \'+\'',
		to: 'true',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'relative increments use their reference',
		file: 'src/coordinates.ts',
		from: 'at.x + base.x',
		to: 'at.x',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'duplicate names are diagnosed',
		file: 'src/coordinates.ts',
		from: 'if (names.has(name)) reference',
		to: 'if (false) reference',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'cycles use the first path point',
		file: 'src/coordinates.ts',
		from: 'if (at.kind === \'cycle\') return first;',
		to: 'if (at.kind === \'cycle\') return base;',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'cycle closes the current subpath',
		file: 'src/coordinates.ts',
		from: 'if (element.kind === \'move\') { first = point;',
		to: 'if (element === statement.elements[0]) { first = point;',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'cycle after to[...] is rejected',
		file: 'src/coordinates.ts',
		from: "else if (element.operation === 'to') afterTo = true;",
		to: "else if (element.operation === 'to') afterTo = false;",
		tests: ['tests/frontend.test.ts', 'tests/rejections.test.ts']
	},
	{
		name: 'recovery stops at the next statement command',
		file: 'src/parser.ts',
		from: 'if (this.synced) { this.synced = false; return; }',
		to: 'this.synced = false;',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'empty option entries are ignored',
		file: 'src/parser.ts',
		from: 'if (parts.length === 0) { this.take(); if (token.value === \']\') return keys; continue; }',
		to: 'if (parts.length === 0) { syntax(this.diagnostics, \'a non-empty option\', token); return undefined; }',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'unknown host options throw',
		file: 'src/options.ts',
		from: 'Reflect.ownKeys(options)',
		to: 'Object.keys(options)',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'strict option types are checked',
		file: 'src/options.ts',
		from: 'typeof value !== \'boolean\'',
		to: 'false',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'title budget is inclusive',
		file: 'src/options.ts',
		from: 'value.length > 120',
		to: 'value.length >= 120',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'recovery ignores semicolons in braces',
		file: 'src/parser.ts',
		from: 'else if (token.value === \';\' && depth === 0) return;',
		to: 'else if (token.value === \';\') return;',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'recovery stops at the environment end',
		file: 'src/parser.ts',
		from: 'private boundary(): boolean { return this.token.kind === \'eof\' || this.delimiter(\'\\\\end\'); }',
		to: 'private boundary(): boolean { return this.token.kind === \'eof\'; }',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'statement budget is inclusive',
		file: 'src/parser.ts',
		from: 'count === LIMITS.statements',
		to: 'count > LIMITS.statements',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'path budget is inclusive',
		file: 'src/parser.ts',
		from: 'elements.length === LIMITS.pathElements',
		to: 'elements.length > LIMITS.pathElements',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'component budget is inclusive',
		file: 'src/parser.ts',
		from: 'this.components === LIMITS.components',
		to: 'this.components > LIMITS.components',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'short is a wire rather than a component',
		file: 'src/parser.ts',
		from: 'if (!parsed.some((key) => key.name === \'short\'))',
		to: 'if (true)',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'component option order and word boundaries survive',
		file: 'src/lexer.ts',
		from: 'if (end >= 0 && token.start > end) parts.push(\' \');',
		to: '',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'independent errors are retained',
		file: 'src/parser.ts',
		from: 'if (statement === undefined) this.recover();',
		to: 'if (statement === undefined) { this.recover(); return undefined; }',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'M1 never returns unsupported input as a success',
		file: 'src/convert.ts',
		from: 'ok: false, source: undefined',
		to: 'ok: true, source: undefined',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'undefined names keep their precise diagnostic',
		file: 'src/coordinates.ts',
		from: 'if (point === undefined) reference',
		to: 'if (false) reference',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'missing semicolons are not accepted at environment end',
		file: 'src/parser.ts',
		from: 'if (this.accept(\';\')) return true;',
		to: 'if (this.accept(\';\') || this.boundary()) return true;',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'the default source ceiling is stable',
		file: 'src/limits.ts',
		from: 'sourceLength: 100_000',
		to: 'sourceLength: 100_001',
		tests: ['tests/frontend.test.ts']
	},
	{
		name: 'one TikZ unit is exactly one hundred integer units',
		file: 'src/limits.ts',
		from: 'export const SCALE = 100;',
		to: 'export const SCALE = 99;',
		tests: ['tests/frontend.test.ts']
	},
	{"name": "isolated terminals belong to singleton nets", "file": "src/topology.ts", "from": "if (!present.has(terminal)) nets.push([terminal]);", "to": "if (false) nets.push([terminal]);", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "resistor kind is independently preserved", "file": "src/components.ts", "from": "kind: 'resistor', prefix: 'R'", "to": "kind: 'capacitor', prefix: 'R'", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "every passive alias is recognized", "file": "src/components.ts", "from": "'american resistor', 'european resistor'", "to": "'european resistor'", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "battery polarity changes with fixbatteries", "file": "src/components.ts", "from": "invert !== (definition.kind === 'source' && fixBatteries)", "to": "invert", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "duplicate labels are not silently selected", "file": "src/components.ts", "from": "if (labelled) syntax", "to": "if (false) syntax", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "invert is idempotent rather than a toggle", "file": "src/components.ts", "from": "invert = true;", "to": "invert = !invert;", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "math label commands are allowlisted", "file": "src/labels.ts", "from": "COMMANDS.has(token.value.slice(1))", "to": "true", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "labels are never given synthetic units", "file": "src/labels.ts", "from": "return output.join('');", "to": "return output.join('') + ' \u03a9';", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "junctions require three real edge ends", "file": "src/graph.ts", "from": "if (v.degree < 3) continue;", "to": "if (v.degree < 2) continue;", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "junction resource ceiling is inclusive", "file": "src/graph.ts", "from": "junctions.length === LIMITS.junctions", "to": "junctions.length > LIMITS.junctions", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "component IDs start at one in source order", "file": "src/graph.ts", "from": "(counts.get(spec.prefix) ?? 0) + 1", "to": "(counts.get(spec.prefix) ?? 0) + 2", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "wire cycles do not add connections", "file": "src/graph.ts", "from": "if (nets.join(from, to)) links.push", "to": "if ((nets.join(from, to), true)) links.push", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "coincident vertices share connectivity", "file": "src/graph.ts", "from": "let id = ids.get(key);", "to": "let id: number | undefined;", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "positive-length overlaps are rejected", "file": "src/graph.ts", "from": "if (item.low < high) { overlap", "to": "if (false) { overlap", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts", "tests/rejections.test.ts"]},
	{"name": "empty wire steps do not create junctions", "file": "src/graph.ts", "from": "if (from === to && (segment.spec === undefined || segment.spec.kind === 'wire')) continue;", "to": "if (false) continue;", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "connections retain pen direction", "file": "src/graph.ts", "from": "forward = earliest.forward;", "to": "forward = !earliest.forward;", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "connections retain source order", "file": "src/graph.ts", "from": "a.order - b.order", "to": "b.order - a.order", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "isolated graph terminals are not omitted", "file": "src/graph.ts", "from": "terminals.push(terminal);", "to": "if (false) terminals.push(terminal);", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "an endpoint inside another segment is a geometry error", "file": "src/graph.ts", "from": "item.low < at && at < item.high", "to": "item.low < at && at < item.low", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts", "tests/rejections.test.ts"]},
	{"name": "dead-end wires are rejected only at single edge ends", "file": "src/graph.ts", "from": "vertices[at]!.degree === 1 &&", "to": "vertices[at]!.degree >= 1 &&", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts", "tests/rejections.test.ts"]},
	{"name": "dead-end wires are rejected", "file": "src/graph.ts", "from": "unsupported(diagnostics, 'A wire with an unconnected end', wire.edge.span);", "to": ";", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts", "tests/rejections.test.ts"]},
	{"name": "overlaps suppress duplicate interior diagnostics", "file": "src/graph.ts", "from": "if (!overlapping) for", "to": "for", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts", "tests/rejections.test.ts"]},
	{"name": "emission flips the y axis exactly", "file": "src/emitter.ts", "from": "(circuit.bounds.maxY - a.y) + (circuit.bounds.maxY - b.y)", "to": "(a.y - circuit.bounds.maxY) + (b.y - circuit.bounds.maxY)", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "source maps track nonblank declaration lines", "file": "src/emitter.ts", "from": "schemdLine: lines.length", "to": "schemdLine: lines.length + 1", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "midpoints round down after normalization", "file": "src/emitter.ts", "from": "Math.floor(((a.x - circuit.bounds.minX) + (b.x - circuit.bounds.minX)) / 2)", "to": "Math.ceil(((a.x - circuit.bounds.minX) + (b.x - circuit.bounds.minX)) / 2)", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "compiled kinds are independently checked", "file": "src/verify.ts", "from": "actual.kind !== part.spec.kind || ", "to": " ", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "compiled labels are independently checked", "file": "src/verify.ts", "from": " || actual.label !== (part.spec.label ?? part.id)", "to": "", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "compiled orientations are independently checked", "file": "src/verify.ts", "from": "(actual.orientation ?? 'right') !== orientation", "to": "false", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "compiled variants are independently checked", "file": "src/verify.ts", "from": "if (part.spec.variant !== '' &&", "to": "if (false &&", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "topology comparison cannot be bypassed", "file": "src/verify.ts", "from": "return connectivityDifference(circuit.expected, connectivityOf(buildNetlist(compiled)));", "to": "return undefined;", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]},
	{"name": "body overlap is preflighted before verification", "file": "src/geometry.ts", "from": "r.minX < p.maxX && p.minX < r.maxX && r.minY < p.maxY && p.minY < r.maxY", "to": "false", "tests": ["tests/conversion.test.ts", "tests/conformance.test.ts", "tests/verification.test.ts", "tests/topology.test.ts", "tests/graph.test.ts"]}
];

async function sourceFiles(directory) {
	const entries = await readdir(join(root, directory), { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => (entry.isDirectory() ? sourceFiles(join(directory, entry.name)) : [join(directory, entry.name)]))
	);
	return files.flat().filter((file) => file.endsWith('.ts'));
}

const mutated = new Set(mutants.map((mutant) => mutant.file));
const unguarded = (await sourceFiles('src')).map((file) => relative(root, join(root, file))).filter((file) => !EXEMPT.has(file) && !mutated.has(file));
if (unguarded.length > 0) throw new Error(`Modules with no mutant: ${unguarded.join(', ')}. Add one, or list a logic-free module in EXEMPT.`);
const names = new Set(mutants.map((mutant) => mutant.name));
if (names.size !== mutants.length) throw new Error('Two mutants share a name; each names one property.');

const sandbox = await mkdtemp(join(tmpdir(), 'schemd-circuitikz-mutation-'));
try {
	for (const path of ['src', 'tests']) await cp(join(root, path), join(sandbox, path), { recursive: true });
	for (const path of ['package.json', 'tsconfig.json', 'vitest.config.ts']) await cp(join(root, path), join(sandbox, path));
	await symlink(join(root, 'node_modules'), join(sandbox, 'node_modules'), 'dir');
	const vitest = join(root, 'node_modules', 'vitest', 'vitest.mjs');
	const survivors = [];
	const reportPath = join(sandbox, 'mutation-report.json');
	const run = async (tests) => {
		await rm(reportPath, { force: true });
		const result = spawnSync(process.execPath, [vitest, 'run', ...tests, '--reporter=json', `--outputFile=${reportPath}`], {
			cwd: sandbox,
			env: { ...process.env, FORCE_COLOR: '0' },
			encoding: 'utf8',
			timeout: 45_000
		});
		if (result.error !== undefined) throw result.error;
		const report = JSON.parse(await readFile(reportPath, 'utf8'));
		if (report.numTotalTests === 0 || result.status !== 0 && report.numFailedTests === 0) {
			throw new Error(`Mutation run failed without an assertion failure: ${result.stdout}${result.stderr}`);
		}
		return { result, report };
	};
	const baseline = await run([...new Set(mutants.flatMap((mutant) => mutant.tests))]);
	if (baseline.result.status !== 0 || !baseline.report.success) throw new Error('Mutation baseline is not green; fix the tests first.');
	console.log(`BASELINE  ${baseline.report.numPassedTests} assertions-bearing tests pass before mutation`);

	for (const mutant of mutants) {
		const path = join(sandbox, mutant.file);
		const original = await readFile(join(root, mutant.file), 'utf8');
		const first = original.indexOf(mutant.from);
		if (first < 0 || original.indexOf(mutant.from, first + mutant.from.length) >= 0) {
			throw new Error(`Mutation target must occur exactly once: ${mutant.name}`);
		}
		await writeFile(path, original.replace(mutant.from, mutant.to));
		let result;
		try { ({ result } = await run(mutant.tests)); }
		finally { await writeFile(path, original); }
		if (result.status === 0) {
			survivors.push({ mutant, output: `${result.stdout}${result.stderr}` });
			console.error(`SURVIVED  ${mutant.name}`);
		} else {
			console.log(`KILLED    ${mutant.name}`);
		}
	}

	if (survivors.length > 0) {
		for (const { mutant, output } of survivors) console.error(`\n--- ${mutant.name} ---\n${output.trim()}`);
		process.exitCode = 1;
	} else {
		console.log(`\nMutation score: 100% (${mutants.length}/${mutants.length} killed)`);
	}
} finally {
	await rm(sandbox, { recursive: true, force: true });
}

import { beforeEach, expect, it, vi } from 'vitest';
const hook = vi.hoisted(() => ({ mode: '' }));
vi.mock('@schemd/core', async (original) => {
	const core = await original<typeof import('@schemd/core')>();
	return { ...core,
		diagnoseSchematic: (...args: Parameters<typeof core.diagnoseSchematic>) => hook.mode === 'diagnostic' ? core.diagnoseSchematic('broken', args[1]) : core.diagnoseSchematic(...args),
		compileSchematic: (...args: Parameters<typeof core.compileSchematic>) => {
			if (hook.mode === 'throw-error') throw new Error('controlled core failure');
			if (hook.mode === 'throw-string') throw 'controlled string failure';
			const original = core.compileSchematic(...args);
			const result = { ...original, document: { ...original.document, components: original.document.components.map((c) => ({ ...c })) } };
			const part = result.document.components[0]!;
			if (hook.mode === 'identity') part.id = 'changed';
			if (hook.mode === 'kind') part.kind = 'capacitor';
			if (hook.mode === 'color') part.color = { kind: 'token', value: 'blue' };
			const junction = result.document.components.find((c) => c.kind === 'junction');
			if (junction !== undefined) {
				if (hook.mode === 'j-identity') junction.id = 'changed';
				if (hook.mode === 'j-kind') junction.kind = 'resistor';
				if (hook.mode === 'j-label') junction.label = 'changed';
				if (hook.mode === 'j-x') junction.x += 1;
				if (hook.mode === 'j-y') junction.y += 1;
				if (hook.mode === 'j-color') junction.color = { kind: 'token', value: 'blue' };
			}
			if (hook.mode === 'label') part.label = 'changed';
			if (hook.mode === 'x') part.x += 1;
			if (hook.mode === 'y') part.y += 1;
			if (hook.mode === 'orientation' && 'orientation' in part) part.orientation = 'left';
			if (hook.mode === 'orientation-missing' && 'orientation' in part) delete part.orientation;
			if (hook.mode === 'orientation-undefined' && part.kind === 'resistor') Object.defineProperty(part, 'orientation', { value: undefined });
			if (hook.mode === 'diode-style' && 'diodeType' in part) part.diodeType = 'photodiode';
			if (hook.mode === 'ground-style' && 'groundStyle' in part) part.groundStyle = 'signal';
			if (hook.mode === 'variant' && 'variant' in part) part.variant = 'voltage-dc';
			if (hook.mode === 'variant-missing' && 'variant' in part) delete part.variant;
			if (hook.mode === 'inventory') return { ...result, document: { ...result.document, components: [] } };
			return result;
		},
		buildNetlist: (...args: Parameters<typeof core.buildNetlist>) => {
			const result = core.buildNetlist(...args);
			return hook.mode === 'net' ? { ...result, nets: [] } : result;
		}
	};
});
import { convertCircuitikz } from '../src/index.js';
const input = (body: string) => `\\begin{circuitikz}\n\\draw ${body};\n\\end{circuitikz}`;
beforeEach(() => { hook.mode = ''; });

it.each(['diagnostic', 'throw-error', 'throw-string', 'identity', 'kind', 'label', 'color', 'x', 'y', 'orientation', 'orientation-missing', 'inventory', 'net'])('rejects %s corruption with no partial output', (mode) => {
	hook.mode = mode;
	const result = convertCircuitikz(input('(0,0) to[R] (0,2) to[C] (2,2)'));
	expect(result.ok).toBe(false);
	expect(result.source).toBeUndefined();
	expect(result.fence).toBeUndefined();
	expect(result.sourceMap).toEqual([]);
	expect(result.diagnostics).toHaveLength(1);
	expect(result.diagnostics[0]).toMatchObject({ code: 'internal', severity: 'error', line: 1, column: 1, endColumn: 7 });
	expect(result.diagnostics[0]?.message).toMatch(/^Conversion verification failed: .+; please report this with the input\.$/);
		if (['identity', 'kind', 'label'].includes(mode)) expect(result.diagnostics[0]?.message).toContain('changed identity, kind or label');
		if (['x', 'y', 'orientation', 'orientation-missing'].includes(mode)) expect(result.diagnostics[0]?.message).toContain('changed placement or orientation');
		if (mode === 'inventory') expect(result.diagnostics[0]?.message).toContain('The component inventory changed');
		if (mode === 'net') expect(result.diagnostics[0]?.message).toContain('should be on the net');
});

it.each(['variant', 'variant-missing'])('independently rejects battery %s corruption', (mode) => {
	hook.mode = mode;
	expect(convertCircuitikz(input('(0,0) to[battery1] (2,0)')).diagnostics[0]?.message).toBe('Conversion verification failed: Component B1 changed variant; please report this with the input.');
});

it('accepts the explicit undefined canonical orientation from core', () => {
	hook.mode = 'orientation-undefined';
	expect(convertCircuitikz(input('(0,0) to[R] (2,0)')).ok).toBe(true);
});

it.each(['j-identity', 'j-kind', 'j-label', 'j-color', 'j-x', 'j-y'])('independently checks junction %s', (mode) => {
	hook.mode = mode;
	const result = convertCircuitikz('\\begin{circuitikz}\n\\draw (0,0) to[R] (2,0);\\draw (2,0) to[C] (4,0);\\draw (2,0) to[L] (2,2);\n\\end{circuitikz}');
	expect(result.diagnostics[0]?.message).toBe('Conversion verification failed: Junction J1 changed identity, kind, label, color or position; please report this with the input.');
});

it.each([['diode-style', '(0,0) to[D] (2,0)', 'D1'], ['ground-style', '(0,0) node[ground]{}', 'G1']])('independently rejects %s corruption', (mode, body, id) => {
	hook.mode = mode;
	expect(convertCircuitikz(input(body)).diagnostics[0]?.message).toBe(`Conversion verification failed: Component ${id} changed variant; please report this with the input.`);
});

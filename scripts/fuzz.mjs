/** Seeded, isolated fuzz contract (R-8.3). No dependency beyond the toolchain. */
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { buildNetlist, compileSchematic, diagnoseSchematic } from '@schemd/core';
import { convertCircuitikz } from '../dist/index.js';
import { LIMITS } from '../dist/limits.js';

function check(input, options) {
	const result = convertCircuitikz(input, options);
	assert.deepEqual(result, convertCircuitikz(input, options), 'conversion is not deterministic');
	assert.equal(typeof result.ok, 'boolean');
	assert.ok(Array.isArray(result.diagnostics));
	assert.ok(Array.isArray(result.sourceMap));
	assert.equal(result.ok, !result.diagnostics.some((d) => d.severity === 'error'));
	const lines = input.split(/\r\n|\r|\n/);
	let previous = [0, 0];
	for (const diagnostic of result.diagnostics) {
		assert.deepEqual(Object.keys(diagnostic).sort(), ['code', 'column', 'endColumn', 'line', 'message', 'severity']);
		assert.ok(['syntax', 'unsupported', 'geometry', 'reference', 'limit', 'internal'].includes(diagnostic.code));
		assert.notEqual(diagnostic.code, 'internal', 'An internal diagnostic is always a converter bug.');
		assert.ok(['error', 'warning'].includes(diagnostic.severity));
		assert.equal(typeof diagnostic.message, 'string');
		assert.ok(diagnostic.message.length > 0);
		const { line, column, endColumn } = diagnostic;
		assert.ok([line, column, endColumn].every(Number.isInteger));
		assert.ok(line >= 1 && line <= lines.length);
		assert.ok(column >= 1 && endColumn >= column && endColumn <= lines[line - 1].length + 1);
		assert.ok(line > previous[0] || line === previous[0] && column >= previous[1]);
		previous = [line, column];
	}
	if (!result.ok) {
		assert.equal(result.source, undefined);
		assert.equal(result.fence, undefined);
		assert.deepEqual(result.sourceMap, []);
	} else {
		assert.equal(typeof result.source, 'string');
		assert.deepEqual(diagnoseSchematic(result.source, result.fence), []);
		assert.ok(buildNetlist(compileSchematic(result.source, result.fence).document).nodes.length >= 0);
		assert.equal(result.sourceMap.length, result.source.split('\n').filter((line) => line.trim() !== '').length);
	}
}

function random(seed) {
	let state = seed;
	return (maximum) => {
		state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
		return (state >>> 0) % maximum;
	};
}

async function* generated(seed, cases) {
	const next = random(seed);
	const corpus = [];
	const root = new URL('../tests/fixtures/conformance/', import.meta.url);
	for (const name of (await readdir(root)).sort()) corpus.push(await readFile(new URL(`${name}/input.tex`, root), 'utf8'));
	const chars = [...'\\{}[]()%,;=+-|$^0123456789abcXYZ \r\n\t', '😀', 'α', '\u0000'];
	const tokens = ['\\begin{circuitikz}', '\\end{circuitikz}', '\\draw', '\\coordinate', '\\node', '(', ')', '[', ']', '{', '}', ';', ',', 'to', '++', '+', '--', '|-', '-|', 'cycle', 'R', '0', '1.00', '(A)', '%comment\r\n'];
	const wrap = (text) => `\\begin{circuitikz}\n${text}\n\\end{circuitikz}`;
	const boundaries = [
		...[-1, 0, 1].map((delta) => ({ input: '%'.repeat(LIMITS.sourceLength + delta) })),
		{ input: '%'.repeat(1_000_000), options: { maxSourceLength: 1_000_000 } },
		...[0, 1].flatMap((delta) => [
			{ input: '{'.repeat(LIMITS.braceDepth + delta) },
			{ input: wrap('\\draw (0,0);'.repeat(LIMITS.statements + delta)) },
			{ input: wrap('\\draw (0,0)' + ' -- (1,0)'.repeat(LIMITS.pathElements - 1 + delta) + ';') },
			{ input: wrap('\\draw (0,0)' + ' to[R] (1,0)'.repeat(LIMITS.components + delta) + ';') }
		])
	];
	for (let index = 0; index < cases; index += 1) {
		if (index < boundaries.length) { yield { ...boundaries[index], index }; continue; }
		let input = '';
		const mode = index % 5;
		if (mode === 0) for (let size = next(400); size > 0; size -= 1) input += chars[next(chars.length)];
		else if (mode === 1) for (let size = next(100); size > 0; size -= 1) input += tokens[next(tokens.length)] + ' ';
		else if (mode === 2) {
			input = corpus[next(corpus.length)];
			const start = next(input.length);
			input = input.slice(0, start) + tokens[next(tokens.length)] + input.slice(start + next(12));
		} else if (mode === 3) {
			const n = next(1000) - 500;
			input = `\\begin{circuitikz}\n\\coordinate (A) at (${n}.01,${n}cm);\n\\draw (A) -- ++(2,0) to[R=$R_{${next(10)}}$] ++(0,2) -| (A) -- cycle;\n\\end{circuitikz}`;
		} else {
			const large = next(3000);
			input = ['%'.repeat(large), '{'.repeat(large), `\\begin{circuitikz}\\draw (0,0) to[R=${'a'.repeat(large)}`, `\\begin{circuitikz}\\draw (${next(100)}.${'1'.repeat(next(20))},0);`][next(4)];
		}
		const options = [undefined, { strict: true }, { title: 'Fuzz circuit' }, { maxSourceLength: 1 + next(1_000_000) }][next(4)];
		yield { input, index, options };
	}
}

if (!isMainThread) {
	if (workerData.mode === 'single') {
		try { check(workerData.input, workerData.options); parentPort.postMessage({ failed: false }); }
		catch (error) { parentPort.postMessage({ failed: true, error: String(error) }); }
	} else {
		for await (const { input, index, options } of generated(workerData.seed, workerData.cases)) {
			parentPort.postMessage({ active: index, input, options });
			try { check(input, options); }
			catch (error) { parentPort.postMessage({ failed: true, input, index, options, error: String(error) }); break; }
		}
	}
} else {
	function argument(name, fallback, maximum) {
		const raw = process.argv.find((v) => v.startsWith(`--${name}=`))?.slice(name.length + 3);
		const value = raw === undefined ? fallback : Number(raw);
		if (!Number.isInteger(value) || value < 1 || value > maximum) throw new TypeError(`--${name} must be an integer from 1 through ${maximum}`);
		return value;
	}
	const seed = argument('seed', 0x5c4e4d, 0xffffffff);
	const cases = argument('cases', 20_000, 1_000_000);
	console.log(`Fuzz seed: ${seed}; cases: ${cases}`);

	function isolated(data) {
		return new Promise((resolve) => {
			const worker = new Worker(new URL(import.meta.url), { workerData: data });
			let active = { input: data.input, options: data.options, index: 0 };
			let done = false;
			let timer;
			const finish = (result) => {
				if (done) return;
				done = true;
				clearTimeout(timer);
				void worker.terminate();
				resolve(result);
			};
			const arm = () => {
				clearTimeout(timer);
				timer = setTimeout(() => finish({ failed: true, ...active, error: 'Worker exceeded the per-input 2000 ms deadline.' }), 2000);
			};
			arm();
			worker.on('message', (message) => {
				if (message.active !== undefined) { active = { input: message.input, options: message.options, index: message.active }; arm(); }
				else finish(message);
			});
			worker.on('error', (error) => finish({ failed: true, ...active, error: String(error) }));
			worker.on('exit', (code) => finish(code === 0 ? { failed: false } : { failed: true, ...active, error: `Worker exited ${code}` }));
		});
	}

	const failure = await isolated({ mode: 'run', seed, cases });
	if (failure.failed) {
		let minimal = failure.input ?? '';
		/* Delta debugging, followed by single-character deletion: 1-minimal for
		   the reproducible contract failure, always checked in a timed worker. */
		for (let chunk = Math.max(1, Math.floor(minimal.length / 2)); chunk >= 1; chunk = Math.floor(chunk / 2)) {
			let reduced;
			do {
				reduced = false;
				for (let start = 0; start < minimal.length;) {
					const candidate = minimal.slice(0, start) + minimal.slice(start + chunk);
					if ((await isolated({ mode: 'single', input: candidate, options: failure.options })).failed) { minimal = candidate; reduced = true; }
					else start += chunk;
				}
			} while (chunk === 1 && reduced);
		}
		const path = `fuzz-failure-${seed}.json`;
		await writeFile(path, JSON.stringify({ seed, index: failure.index, error: failure.error, options: failure.options, original: failure.input, input: minimal }, null, 2) + '\n');
		throw new Error(`Fuzz contract failed: ${failure.error}; minimized input saved to ${path}`);
	}
	console.log(`PASS: ${cases} reproducible fuzz cases (${cases * 2} conversions).`);
}

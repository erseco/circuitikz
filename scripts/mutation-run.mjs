import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Run `tests` under vitest in `cwd` and say what the run proves.
 *
 * `passed` when every test passed, `killed` when at least one assertion failed.
 * Anything else proves nothing about the mutant and throws: no tests, a file
 * that failed to load, or tests that failed only by timing out or throwing
 * something other than an `AssertionError`.
 *
 * @param {string} cwd
 * @param {readonly string[]} tests
 * @returns {Promise<{ verdict: 'passed' | 'killed', output: string }>}
 */
export async function runSuites(cwd, tests) {
	const reportPath = join(cwd, 'mutation-report.json');
	await rm(reportPath, { force: true });
	const result = spawnSync(process.execPath, [join(cwd, 'node_modules', 'vitest', 'vitest.mjs'), 'run', ...tests, '--reporter=json', `--outputFile=${reportPath}`], {
		cwd,
		env: { ...process.env, FORCE_COLOR: '0' },
		encoding: 'utf8',
		timeout: 45_000
	});
	if (result.error !== undefined) throw result.error;
	const output = `${result.stdout}${result.stderr}`;
	const report = JSON.parse(await readFile(reportPath, 'utf8'));
	const loadFailures = report.testResults.filter((file) => file.message !== '');
	const failures = report.testResults.flatMap((file) => file.assertionResults.filter((test) => test.status === 'failed'));
	const asserted = failures.some((test) => test.failureMessages.some((message) => message.startsWith('AssertionError')));
	if (report.numTotalTests === 0 || loadFailures.length > 0 || (result.status !== 0 && !asserted)) {
		const causes = [...loadFailures.map((file) => file.message), ...failures.flatMap((test) => test.failureMessages)];
		throw new Error(`Run failed without an assertion failure:\n${causes.map((cause) => cause.split('\n')[0]).join('\n') || output}`);
	}
	return { verdict: asserted ? 'killed' : 'passed', output };
}

/* One-test files whose verdict is known; `calibrate` checks `runSuites` against them. */
const CALIBRATION = [
	['passes.test.mjs', "test('holds', () => { expect(1).toBe(1); });", 'passed'],
	['asserts.test.mjs', "test('notices', () => { expect(1).toBe(2); });", 'killed'],
	['times-out.test.mjs', "test('never settles', () => new Promise(() => {}), 30);", /Error: Test timed out in 30ms/],
	['throws.test.mjs', "test('crashes', () => { throw new TypeError('not an assertion'); });", /TypeError: not an assertion/],
	['cannot-load.test.mjs', "import './broken.mjs';\ntest('unreached', () => {});", /Parse fail/]
];

/**
 * Prove the verdicts before trusting them: in a scratch directory, a green file
 * passes, a failing assertion kills, and a timeout, a thrown error or a file
 * that cannot load each stop the run.
 *
 * @param {string} nodeModules
 */
export async function calibrate(nodeModules) {
	const directory = await mkdtemp(join(tmpdir(), 'schemd-circuitikz-mutation-calibration-'));
	try {
		await symlink(nodeModules, join(directory, 'node_modules'), 'dir');
		await writeFile(join(directory, 'package.json'), '{ "type": "module" }');
		await writeFile(join(directory, 'broken.mjs'), 'export const = ;');
		for (const [name, body] of CALIBRATION) await writeFile(join(directory, name), `import { expect, test } from 'vitest';\n${body}\n`);
		for (const [name, , expected] of CALIBRATION) {
			let outcome;
			try {
				outcome = (await runSuites(directory, [name])).verdict;
			} catch (error) {
				outcome = error.message;
			}
			const right = typeof expected === 'string' ? outcome === expected : outcome.startsWith('Run failed without an assertion failure') && expected.test(outcome);
			if (!right) throw new Error(`Mutation verdicts are miscalibrated: ${name} gave ${outcome.split('\n').join(' | ')}`);
		}
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

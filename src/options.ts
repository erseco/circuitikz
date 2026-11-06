import type { ConvertCircuitikzOptions } from './types.js';
import { LIMITS } from './limits.js';

export interface Options {
	readonly title: string;
	readonly strict: boolean;
	readonly maxSourceLength: number;
}

/** Read each host option once so accessors cannot change budgets mid-conversion. */
export function optionsOf(options: ConvertCircuitikzOptions | undefined): Options {
	const result = { title: 'Converted CircuiTikZ circuit', strict: false, maxSourceLength: LIMITS.sourceLength as number };
	if (options === undefined) return result;
	if (options === null || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object containing title, strict, or maxSourceLength.');
	for (const key of Reflect.ownKeys(options)) {
		if (key === 'title') {
			const value = options.title;
			if (typeof value !== 'string' || value.trim().length === 0 || value.length > 120) throw new TypeError('title must be a non-empty string of at most 120 UTF-16 code units.');
			result.title = value;
		} else if (key === 'strict') {
			const value = options.strict;
			if (typeof value !== 'boolean') throw new TypeError('strict must be true or false.');
			result.strict = value;
		} else if (key === 'maxSourceLength') {
			const value = options.maxSourceLength;
			if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 1_000_000) throw new TypeError('maxSourceLength must be an integer from 1 through 1000000.');
			result.maxSourceLength = value;
		} else throw new TypeError(`${String(key)} is not an option; accepted keys are title, strict, maxSourceLength.`);
	}
	return result;
}

/**
 * The public contract of `@schemd/circuitikz`.
 *
 * Everything a host can observe is declared here, once. A pull request that
 * changes this file changes the package's API and needs the maintainer's
 * review (see `.github/CODEOWNERS`); REQUIREMENTS.md §3 is the prose behind it.
 */
import type { SchematicFence } from '@schemd/core';

/**
 * What a problem in the TeX source is about.
 *
 * - `syntax`: the input does not parse as the supported grammar.
 * - `unsupported`: valid CircuiTikZ that this converter does not convert.
 * - `geometry`: a construct the converter cannot place, such as a diagonal component.
 * - `reference`: a named coordinate used before, or without, its definition.
 * - `limit`: input beyond a configured bound.
 * - `internal`: the converter produced schemd that `@schemd/core` rejected, or
 *   whose connectivity differs from the TeX. Always a converter bug.
 */
export type CircuitikzDiagnosticCode = 'syntax' | 'unsupported' | 'geometry' | 'reference' | 'limit' | 'internal';

/** One problem, addressed to a span of the TeX source. */
export interface CircuitikzDiagnostic {
	readonly code: CircuitikzDiagnosticCode;
	/** One sentence that names the construct and says what to write instead. */
	readonly message: string;
	/** One-based line in the TeX source. */
	readonly line: number;
	/** One-based column of the first character, in UTF-16 code units, as `@schemd/core` counts. */
	readonly column: number;
	/** One-based column just past the last character, on the same line. */
	readonly endColumn: number;
	/**
	 * `warning` is reserved for the presentation-only keys REQUIREMENTS.md §5.4
	 * enumerates; everything else is an `error`.
	 */
	readonly severity: 'error' | 'warning';
}

/** Ties one emitted schemd line to the TeX span it came from. */
export interface CircuitikzMapping {
	/** One-based line in the emitted schemd source. */
	readonly schemdLine: number;
	readonly line: number;
	readonly column: number;
	readonly endColumn: number;
}

/** Options for one conversion. Every field is optional and validated. */
export interface ConvertCircuitikzOptions {
	/** Accessible title for the emitted fence. */
	readonly title?: string;
	/** Treat every warning as an error. */
	readonly strict?: boolean;
	/** Longest TeX input accepted, in UTF-16 code units. */
	readonly maxSourceLength?: number;
}

/** Everything one conversion produces. */
export interface CircuitikzConversion {
	/** True exactly when `diagnostics` holds no error. */
	readonly ok: boolean;
	/** The schemd document; `undefined` whenever `ok` is false. Never partial. */
	readonly source: string | undefined;
	/** Bounds and title for the fence; `undefined` whenever `ok` is false. */
	readonly fence: SchematicFence | undefined;
	/** Every problem found, errors and warnings, in source order. */
	readonly diagnostics: readonly CircuitikzDiagnostic[];
	/** One entry per emitted declaration line; empty whenever `ok` is false. */
	readonly sourceMap: readonly CircuitikzMapping[];
}

/**
 * Which terminals a circuit ties together: a list of nets, each a sorted list
 * of `ID.port` keys, the nets themselves sorted. Junction parts are not
 * terminals here — a net that passes through a junction is one net.
 */
export type CircuitConnectivity = readonly (readonly string[])[];

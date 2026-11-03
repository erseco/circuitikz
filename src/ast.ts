/** Internal syntax, independent of Schemd text. All offsets count UTF-16 units. */
export interface Span {
	readonly start: number;
	readonly end: number;
	readonly line: number;
	readonly column: number;
	readonly endColumn: number;
}

export interface Token extends Span {
	readonly value: string;
	readonly kind: 'command' | 'atom' | 'symbol' | 'eof';
}

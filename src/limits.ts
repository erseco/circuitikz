/** Fixed budgets checked before allocating or traversing the work they bound. */
export const LIMITS = Object.freeze({
	sourceLength: 100_000,
	statements: 1024,
	pathElements: 4096,
	components: 512,
	junctions: 512,
	braceDepth: 32
});

/** Integer-only scale and margins from R-5.3.1. */
export const SCALE = 100;
export const MARGIN = 80;

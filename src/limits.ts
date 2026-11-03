/** Fixed budgets checked before allocating or traversing the work they bound. */
export const LIMITS = Object.freeze({
	sourceLength: 100_000,
	statements: 1024,
	pathElements: 4096,
	components: 512,
	braceDepth: 32
});

/** Integer-only scale from R-5.3.1: one TikZ unit is one hundred integer units. */
export const SCALE = 100;

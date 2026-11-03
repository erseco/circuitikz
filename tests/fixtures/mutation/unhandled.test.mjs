import { test } from 'vitest';
test('settles', () => { Promise.reject(new Error('left unhandled')); });

import { createA2a } from './a2a-provider';
import { describe, it } from 'vitest';
import { throws } from 'assert';

describe('provider', () => {

    it('fails with new A2aProvider', async () => {
        const Provider = createA2a({});
        throws(() => {
            new Provider("http://example.org");
        }, /The model factory function cannot be called with the new keyword./);
    });
});
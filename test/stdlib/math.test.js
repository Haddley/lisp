// Unit tests for Math Standard Library and I/O

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    createInterpreter,
    VOID
} from '../setup/test-helper.js';

describe('Math Standard Library', () => {
    let interp;

    beforeEach(() => {
        interp = createInterpreter();
    });

    describe('basic math functions', () => {
        it('sqrt calculates square root', () => {
            assert.strictEqual(interp.run('(sqrt 4)'), 2);
            assert.strictEqual(interp.run('(sqrt 9)'), 3);
        });

        it('expt calculates power', () => {
            assert.strictEqual(interp.run('(expt 2 3)'), 8);
            assert.strictEqual(interp.run('(expt 2 0)'), 1);
        });

        it('exp calculates e^x', () => {
            assert.strictEqual(interp.run('(exp 0)'), 1);
        });

        it('log calculates natural logarithm', () => {
            assert.strictEqual(interp.run('(log 1)'), 0);
        });
    });

    describe('trigonometric functions', () => {
        it('sin calculates sine', () => {
            assert.strictEqual(interp.run('(sin 0)'), 0);
        });

        it('cos calculates cosine', () => {
            assert.strictEqual(interp.run('(cos 0)'), 1);
        });

        it('tan calculates tangent', () => {
            assert.strictEqual(interp.run('(tan 0)'), 0);
        });
    });

    describe('constants', () => {
        it('pi is defined', () => {
            assert.ok(Math.abs(interp.run('pi') - Math.PI) < 0.0001);
        });

        it('e is defined', () => {
            assert.ok(Math.abs(interp.run('e') - Math.E) < 0.0001);
        });
    });

    describe('random', () => {
        it('random returns number between 0 and 1', () => {
            const result = interp.run('(random)');
            assert.ok(result >= 0 && result < 1);
        });
    });

    describe('gcd and lcm', () => {
        it('gcd calculates greatest common divisor', () => {
            assert.strictEqual(interp.run('(gcd 12 8)'), 4);
        });

        it('lcm calculates least common multiple', () => {
            assert.strictEqual(interp.run('(lcm 4 6)'), 12);
        });
    });
});

describe('I/O Functions', () => {
    let interp;

    beforeEach(() => {
        interp = createInterpreter();
    });

    describe('display', () => {
        it('returns void', () => {
            const result = interp.run('(display "test")');
            assert(result === VOID || result === undefined);
        });
    });

    describe('newline', () => {
        it('returns void', () => {
            const result = interp.run('(newline)');
            assert(result === VOID || result === undefined);
        });
    });
});

describe('Functional Utilities', () => {
    let interp;

    beforeEach(() => {
        interp = createInterpreter();
    });

    describe('identity', () => {
        it('returns its argument', () => {
            assert.strictEqual(interp.run('(identity 42)'), 42);
        });
    });

    describe('compose', () => {
        it('composes two functions', () => {
            interp.run('(define (add1 x) (+ x 1))');
            interp.run('(define (double x) (* x 2))');
            interp.run('(define add1-then-double (compose double add1))');
            assert.strictEqual(interp.run('(add1-then-double 5)'), 12);
        });
    });
});

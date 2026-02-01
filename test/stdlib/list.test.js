// Unit tests for List Standard Library

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    createInterpreter,
    NIL, RuntimeError, stringify
} from '../setup/test-helper.js';

describe('List Standard Library', () => {
    let interp;

    beforeEach(() => {
        interp = createInterpreter();
    });

    describe('map', () => {
        it('maps function over list', () => {
            interp.run('(define (double x) (* x 2))');
            assert.strictEqual(stringify(interp.run("(map double '(1 2 3))")), '(2 4 6)');
        });

        it('maps over empty list', () => {
            assert.strictEqual(interp.run("(map (lambda (x) x) '())"), NIL);
        });

        it('maps lambda', () => {
            assert.strictEqual(stringify(interp.run("(map (lambda (x) (+ x 1)) '(1 2 3))")), '(2 3 4)');
        });

        it('maps over multiple lists', () => {
            assert.strictEqual(stringify(interp.run("(map + '(1 2 3) '(10 20 30))")), '(11 22 33)');
        });
    });

    describe('filter', () => {
        it('filters list by predicate', () => {
            assert.strictEqual(stringify(interp.run("(filter odd? '(1 2 3 4 5))")), '(1 3 5)');
        });

        it('filters empty list', () => {
            assert.strictEqual(interp.run("(filter odd? '())"), NIL);
        });

        it('filters with lambda', () => {
            assert.strictEqual(stringify(interp.run("(filter (lambda (x) (> x 2)) '(1 2 3 4 5))")), '(3 4 5)');
        });

        it('returns empty when nothing matches', () => {
            assert.strictEqual(interp.run("(filter (lambda (x) #f) '(1 2 3))"), NIL);
        });
    });

    describe('reduce / fold-left', () => {
        it('reduces list with function', () => {
            assert.strictEqual(interp.run("(reduce + 0 '(1 2 3 4 5))"), 15);
        });

        it('reduces empty list to initial', () => {
            assert.strictEqual(interp.run("(reduce + 0 '())"), 0);
        });

        it('fold-left is alias', () => {
            assert.strictEqual(interp.run("(fold-left + 0 '(1 2 3))"), 6);
        });

        it('reduces with non-commutative function', () => {
            assert.strictEqual(interp.run("(reduce - 0 '(1 2 3))"), -6);
        });
    });

    describe('fold-right', () => {
        it('folds from right', () => {
            assert.strictEqual(stringify(interp.run("(fold-right cons '() '(1 2 3))")), '(1 2 3)');
        });

        it('difference from fold-left', () => {
            assert.strictEqual(interp.run("(fold-right - 0 '(1 2 3))"), 2);
        });
    });

    describe('for-each', () => {
        it('applies function for side effects', () => {
            interp.run('(define sum 0)');
            interp.run("(for-each (lambda (x) (set! sum (+ sum x))) '(1 2 3))");
            assert.strictEqual(interp.run('sum'), 6);
        });
    });

    describe('any / some', () => {
        it('returns true if any match', () => {
            assert.strictEqual(interp.run("(any odd? '(2 4 5 6))"), true);
        });

        it('returns false if none match', () => {
            assert.strictEqual(interp.run("(any odd? '(2 4 6))"), false);
        });

        it('returns false for empty list', () => {
            assert.strictEqual(interp.run("(any odd? '())"), false);
        });
    });

    describe('every / all', () => {
        it('returns true if all match', () => {
            assert.strictEqual(interp.run("(every odd? '(1 3 5))"), true);
        });

        it('returns false if any fails', () => {
            assert.strictEqual(interp.run("(every odd? '(1 2 3))"), false);
        });

        it('returns true for empty list', () => {
            assert.strictEqual(interp.run("(every odd? '())"), true);
        });
    });

    describe('find', () => {
        it('finds first matching element', () => {
            assert.strictEqual(interp.run("(find even? '(1 3 4 5 6))"), 4);
        });

        it('returns false if not found', () => {
            assert.strictEqual(interp.run("(find even? '(1 3 5))"), false);
        });
    });

    describe('range', () => {
        it('generates range from 0', () => {
            assert.strictEqual(stringify(interp.run('(range 5)')), '(0 1 2 3 4)');
        });

        it('generates range with start', () => {
            assert.strictEqual(stringify(interp.run('(range 1 5)')), '(1 2 3 4)');
        });

        it('generates range with step', () => {
            assert.strictEqual(stringify(interp.run('(range 0 10 2)')), '(0 2 4 6 8)');
        });

        it('generates empty for invalid range', () => {
            assert.strictEqual(interp.run('(range 5 0)'), NIL);
        });
    });

    describe('take', () => {
        it('takes first n elements', () => {
            assert.strictEqual(stringify(interp.run("(take 3 '(1 2 3 4 5))")), '(1 2 3)');
        });

        it('takes all if n >= length', () => {
            assert.strictEqual(stringify(interp.run("(take 10 '(1 2 3))")), '(1 2 3)');
        });

        it('returns empty for n = 0', () => {
            assert.strictEqual(interp.run("(take 0 '(1 2 3))"), NIL);
        });
    });

    describe('drop', () => {
        it('drops first n elements', () => {
            assert.strictEqual(stringify(interp.run("(drop 2 '(1 2 3 4 5))")), '(3 4 5)');
        });

        it('returns empty if n >= length', () => {
            assert.strictEqual(interp.run("(drop 10 '(1 2 3))"), NIL);
        });

        it('returns all for n = 0', () => {
            assert.strictEqual(stringify(interp.run("(drop 0 '(1 2 3))")), '(1 2 3)');
        });
    });

    describe('zip', () => {
        it('zips two lists', () => {
            assert.strictEqual(stringify(interp.run("(zip '(1 2 3) '(a b c))")), '((1 a) (2 b) (3 c))');
        });

        it('stops at shorter list', () => {
            assert.strictEqual(stringify(interp.run("(zip '(1 2) '(a b c d))")), '((1 a) (2 b))');
        });

        it('returns empty for empty list', () => {
            assert.strictEqual(interp.run("(zip '() '(1 2 3))"), NIL);
        });
    });

    describe('last', () => {
        it('returns last element', () => {
            assert.strictEqual(interp.run("(last '(1 2 3))"), 3);
        });
    });

    describe('iota', () => {
        it('generates count integers from 0', () => {
            assert.strictEqual(stringify(interp.run('(iota 5)')), '(0 1 2 3 4)');
        });

        it('generates from start', () => {
            assert.strictEqual(stringify(interp.run('(iota 5 10)')), '(10 11 12 13 14)');
        });

        it('generates with step', () => {
            assert.strictEqual(stringify(interp.run('(iota 5 0 2)')), '(0 2 4 6 8)');
        });
    });

});

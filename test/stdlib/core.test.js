// Unit tests for Core Standard Library

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    createInterpreter,
    NIL, VOID, RuntimeError, stringify
} from '../setup/test-helper.js';

describe('Core Standard Library', () => {
    let interp;

    beforeEach(() => {
        interp = createInterpreter();
    });

    describe('arithmetic', () => {
        it('adds numbers', () => {
            assert.strictEqual(interp.run('(+ 1 2 3)'), 6);
            assert.strictEqual(interp.run('(+)'), 0);
        });

        it('subtracts numbers', () => {
            assert.strictEqual(interp.run('(- 10 3)'), 7);
            assert.strictEqual(interp.run('(- 5)'), -5);
        });

        it('multiplies numbers', () => {
            assert.strictEqual(interp.run('(* 2 3 4)'), 24);
            assert.strictEqual(interp.run('(*)'), 1);
        });

        it('divides numbers', () => {
            assert.strictEqual(interp.run('(/ 10 2)'), 5);
            assert.strictEqual(interp.run('(/ 4)'), 0.25);
        });

        it('handles modulo', () => {
            assert.strictEqual(interp.run('(modulo 10 3)'), 1);
        });

        it('handles abs', () => {
            assert.strictEqual(interp.run('(abs -5)'), 5);
            assert.strictEqual(interp.run('(abs 5)'), 5);
        });

        it('handles min and max', () => {
            assert.strictEqual(interp.run('(min 1 2 3)'), 1);
            assert.strictEqual(interp.run('(max 1 2 3)'), 3);
        });
    });

    describe('comparison', () => {
        it('compares with =', () => {
            assert.strictEqual(interp.run('(= 1 1)'), true);
            assert.strictEqual(interp.run('(= 1 2)'), false);
        });

        it('compares with <', () => {
            assert.strictEqual(interp.run('(< 1 2)'), true);
            assert.strictEqual(interp.run('(< 2 1)'), false);
        });

        it('compares with >', () => {
            assert.strictEqual(interp.run('(> 2 1)'), true);
            assert.strictEqual(interp.run('(> 1 2)'), false);
        });
    });

    describe('type predicates', () => {
        it('checks null?', () => {
            assert.strictEqual(interp.run("(null? '())"), true);
            assert.strictEqual(interp.run("(null? '(1))"), false);
        });

        it('checks pair?', () => {
            assert.strictEqual(interp.run("(pair? '(1 . 2))"), true);
            assert.strictEqual(interp.run("(pair? '())"), false);
        });

        it('checks list?', () => {
            assert.strictEqual(interp.run("(list? '())"), true);
            assert.strictEqual(interp.run("(list? '(1 2 3))"), true);
        });

        it('checks number?', () => {
            assert.strictEqual(interp.run('(number? 42)'), true);
            assert.strictEqual(interp.run('(number? "42")'), false);
        });

        it('checks string?', () => {
            assert.strictEqual(interp.run('(string? "hello")'), true);
            assert.strictEqual(interp.run('(string? 42)'), false);
        });

        it('checks procedure?', () => {
            assert.strictEqual(interp.run('(procedure? +)'), true);
            assert.strictEqual(interp.run('(procedure? 42)'), false);
        });

        it('checks zero?', () => {
            assert.strictEqual(interp.run('(zero? 0)'), true);
            assert.strictEqual(interp.run('(zero? 1)'), false);
        });
    });

    describe('list operations', () => {
        it('cons creates pairs', () => {
            assert.strictEqual(stringify(interp.run('(cons 1 2)')), '(1 . 2)');
            assert.strictEqual(stringify(interp.run("(cons 1 '())")), '(1)');
        });

        it('car returns first element', () => {
            assert.strictEqual(interp.run("(car '(1 2 3))"), 1);
        });

        it('cdr returns rest', () => {
            assert.strictEqual(stringify(interp.run("(cdr '(1 2 3))")), '(2 3)');
        });

        it('list creates list', () => {
            assert.strictEqual(stringify(interp.run('(list 1 2 3)')), '(1 2 3)');
            assert.strictEqual(interp.run('(list)'), NIL);
        });

        it('length returns list length', () => {
            assert.strictEqual(interp.run("(length '())"), 0);
            assert.strictEqual(interp.run("(length '(1 2 3))"), 3);
        });

        it('append joins lists', () => {
            assert.strictEqual(stringify(interp.run("(append '(1 2) '(3 4))")), '(1 2 3 4)');
        });

        it('reverse reverses list', () => {
            assert.strictEqual(stringify(interp.run("(reverse '(1 2 3))")), '(3 2 1)');
        });
    });

    describe('equality', () => {
        it('eq? tests identity', () => {
            assert.strictEqual(interp.run("(eq? 'a 'a)"), true);
            assert.strictEqual(interp.run("(eq? 'a 'b)"), false);
        });

        it('equal? tests deep equality', () => {
            assert.strictEqual(interp.run("(equal? '(1 2 3) '(1 2 3))"), true);
            assert.strictEqual(interp.run("(equal? '(1 2 3) '(1 2 4))"), false);
        });
    });

    describe('boolean operations', () => {
        it('not negates', () => {
            assert.strictEqual(interp.run('(not #f)'), true);
            assert.strictEqual(interp.run('(not #t)'), false);
        });
    });

    describe('apply and eval', () => {
        it('apply calls function with list args', () => {
            assert.strictEqual(interp.run("(apply + '(1 2 3))"), 6);
        });
    });

    describe('type conversions', () => {
        it('number->string converts', () => {
            assert.strictEqual(interp.run('(number->string 42)'), '42');
        });

        it('string->number converts', () => {
            assert.strictEqual(interp.run('(string->number "42")'), 42);
        });
    });
});

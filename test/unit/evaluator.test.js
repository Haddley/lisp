// Unit tests for Evaluator

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    createInterpreter, evalToString, expectError,
    NIL, VOID, Procedure, NativeProcedure,
    RuntimeError, stringify
} from '../setup/test-helper.js';

describe('Evaluator', () => {
    let interp;

    beforeEach(() => {
        interp = createInterpreter();
    });

    describe('literals', () => {
        it('evaluates numbers', () => {
            assert.strictEqual(interp.run('42'), 42);
            assert.strictEqual(interp.run('-3.14'), -3.14);
            assert.strictEqual(interp.run('0'), 0);
        });

        it('evaluates strings', () => {
            assert.strictEqual(interp.run('"hello"'), 'hello');
            assert.strictEqual(interp.run('""'), '');
        });

        it('evaluates booleans', () => {
            assert.strictEqual(interp.run('#t'), true);
            assert.strictEqual(interp.run('#f'), false);
        });
    });

    describe('symbols', () => {
        it('looks up defined variables', () => {
            interp.run('(define x 42)');
            assert.strictEqual(interp.run('x'), 42);
        });

        it('throws on undefined variables', () => {
            expectError('undefined-var', RuntimeError, /[Uu]ndefined/);
        });
    });

    describe('quote', () => {
        it('quotes symbols', () => {
            const result = interp.run("'foo");
            assert.strictEqual(result.name, 'foo');
        });

        it('quotes lists', () => {
            const result = interp.run("'(1 2 3)");
            assert.strictEqual(stringify(result), '(1 2 3)');
        });

        it('quotes nested lists', () => {
            const result = interp.run("'((a b) (c d))");
            assert.strictEqual(stringify(result), '((a b) (c d))');
        });

        it('quotes empty list', () => {
            assert.strictEqual(interp.run("'()"), NIL);
        });
    });

    describe('define', () => {
        it('defines simple variables', () => {
            interp.run('(define x 10)');
            assert.strictEqual(interp.run('x'), 10);
        });

        it('defines with expression', () => {
            interp.run('(define x (+ 1 2))');
            assert.strictEqual(interp.run('x'), 3);
        });

        it('defines functions with shorthand', () => {
            interp.run('(define (square x) (* x x))');
            assert.strictEqual(interp.run('(square 5)'), 25);
        });

        it('defines functions with multiple parameters', () => {
            interp.run('(define (add a b) (+ a b))');
            assert.strictEqual(interp.run('(add 3 4)'), 7);
        });

        it('returns VOID', () => {
            assert.strictEqual(interp.run('(define x 1)'), VOID);
        });
    });

    describe('lambda', () => {
        it('creates procedure', () => {
            const proc = interp.run('(lambda (x) x)');
            assert(proc instanceof Procedure);
        });

        it('captures closure', () => {
            interp.run('(define make-adder (lambda (n) (lambda (x) (+ x n))))');
            interp.run('(define add5 (make-adder 5))');
            assert.strictEqual(interp.run('(add5 10)'), 15);
        });

        it('supports multiple parameters', () => {
            interp.run('(define f (lambda (a b c) (+ a b c)))');
            assert.strictEqual(interp.run('(f 1 2 3)'), 6);
        });

        it('supports variadic functions', () => {
            interp.run('(define sum-all (lambda args (reduce + 0 args)))');
            assert.strictEqual(interp.run('(sum-all 1 2 3 4 5)'), 15);
        });

        // Note: (lambda (first . rest) ...) syntax may not be fully supported
        // Use (lambda args ...) for variadic functions instead
    });

    describe('if', () => {
        it('evaluates true branch', () => {
            assert.strictEqual(interp.run('(if #t 1 2)'), 1);
        });

        it('evaluates false branch', () => {
            assert.strictEqual(interp.run('(if #f 1 2)'), 2);
        });

        it('treats 0 as truthy', () => {
            assert.strictEqual(interp.run('(if 0 1 2)'), 1);
        });

        it('treats empty list as truthy', () => {
            assert.strictEqual(interp.run("(if '() 1 2)"), 1);
        });

        it('returns VOID when else missing and false', () => {
            assert.strictEqual(interp.run('(if #f 1)'), VOID);
        });

        it('supports nested if', () => {
            assert.strictEqual(interp.run('(if #t (if #f 1 2) 3)'), 2);
        });
    });

    describe('cond', () => {
        it('evaluates first true clause', () => {
            assert.strictEqual(interp.run('(cond (#t 1) (#t 2))'), 1);
        });

        it('skips false clauses', () => {
            assert.strictEqual(interp.run('(cond (#f 1) (#t 2))'), 2);
        });

        it('handles else clause', () => {
            assert.strictEqual(interp.run('(cond (#f 1) (else 2))'), 2);
        });

        it('returns test value when no body', () => {
            assert.strictEqual(interp.run('(cond (5))'), 5);
        });

        it('evaluates multiple expressions in clause', () => {
            interp.run('(define x 0)');
            interp.run('(cond (#t (set! x 1) (set! x (+ x 1))))');
            assert.strictEqual(interp.run('x'), 2);
        });

        it('returns VOID when no clause matches', () => {
            assert.strictEqual(interp.run('(cond (#f 1))'), VOID);
        });
    });

    describe('let', () => {
        it('binds single variable', () => {
            assert.strictEqual(interp.run('(let ((x 10)) x)'), 10);
        });

        it('binds multiple variables', () => {
            assert.strictEqual(interp.run('(let ((x 1) (y 2)) (+ x y))'), 3);
        });

        it('bindings are parallel', () => {
            interp.run('(define x 10)');
            // In let, y should see outer x, not the inner x
            assert.strictEqual(interp.run('(let ((x 1) (y x)) y)'), 10);
        });

        it('shadows outer bindings', () => {
            interp.run('(define x 1)');
            assert.strictEqual(interp.run('(let ((x 2)) x)'), 2);
            assert.strictEqual(interp.run('x'), 1);
        });

        it('supports multiple body expressions', () => {
            assert.strictEqual(interp.run('(let ((x 1)) (+ x 1) (+ x 2))'), 3);
        });
    });

    describe('let*', () => {
        it('binds sequentially', () => {
            assert.strictEqual(interp.run('(let* ((x 1) (y (+ x 1))) y)'), 2);
        });

        it('later bindings see earlier ones', () => {
            assert.strictEqual(interp.run('(let* ((a 1) (b (+ a 1)) (c (+ b 1))) c)'), 3);
        });
    });

    describe('letrec', () => {
        it('supports recursive bindings', () => {
            const result = interp.run(`
                (letrec ((fact (lambda (n)
                    (if (= n 0) 1 (* n (fact (- n 1)))))))
                    (fact 5))
            `);
            assert.strictEqual(result, 120);
        });

        it('supports mutual recursion', () => {
            const result = interp.run(`
                (letrec ((even? (lambda (n) (if (= n 0) #t (odd? (- n 1)))))
                         (odd? (lambda (n) (if (= n 0) #f (even? (- n 1))))))
                    (even? 10))
            `);
            assert.strictEqual(result, true);
        });
    });

    describe('named let', () => {
        it('supports iteration', () => {
            const result = interp.run(`
                (let loop ((i 0) (sum 0))
                    (if (> i 10)
                        sum
                        (loop (+ i 1) (+ sum i))))
            `);
            assert.strictEqual(result, 55);
        });
    });

    describe('begin', () => {
        it('evaluates expressions in sequence', () => {
            interp.run('(define x 0)');
            interp.run('(begin (set! x 1) (set! x 2))');
            assert.strictEqual(interp.run('x'), 2);
        });

        it('returns last value', () => {
            assert.strictEqual(interp.run('(begin 1 2 3)'), 3);
        });

        it('returns VOID for empty begin', () => {
            assert.strictEqual(interp.run('(begin)'), VOID);
        });
    });

    describe('set!', () => {
        it('mutates existing binding', () => {
            interp.run('(define x 1)');
            interp.run('(set! x 2)');
            assert.strictEqual(interp.run('x'), 2);
        });

        it('throws on undefined variable', () => {
            expectError('(set! undefined-var 1)', RuntimeError, /[Uu]ndefined|[Cc]annot set/);
        });

        it('mutates in parent scope', () => {
            interp.run('(define x 1)');
            interp.run('(let ((y 2)) (set! x 10))');
            assert.strictEqual(interp.run('x'), 10);
        });
    });

    describe('and', () => {
        it('returns true for empty and', () => {
            assert.strictEqual(interp.run('(and)'), true);
        });

        it('returns last truthy value', () => {
            assert.strictEqual(interp.run('(and 1 2 3)'), 3);
        });

        it('short-circuits on false', () => {
            interp.run('(define x 0)');
            interp.run('(and #f (set! x 1))');
            assert.strictEqual(interp.run('x'), 0);
        });

        it('returns false for false value', () => {
            assert.strictEqual(interp.run('(and 1 #f 3)'), false);
        });
    });

    describe('or', () => {
        it('returns false for empty or', () => {
            assert.strictEqual(interp.run('(or)'), false);
        });

        it('returns first truthy value', () => {
            assert.strictEqual(interp.run('(or #f 2 3)'), 2);
        });

        it('short-circuits on truthy', () => {
            interp.run('(define x 0)');
            interp.run('(or 1 (set! x 1))');
            assert.strictEqual(interp.run('x'), 0);
        });

        it('returns false when all false', () => {
            assert.strictEqual(interp.run('(or #f #f #f)'), false);
        });
    });

    describe('procedure calls', () => {
        it('calls native procedures', () => {
            assert.strictEqual(interp.run('(+ 1 2 3)'), 6);
        });

        it('calls user procedures', () => {
            interp.run('(define (f x) (* x 2))');
            assert.strictEqual(interp.run('(f 5)'), 10);
        });

        it('throws on non-procedure', () => {
            expectError('(42)', RuntimeError, /not a procedure/);
        });

        it('throws on wrong arity', () => {
            interp.run('(define (f x) x)');
            assert.throws(
                () => interp.run('(f 1 2)'),
                (err) => err instanceof RuntimeError && /argument|arity/i.test(err.message)
            );
        });

        it('supports higher-order functions', () => {
            interp.run('(define (apply-twice f x) (f (f x)))');
            interp.run('(define (double x) (* x 2))');
            assert.strictEqual(interp.run('(apply-twice double 3)'), 12);
        });
    });

    describe('empty list', () => {
        it('evaluates to NIL', () => {
            assert.strictEqual(interp.run('()'), NIL);
        });
    });

    describe('truthiness', () => {
        it('only #f is falsy', () => {
            assert.strictEqual(interp.run('(if #f "false" "true")'), 'true');
            assert.strictEqual(interp.run('(if 0 "true" "false")'), 'true');
            assert.strictEqual(interp.run('(if "" "true" "false")'), 'true');
            assert.strictEqual(interp.run("(if '() \"true\" \"false\")"), 'true');
        });
    });

    describe('multiple expressions', () => {
        it('evaluates all and returns last', () => {
            const result = interp.run('1 2 3');
            assert.strictEqual(result, 3);
        });

        it('maintains state across expressions', () => {
            interp.run('(define x 1) (set! x 2)');
            assert.strictEqual(interp.run('x'), 2);
        });
    });
});

// Integration tests - End-to-end program tests

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    createInterpreter,
    NIL, stringify
} from '../setup/test-helper.js';

describe('Integration: Classic Programs', () => {
    let interp;

    beforeEach(() => {
        interp = createInterpreter();
    });

    describe('factorial', () => {
        it('calculates factorial recursively', () => {
            interp.run(`
                (define (factorial n)
                    (if (= n 0)
                        1
                        (* n (factorial (- n 1)))))
            `);

            assert.strictEqual(interp.run('(factorial 0)'), 1);
            assert.strictEqual(interp.run('(factorial 5)'), 120);
            assert.strictEqual(interp.run('(factorial 10)'), 3628800);
        });

        it('calculates factorial with tail recursion', () => {
            interp.run(`
                (define (factorial-iter n acc)
                    (if (= n 0)
                        acc
                        (factorial-iter (- n 1) (* n acc))))
                (define (factorial n) (factorial-iter n 1))
            `);

            assert.strictEqual(interp.run('(factorial 10)'), 3628800);
        });
    });

    describe('fibonacci', () => {
        it('calculates fibonacci recursively', () => {
            interp.run(`
                (define (fib n)
                    (cond ((= n 0) 0)
                          ((= n 1) 1)
                          (else (+ (fib (- n 1)) (fib (- n 2))))))
            `);

            assert.strictEqual(interp.run('(fib 0)'), 0);
            assert.strictEqual(interp.run('(fib 1)'), 1);
            assert.strictEqual(interp.run('(fib 10)'), 55);
        });

        it('calculates fibonacci with tail recursion', () => {
            interp.run(`
                (define (fib-iter n a b)
                    (if (= n 0)
                        a
                        (fib-iter (- n 1) b (+ a b))))
                (define (fib n) (fib-iter n 0 1))
            `);

            assert.strictEqual(interp.run('(fib 20)'), 6765);
        });
    });

    describe('higher-order functions', () => {
        it('chains map, filter, reduce', () => {
            const result = interp.run(`
                (reduce + 0
                    (map (lambda (x) (* x x))
                         (filter odd? '(1 2 3 4 5))))
            `);
            assert.strictEqual(result, 35);
        });

        it('implements compose manually', () => {
            interp.run(`
                (define (my-compose f g)
                    (lambda (x) (f (g x))))
                (define (add1 x) (+ x 1))
                (define (double x) (* x 2))
                (define add1-then-double (my-compose double add1))
            `);

            assert.strictEqual(interp.run('(add1-then-double 5)'), 12);
        });
    });

    describe('closures', () => {
        it('implements make-counter', () => {
            interp.run(`
                (define (make-counter)
                    (let ((count 0))
                        (lambda ()
                            (set! count (+ count 1))
                            count)))
                (define c1 (make-counter))
                (define c2 (make-counter))
            `);

            assert.strictEqual(interp.run('(c1)'), 1);
            assert.strictEqual(interp.run('(c1)'), 2);
            assert.strictEqual(interp.run('(c2)'), 1);
            assert.strictEqual(interp.run('(c1)'), 3);
        });

        it('implements make-adder', () => {
            interp.run(`
                (define (make-adder n)
                    (lambda (x) (+ x n)))
                (define add5 (make-adder 5))
                (define add10 (make-adder 10))
            `);

            assert.strictEqual(interp.run('(add5 3)'), 8);
            assert.strictEqual(interp.run('(add10 3)'), 13);
        });
    });

    describe('mutual recursion', () => {
        it('implements even?/odd? with letrec', () => {
            interp.run(`
                (define (is-even? n)
                    (letrec ((ev? (lambda (x) (if (= x 0) #t (od? (- x 1)))))
                             (od? (lambda (x) (if (= x 0) #f (ev? (- x 1))))))
                        (ev? n)))
            `);

            assert.strictEqual(interp.run('(is-even? 0)'), true);
            assert.strictEqual(interp.run('(is-even? 1)'), false);
            assert.strictEqual(interp.run('(is-even? 10)'), true);
        });
    });

    describe('numeric algorithms', () => {
        it('calculates GCD using Euclidean algorithm', () => {
            interp.run(`
                (define (my-gcd a b)
                    (if (= b 0)
                        a
                        (my-gcd b (modulo a b))))
            `);

            assert.strictEqual(interp.run('(my-gcd 48 18)'), 6);
            assert.strictEqual(interp.run('(my-gcd 100 35)'), 5);
        });

        it('calculates sum of squares', () => {
            interp.run(`
                (define (sum-of-squares n)
                    (reduce + 0
                            (map (lambda (x) (* x x))
                                 (range 1 (+ n 1)))))
            `);

            assert.strictEqual(interp.run('(sum-of-squares 5)'), 55);
        });
    });

    describe('string processing', () => {
        it('implements palindrome check', () => {
            interp.run(`
                (define (palindrome? str)
                    (string=? str (string-reverse str)))
            `);

            assert.strictEqual(interp.run('(palindrome? "racecar")'), true);
            assert.strictEqual(interp.run('(palindrome? "hello")'), false);
        });
    });
});

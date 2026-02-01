// Integration tests - Tail Call Optimization

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createInterpreter, stringify } from '../setup/test-helper.js';

describe('Integration: Tail Call Optimization', () => {
    let interp;

    beforeEach(() => {
        interp = createInterpreter();
    });

    describe('direct tail recursion', () => {
        it('handles deep recursion with tail call', () => {
            interp.run(`
                (define (count-down n)
                    (if (= n 0)
                        'done
                        (count-down (- n 1))))
            `);

            const result = interp.run('(count-down 10000)');
            assert.strictEqual(result.name, 'done');
        });

        it('handles tail-recursive sum', () => {
            interp.run(`
                (define (sum-iter n acc)
                    (if (= n 0)
                        acc
                        (sum-iter (- n 1) (+ acc n))))
                (define (sum-to n) (sum-iter n 0))
            `);

            assert.strictEqual(interp.run('(sum-to 10000)'), 50005000);
        });
    });

    describe('mutual tail recursion', () => {
        it('handles mutually recursive even?/odd?', () => {
            interp.run(`
                (define (my-even? n)
                    (if (= n 0)
                        #t
                        (my-odd? (- n 1))))

                (define (my-odd? n)
                    (if (= n 0)
                        #f
                        (my-even? (- n 1))))
            `);

            assert.strictEqual(interp.run('(my-even? 10000)'), true);
            assert.strictEqual(interp.run('(my-odd? 10001)'), true);
        });
    });

    describe('tail position in different forms', () => {
        it('if consequent is tail position', () => {
            interp.run(`
                (define (f n)
                    (if (= n 0)
                        'done
                        (f (- n 1))))
            `);

            assert.strictEqual(interp.run('(f 5000)').name, 'done');
        });

        it('cond clause body is tail position', () => {
            interp.run(`
                (define (f n)
                    (cond ((= n 0) 'done)
                          (else (f (- n 1)))))
            `);

            assert.strictEqual(interp.run('(f 5000)').name, 'done');
        });

        it('begin last expression is tail position', () => {
            interp.run(`
                (define (f n acc)
                    (if (= n 0)
                        acc
                        (begin
                            (+ 1 1)
                            (f (- n 1) (+ acc n)))))
            `);

            assert.strictEqual(interp.run('(f 5000 0)'), 12502500);
        });

        it('let body last expression is tail position', () => {
            interp.run(`
                (define (f n)
                    (if (= n 0)
                        'done
                        (let ((m (- n 1)))
                            (f m))))
            `);

            assert.strictEqual(interp.run('(f 5000)').name, 'done');
        });
    });

    describe('named let (loop)', () => {
        it('named let enables iteration', () => {
            const result = interp.run(`
                (let loop ((n 10000) (acc 0))
                    (if (= n 0)
                        acc
                        (loop (- n 1) (+ acc n))))
            `);

            assert.strictEqual(result, 50005000);
        });
    });

    describe('letrec with tail recursion', () => {
        it('letrec functions can tail-call each other', () => {
            const result = interp.run(`
                (letrec ((ping (lambda (n)
                            (if (= n 0)
                                'pong
                                (pong (- n 1)))))
                         (pong (lambda (n)
                            (if (= n 0)
                                'ping
                                (ping (- n 1))))))
                    (ping 10000))
            `);

            assert.strictEqual(result.name, 'pong');
        });
    });

    describe('performance verification', () => {
        it('fibonacci with accumulator is fast', () => {
            interp.run(`
                (define (fib-iter n a b)
                    (if (= n 0)
                        a
                        (fib-iter (- n 1) b (+ a b))))
                (define (fib n) (fib-iter n 0 1))
            `);

            assert.strictEqual(interp.run('(fib 50)'), 12586269025);
        });
    });
});

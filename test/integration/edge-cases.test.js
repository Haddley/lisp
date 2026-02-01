// Integration tests - Edge cases and error handling

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    createInterpreter, expectError, expectLexerError, expectParseError,
    NIL, VOID, RuntimeError, ParseError, LexerError, stringify
} from '../setup/test-helper.js';

describe('Integration: Edge Cases', () => {
    let interp;

    beforeEach(() => {
        interp = createInterpreter();
    });

    describe('empty constructs', () => {
        it('empty begin returns void', () => {
            assert.strictEqual(interp.run('(begin)'), VOID);
        });

        it('empty list evaluates to NIL', () => {
            assert.strictEqual(interp.run('()'), NIL);
        });

        it('empty list in operations', () => {
            assert.strictEqual(interp.run("(length '())"), 0);
            assert.strictEqual(interp.run("(reverse '())"), NIL);
        });
    });

    describe('numeric edge cases', () => {
        it('handles zero correctly', () => {
            assert.strictEqual(interp.run('(+ 0 0)'), 0);
            assert.strictEqual(interp.run('(* 0 100)'), 0);
            assert.strictEqual(interp.run('(zero? 0)'), true);
        });

        it('handles negative numbers', () => {
            assert.strictEqual(interp.run('-42'), -42);
            assert.strictEqual(interp.run('(- -10)'), 10);
            assert.strictEqual(interp.run('(abs -42)'), 42);
        });

        it('handles floating point', () => {
            assert.strictEqual(interp.run('3.14'), 3.14);
            assert.strictEqual(interp.run('(integer? 3.0)'), true);
            assert.strictEqual(interp.run('(integer? 3.14)'), false);
        });
    });

    describe('list edge cases', () => {
        it('handles single element lists', () => {
            assert.strictEqual(stringify(interp.run("'(1)")), '(1)');
            assert.strictEqual(interp.run("(car '(42))"), 42);
            assert.strictEqual(interp.run("(cdr '(42))"), NIL);
        });

        it('handles dotted pairs', () => {
            assert.strictEqual(stringify(interp.run("'(a . b)")), '(a . b)');
            assert.strictEqual(interp.run("(pair? '(1 . 2))"), true);
            assert.strictEqual(interp.run("(list? '(1 . 2))"), false);
        });
    });

    describe('scope edge cases', () => {
        it('shadowing works correctly', () => {
            interp.run('(define x 1)');
            const result = interp.run('(let ((x 2)) (let ((x 3)) x))');
            assert.strictEqual(result, 3);
            assert.strictEqual(interp.run('x'), 1);
        });

        it('let bindings are parallel', () => {
            interp.run('(define a 1)');
            const result = interp.run('(let ((a 2) (b a)) b)');
            assert.strictEqual(result, 1);
        });

        it('let* bindings are sequential', () => {
            const result = interp.run('(let* ((a 2) (b a)) b)');
            assert.strictEqual(result, 2);
        });
    });

    describe('procedure edge cases', () => {
        it('procedures with no parameters', () => {
            interp.run('(define (f) 42)');
            assert.strictEqual(interp.run('(f)'), 42);
        });

        it('apply with empty list', () => {
            assert.strictEqual(interp.run("(apply + '())"), 0);
            assert.strictEqual(interp.run("(apply * '())"), 1);
        });

        it('procedure as return value', () => {
            interp.run('(define (f) +)');
            assert.strictEqual(interp.run('((f) 1 2 3)'), 6);
        });
    });

    describe('boolean edge cases', () => {
        it('only #f is falsy', () => {
            assert.strictEqual(interp.run('(if 0 1 2)'), 1);
            assert.strictEqual(interp.run('(if "" 1 2)'), 1);
            assert.strictEqual(interp.run("(if '() 1 2)"), 1);
            assert.strictEqual(interp.run('(if #f 1 2)'), 2);
        });

        it('and returns appropriate value', () => {
            assert.strictEqual(interp.run('(and)'), true);
            assert.strictEqual(interp.run('(and 1 2 3)'), 3);
            assert.strictEqual(interp.run('(and 1 #f 3)'), false);
        });

        it('or returns appropriate value', () => {
            assert.strictEqual(interp.run('(or)'), false);
            assert.strictEqual(interp.run('(or #f 2 3)'), 2);
            assert.strictEqual(interp.run('(or #f #f #f)'), false);
        });
    });

    describe('quote edge cases', () => {
        it('nested quotes', () => {
            const result = stringify(interp.run("''x"));
            assert.strictEqual(result, '(quote x)');
        });

        it('quoted special forms are data', () => {
            const result = interp.run("(car '(define x 1))");
            assert.strictEqual(result.name, 'define');
        });
    });

    describe('redefinition', () => {
        it('allows redefining variables', () => {
            interp.run('(define x 1)');
            interp.run('(define x 2)');
            assert.strictEqual(interp.run('x'), 2);
        });

        it('allows redefining functions', () => {
            interp.run('(define (f) 1)');
            interp.run('(define (f) 2)');
            assert.strictEqual(interp.run('(f)'), 2);
        });
    });

    describe('error handling', () => {
        it('undefined variable error', () => {
            expectError('undefined-var', RuntimeError, /[Uu]ndefined/);
        });

        it('type errors', () => {
            expectError('(car 1)', RuntimeError, /pair|list|type/i);
        });

        it('set! on undefined', () => {
            expectError('(set! nonexistent 1)', RuntimeError, /[Uu]ndefined|[Cc]annot set/);
        });

        it('syntax errors from parser', () => {
            expectParseError('(', /expect|paren/i);
            expectParseError(')', /[Uu]nexpected/);
        });

        it('lexer errors', () => {
            expectLexerError('"unterminated', /[Uu]nterminated/);
        });
    });

    describe('self-evaluation', () => {
        it('numbers self-evaluate', () => {
            assert.strictEqual(interp.run('42'), 42);
            assert.strictEqual(interp.run('-3.14'), -3.14);
        });

        it('strings self-evaluate', () => {
            assert.strictEqual(interp.run('"hello"'), 'hello');
        });

        it('booleans self-evaluate', () => {
            assert.strictEqual(interp.run('#t'), true);
            assert.strictEqual(interp.run('#f'), false);
        });
    });
});

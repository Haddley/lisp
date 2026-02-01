// Unit tests for the Parser

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    createInterpreter,
    Lexer, Parser,
    LiteralExpr, SymbolExpr, ListExpr, QuoteExpr, DottedPairExpr,
    expectParseError
} from '../setup/test-helper.js';

function parse(source) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
}

describe('Parser', () => {
    describe('parsing atoms', () => {
        it('parses number literals', () => {
            const exprs = parse('42');

            assert.strictEqual(exprs.length, 1);
            assert(exprs[0] instanceof LiteralExpr);
            assert.strictEqual(exprs[0].value, 42);
        });

        it('parses string literals', () => {
            const exprs = parse('"hello"');

            assert(exprs[0] instanceof LiteralExpr);
            assert.strictEqual(exprs[0].value, 'hello');
        });

        it('parses boolean literals', () => {
            const exprs = parse('#t #f');

            assert.strictEqual(exprs[0].value, true);
            assert.strictEqual(exprs[1].value, false);
        });

        it('parses symbols', () => {
            const exprs = parse('foo');

            assert(exprs[0] instanceof SymbolExpr);
            assert.strictEqual(exprs[0].name, 'foo');
        });

        it('preserves symbol position', () => {
            const exprs = parse('  foo');

            assert.strictEqual(exprs[0].column, 3);
        });
    });

    describe('parsing lists', () => {
        it('parses empty list', () => {
            const exprs = parse('()');

            assert(exprs[0] instanceof ListExpr);
            assert.strictEqual(exprs[0].elements.length, 0);
        });

        it('parses simple list', () => {
            const exprs = parse('(1 2 3)');

            assert(exprs[0] instanceof ListExpr);
            assert.strictEqual(exprs[0].elements.length, 3);
            assert.strictEqual(exprs[0].elements[0].value, 1);
            assert.strictEqual(exprs[0].elements[1].value, 2);
            assert.strictEqual(exprs[0].elements[2].value, 3);
        });

        it('parses nested lists', () => {
            const exprs = parse('((1 2) (3 4))');

            assert(exprs[0] instanceof ListExpr);
            assert.strictEqual(exprs[0].elements.length, 2);
            assert(exprs[0].elements[0] instanceof ListExpr);
            assert(exprs[0].elements[1] instanceof ListExpr);
        });

        it('parses bracket syntax', () => {
            const exprs = parse('[1 2 3]');

            assert(exprs[0] instanceof ListExpr);
            assert.strictEqual(exprs[0].elements.length, 3);
        });

        it('parses mixed lists', () => {
            const exprs = parse('(foo "bar" 42 #t)');

            assert(exprs[0].elements[0] instanceof SymbolExpr);
            assert(exprs[0].elements[1] instanceof LiteralExpr);
            assert.strictEqual(exprs[0].elements[1].value, 'bar');
        });

        it('preserves list position', () => {
            const exprs = parse('  (foo)');

            assert.strictEqual(exprs[0].column, 3);
        });
    });

    describe('parsing quote', () => {
        it('parses quote shorthand for symbol', () => {
            const exprs = parse("'foo");

            assert(exprs[0] instanceof QuoteExpr);
            assert(exprs[0].expression instanceof SymbolExpr);
            assert.strictEqual(exprs[0].expression.name, 'foo');
        });

        it('parses quote shorthand for list', () => {
            const exprs = parse("'(1 2 3)");

            assert(exprs[0] instanceof QuoteExpr);
            assert(exprs[0].expression instanceof ListExpr);
        });

        it('parses nested quotes', () => {
            const exprs = parse("''x");

            assert(exprs[0] instanceof QuoteExpr);
            assert(exprs[0].expression instanceof QuoteExpr);
        });
    });

    describe('parsing quasiquote', () => {
        it('parses quasiquote', () => {
            const exprs = parse('`x');

            assert(exprs[0] instanceof ListExpr);
            assert.strictEqual(exprs[0].elements[0].name, 'quasiquote');
        });

        it('parses unquote', () => {
            const exprs = parse(',x');

            assert(exprs[0] instanceof ListExpr);
            assert.strictEqual(exprs[0].elements[0].name, 'unquote');
        });

        it('parses unquote-splicing', () => {
            const exprs = parse(',@x');

            assert(exprs[0] instanceof ListExpr);
            assert.strictEqual(exprs[0].elements[0].name, 'unquote-splicing');
        });
    });

    describe('parsing dotted pairs', () => {
        it('parses simple dotted pair', () => {
            const exprs = parse('(a . b)');

            assert(exprs[0] instanceof DottedPairExpr);
            assert.strictEqual(exprs[0].car.name, 'a');
            assert.strictEqual(exprs[0].cdr.name, 'b');
        });

        it('parses list with dotted tail', () => {
            const exprs = parse('(1 2 . 3)');

            assert(exprs[0] instanceof DottedPairExpr);
            // Should be (1 . (2 . 3))
            assert.strictEqual(exprs[0].car.value, 1);
            assert(exprs[0].cdr instanceof DottedPairExpr);
        });

        it('parses multiple elements before dot', () => {
            const exprs = parse('(a b c . d)');

            // First element
            assert.strictEqual(exprs[0].car.name, 'a');
            // Rest is nested dotted pairs
            assert(exprs[0].cdr instanceof DottedPairExpr);
        });
    });

    describe('parsing multiple expressions', () => {
        it('parses multiple top-level expressions', () => {
            const exprs = parse('1 2 3');

            assert.strictEqual(exprs.length, 3);
        });

        it('parses multiple lists', () => {
            const exprs = parse('(a) (b) (c)');

            assert.strictEqual(exprs.length, 3);
        });
    });

    describe('error handling', () => {
        it('throws on unmatched right paren', () => {
            expectParseError(')', /[Uu]nexpected/);
        });

        it('throws on unmatched left paren', () => {
            expectParseError('(1 2', /[Ee]xpect.*\)/);
        });

        it('throws on dot at start of list', () => {
            expectParseError('(. a b)', /[Uu]nexpected.*dot/i);
        });

        it('includes position in error', () => {
            const err = expectParseError('(\n  ))', null);
            assert(err.line !== null);
        });
    });

    describe('complex expressions', () => {
        it('parses define with function shorthand', () => {
            const exprs = parse('(define (f x) x)');

            assert(exprs[0] instanceof ListExpr);
            assert.strictEqual(exprs[0].elements.length, 3);
            assert.strictEqual(exprs[0].elements[0].name, 'define');
            assert(exprs[0].elements[1] instanceof ListExpr);
        });

        it('parses lambda', () => {
            const exprs = parse('(lambda (x y) (+ x y))');

            assert(exprs[0] instanceof ListExpr);
            assert.strictEqual(exprs[0].elements[0].name, 'lambda');
        });

        it('parses if', () => {
            const exprs = parse('(if (> x 0) "positive" "non-positive")');

            assert.strictEqual(exprs[0].elements.length, 4);
        });

        it('parses let', () => {
            const exprs = parse('(let ((x 1) (y 2)) (+ x y))');

            assert.strictEqual(exprs[0].elements[0].name, 'let');
            assert(exprs[0].elements[1] instanceof ListExpr);
        });

        it('parses cond', () => {
            const exprs = parse('(cond ((< x 0) "neg") ((= x 0) "zero") (else "pos"))');

            assert.strictEqual(exprs[0].elements[0].name, 'cond');
            assert.strictEqual(exprs[0].elements.length, 4);
        });
    });
});

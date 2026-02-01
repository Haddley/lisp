// Unit tests for the Lexer

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    Lexer, TokenType, Token,
    LexerError, expectLexerError
} from '../setup/test-helper.js';

describe('Lexer', () => {
    describe('tokenizing numbers', () => {
        it('tokenizes positive integers', () => {
            const lexer = new Lexer('42');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens.length, 2); // NUMBER + EOF
            assert.strictEqual(tokens[0].type, TokenType.NUMBER);
            assert.strictEqual(tokens[0].literal, 42);
            assert.strictEqual(tokens[0].lexeme, '42');
        });

        it('tokenizes zero', () => {
            const lexer = new Lexer('0');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, 0);
        });

        it('tokenizes negative integers', () => {
            const lexer = new Lexer('-17');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.NUMBER);
            assert.strictEqual(tokens[0].literal, -17);
        });

        it('tokenizes floating point numbers', () => {
            const lexer = new Lexer('3.14');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.NUMBER);
            assert.strictEqual(tokens[0].literal, 3.14);
        });

        it('tokenizes numbers starting with dot', () => {
            const lexer = new Lexer('.5');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, 0.5);
        });

        it('tokenizes scientific notation', () => {
            const lexer = new Lexer('1e10');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, 1e10);
        });

        it('tokenizes scientific notation with negative exponent', () => {
            const lexer = new Lexer('2.5e-3');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, 2.5e-3);
        });

        it('tokenizes positive sign', () => {
            const lexer = new Lexer('+42');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, 42);
        });
    });

    describe('tokenizing strings', () => {
        it('tokenizes simple strings', () => {
            const lexer = new Lexer('"hello world"');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.STRING);
            assert.strictEqual(tokens[0].literal, 'hello world');
        });

        it('tokenizes empty strings', () => {
            const lexer = new Lexer('""');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, '');
        });

        it('handles newline escape', () => {
            const lexer = new Lexer('"line1\\nline2"');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, 'line1\nline2');
        });

        it('handles tab escape', () => {
            const lexer = new Lexer('"col1\\tcol2"');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, 'col1\tcol2');
        });

        it('handles backslash escape', () => {
            const lexer = new Lexer('"back\\\\slash"');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, 'back\\slash');
        });

        it('handles quote escape', () => {
            const lexer = new Lexer('"say \\"hello\\""');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, 'say "hello"');
        });

        it('throws on unterminated string', () => {
            const err = expectLexerError('"unterminated', /[Uu]nterminated/);
            assert.strictEqual(err.line, 1);
        });

        it('throws on invalid escape sequence', () => {
            expectLexerError('"bad\\z"', /[Ii]nvalid.*escape/);
        });
    });

    describe('tokenizing booleans', () => {
        it('tokenizes #t', () => {
            const lexer = new Lexer('#t');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.BOOLEAN);
            assert.strictEqual(tokens[0].literal, true);
        });

        it('tokenizes #f', () => {
            const lexer = new Lexer('#f');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, false);
        });

        it('tokenizes #true', () => {
            const lexer = new Lexer('#true');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, true);
        });

        it('tokenizes #false', () => {
            const lexer = new Lexer('#false');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, false);
        });

        it('is case insensitive', () => {
            const lexer = new Lexer('#T #F');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, true);
            assert.strictEqual(tokens[1].literal, false);
        });
    });

    describe('tokenizing symbols', () => {
        it('tokenizes simple symbols', () => {
            const lexer = new Lexer('foo');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.SYMBOL);
            assert.strictEqual(tokens[0].lexeme, 'foo');
        });

        it('tokenizes symbols with hyphens', () => {
            const lexer = new Lexer('foo-bar');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].lexeme, 'foo-bar');
        });

        it('tokenizes predicate symbols', () => {
            const lexer = new Lexer('null? pair?');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].lexeme, 'null?');
            assert.strictEqual(tokens[1].lexeme, 'pair?');
        });

        it('tokenizes mutation symbols', () => {
            const lexer = new Lexer('set! set-car!');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].lexeme, 'set!');
            assert.strictEqual(tokens[1].lexeme, 'set-car!');
        });

        it('tokenizes special symbols', () => {
            const lexer = new Lexer('*global* <=>');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].lexeme, '*global*');
            assert.strictEqual(tokens[1].lexeme, '<=>');
        });

        it('tokenizes standalone + and -', () => {
            const lexer = new Lexer('+ -');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.SYMBOL);
            assert.strictEqual(tokens[0].lexeme, '+');
            assert.strictEqual(tokens[1].lexeme, '-');
        });
    });

    describe('tokenizing delimiters', () => {
        it('tokenizes parentheses', () => {
            const lexer = new Lexer('()');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.LEFT_PAREN);
            assert.strictEqual(tokens[1].type, TokenType.RIGHT_PAREN);
        });

        it('tokenizes brackets', () => {
            const lexer = new Lexer('[]');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.LEFT_BRACKET);
            assert.strictEqual(tokens[1].type, TokenType.RIGHT_BRACKET);
        });
    });

    describe('tokenizing quote forms', () => {
        it('tokenizes quote', () => {
            const lexer = new Lexer("'x");
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.QUOTE);
        });

        it('tokenizes quasiquote', () => {
            const lexer = new Lexer('`x');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.QUASIQUOTE);
        });

        it('tokenizes unquote', () => {
            const lexer = new Lexer(',x');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.UNQUOTE);
        });

        it('tokenizes unquote-splicing', () => {
            const lexer = new Lexer(',@x');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.UNQUOTE_SPLICING);
        });
    });

    describe('tokenizing dot', () => {
        it('tokenizes standalone dot', () => {
            const lexer = new Lexer('(a . b)');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[2].type, TokenType.DOT);
        });

        it('distinguishes dot from number', () => {
            const lexer = new Lexer('.5 . .foo');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.NUMBER);
            assert.strictEqual(tokens[1].type, TokenType.DOT);
            assert.strictEqual(tokens[2].type, TokenType.SYMBOL);
        });
    });

    describe('tokenizing character literals', () => {
        it('tokenizes single character', () => {
            const lexer = new Lexer('#\\a');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].type, TokenType.STRING);
            assert.strictEqual(tokens[0].literal, 'a');
        });

        it('tokenizes newline character', () => {
            const lexer = new Lexer('#\\newline');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, '\n');
        });

        it('tokenizes space character', () => {
            const lexer = new Lexer('#\\space');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, ' ');
        });

        it('tokenizes tab character', () => {
            const lexer = new Lexer('#\\tab');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].literal, '\t');
        });
    });

    describe('comments', () => {
        it('skips single-line comments', () => {
            const lexer = new Lexer('foo ; this is a comment\nbar');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens.length, 3); // foo, bar, EOF
            assert.strictEqual(tokens[0].lexeme, 'foo');
            assert.strictEqual(tokens[1].lexeme, 'bar');
        });

        it('handles comment at end of input', () => {
            const lexer = new Lexer('foo ; comment');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens.length, 2); // foo, EOF
        });
    });

    describe('whitespace handling', () => {
        it('skips spaces', () => {
            const lexer = new Lexer('a   b');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens.length, 3);
        });

        it('skips tabs', () => {
            const lexer = new Lexer('a\tb');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens.length, 3);
        });

        it('handles newlines', () => {
            const lexer = new Lexer('a\nb');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens.length, 3);
        });
    });

    describe('line and column tracking', () => {
        it('tracks column in first line', () => {
            const lexer = new Lexer('foo bar');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].column, 1);
            assert.strictEqual(tokens[1].column, 5);
        });

        it('tracks line numbers', () => {
            const lexer = new Lexer('foo\nbar\nbaz');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[0].line, 1);
            assert.strictEqual(tokens[1].line, 2);
            assert.strictEqual(tokens[2].line, 3);
        });

        it('resets column after newline', () => {
            const lexer = new Lexer('foo\n  bar');
            const tokens = lexer.tokenize();

            assert.strictEqual(tokens[1].line, 2);
            assert.strictEqual(tokens[1].column, 3);
        });
    });

    describe('error handling', () => {
        it('throws on unexpected character', () => {
            expectLexerError('@invalid', /[Uu]nexpected/);
        });

        it('throws on unknown hash literal', () => {
            expectLexerError('#x', /[Uu]nknown.*hash/);
        });
    });

    describe('complex tokenization', () => {
        it('tokenizes a complete expression', () => {
            const lexer = new Lexer('(define (square x) (* x x))');
            const tokens = lexer.tokenize();

            // Check token count (excluding EOF)
            const tokenTypes = tokens.slice(0, -1).map(t => t.type);
            assert.deepStrictEqual(tokenTypes, [
                TokenType.LEFT_PAREN,
                TokenType.SYMBOL,      // define
                TokenType.LEFT_PAREN,
                TokenType.SYMBOL,      // square
                TokenType.SYMBOL,      // x
                TokenType.RIGHT_PAREN,
                TokenType.LEFT_PAREN,
                TokenType.SYMBOL,      // *
                TokenType.SYMBOL,      // x
                TokenType.SYMBOL,      // x
                TokenType.RIGHT_PAREN,
                TokenType.RIGHT_PAREN
            ]);
        });
    });
});

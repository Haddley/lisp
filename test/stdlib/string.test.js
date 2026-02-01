// Unit tests for String Standard Library

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    createInterpreter, stringify
} from '../setup/test-helper.js';

describe('String Standard Library', () => {
    let interp;

    beforeEach(() => {
        interp = createInterpreter();
    });

    describe('string-length', () => {
        it('returns length of string', () => {
            assert.strictEqual(interp.run('(string-length "hello")'), 5);
        });

        it('returns 0 for empty string', () => {
            assert.strictEqual(interp.run('(string-length "")'), 0);
        });
    });

    describe('substring', () => {
        it('extracts substring with start and end', () => {
            assert.strictEqual(interp.run('(substring "hello world" 0 5)'), 'hello');
        });

        it('extracts to end if end not specified', () => {
            assert.strictEqual(interp.run('(substring "hello world" 6)'), 'world');
        });
    });

    describe('string-append', () => {
        it('concatenates strings', () => {
            assert.strictEqual(interp.run('(string-append "hello" " " "world")'), 'hello world');
        });

        it('returns empty string with no args', () => {
            assert.strictEqual(interp.run('(string-append)'), '');
        });
    });

    describe('string-split', () => {
        it('splits string by delimiter', () => {
            assert.strictEqual(stringify(interp.run('(string-split "a,b,c" ",")')), '("a" "b" "c")');
        });
    });

    describe('string-join', () => {
        it('joins list of strings', () => {
            assert.strictEqual(interp.run('(string-join \'("a" "b" "c") ",")'), 'a,b,c');
        });
    });

    describe('string-upcase / string-downcase', () => {
        it('converts to uppercase', () => {
            assert.strictEqual(interp.run('(string-upcase "Hello")'), 'HELLO');
        });

        it('converts to lowercase', () => {
            assert.strictEqual(interp.run('(string-downcase "Hello")'), 'hello');
        });
    });

    describe('string-trim', () => {
        it('trims whitespace from both ends', () => {
            assert.strictEqual(interp.run('(string-trim "  hello  ")'), 'hello');
        });
    });

    describe('string-contains', () => {
        it('returns index if substring found', () => {
            // string-contains returns the index, not a boolean
            assert.strictEqual(interp.run('(string-contains "hello world" "wor")'), 6);
        });

        it('returns false if not found', () => {
            assert.strictEqual(interp.run('(string-contains "hello" "xyz")'), false);
        });
    });

    describe('string comparison', () => {
        it('string=? checks equality', () => {
            assert.strictEqual(interp.run('(string=? "hello" "hello")'), true);
            assert.strictEqual(interp.run('(string=? "hello" "Hello")'), false);
        });

        it('string<? checks ordering', () => {
            assert.strictEqual(interp.run('(string<? "abc" "abd")'), true);
        });
    });

    describe('string-reverse', () => {
        it('reverses string', () => {
            assert.strictEqual(interp.run('(string-reverse "hello")'), 'olleh');
        });
    });

    describe('format', () => {
        it('formats with ~a (display)', () => {
            assert.strictEqual(interp.run('(format "Hello ~a!" "world")'), 'Hello world!');
        });

        it('formats with multiple arguments', () => {
            assert.strictEqual(interp.run('(format "~a + ~a = ~a" 1 2 3)'), '1 + 2 = 3');
        });
    });
});

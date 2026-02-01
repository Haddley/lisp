// Unit tests for Types

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    NIL, VOID, UNDEFINED,
    LispSymbol, Pair, Procedure, NativeProcedure,
    intern, resetSymbolTable,
    isNil, isPair, isList, isSymbol, isNumber, isString, isBoolean, isProcedure,
    arrayToList, listToArray, listLength,
    deepEqual, stringify, display,
    Environment
} from '../setup/test-helper.js';

describe('Types', () => {
    beforeEach(() => {
        resetSymbolTable();
    });

    describe('NIL', () => {
        it('has type nil', () => {
            assert.strictEqual(NIL.type, 'nil');
        });

        it('stringifies to ()', () => {
            assert.strictEqual(NIL.toString(), '()');
        });

        it('isNil returns true', () => {
            assert.strictEqual(isNil(NIL), true);
        });

        it('isNil returns false for other values', () => {
            assert.strictEqual(isNil(null), false);
            assert.strictEqual(isNil(undefined), false);
            assert.strictEqual(isNil(0), false);
        });
    });

    describe('VOID', () => {
        it('has type void', () => {
            assert.strictEqual(VOID.type, 'void');
        });

        it('stringifies to empty string', () => {
            assert.strictEqual(VOID.toString(), '');
        });
    });

    describe('UNDEFINED', () => {
        it('has type undefined', () => {
            assert.strictEqual(UNDEFINED.type, 'undefined');
        });

        it('stringifies to #<undefined>', () => {
            assert.strictEqual(UNDEFINED.toString(), '#<undefined>');
        });
    });

    describe('LispSymbol', () => {
        it('stores name', () => {
            const sym = new LispSymbol('foo');
            assert.strictEqual(sym.name, 'foo');
        });

        it('stringifies to name', () => {
            const sym = new LispSymbol('bar');
            assert.strictEqual(sym.toString(), 'bar');
        });

        it('equals compares names', () => {
            const sym1 = new LispSymbol('foo');
            const sym2 = new LispSymbol('foo');
            const sym3 = new LispSymbol('bar');

            assert.strictEqual(sym1.equals(sym2), true);
            assert.strictEqual(sym1.equals(sym3), false);
        });
    });

    describe('intern', () => {
        it('returns same object for same name', () => {
            const sym1 = intern('foo');
            const sym2 = intern('foo');

            assert.strictEqual(sym1, sym2);
        });

        it('returns different objects for different names', () => {
            const sym1 = intern('foo');
            const sym2 = intern('bar');

            assert.notStrictEqual(sym1, sym2);
        });

        it('creates LispSymbol', () => {
            const sym = intern('baz');
            assert(sym instanceof LispSymbol);
        });
    });

    describe('Pair', () => {
        it('stores car and cdr', () => {
            const pair = new Pair(1, 2);
            assert.strictEqual(pair.car, 1);
            assert.strictEqual(pair.cdr, 2);
        });

        it('stringifies dotted pair', () => {
            const pair = new Pair(1, 2);
            assert.strictEqual(pair.toString(), '(1 . 2)');
        });

        it('stringifies proper list', () => {
            const list = new Pair(1, new Pair(2, new Pair(3, NIL)));
            assert.strictEqual(list.toString(), '(1 2 3)');
        });

        it('stringifies improper list', () => {
            const list = new Pair(1, new Pair(2, 3));
            assert.strictEqual(list.toString(), '(1 2 . 3)');
        });

        it('stringifies single element list', () => {
            const list = new Pair(1, NIL);
            assert.strictEqual(list.toString(), '(1)');
        });
    });

    describe('Procedure', () => {
        it('stores params, body, and closure', () => {
            const env = new Environment();
            const proc = new Procedure(['x', 'y'], ['body'], env, 'test');

            assert.deepStrictEqual(proc.params, ['x', 'y']);
            assert.strictEqual(proc.closure, env);
            assert.strictEqual(proc.name, 'test');
        });

        it('stringifies with name', () => {
            const env = new Environment();
            const proc = new Procedure([], [], env, 'myFunc');

            assert.strictEqual(proc.toString(), '#<procedure:myFunc>');
        });

        it('stringifies without name', () => {
            const env = new Environment();
            const proc = new Procedure([], [], env);

            assert.strictEqual(proc.toString(), '#<procedure>');
        });
    });

    describe('NativeProcedure', () => {
        it('stores function and name', () => {
            const func = (args) => args[0] + args[1];
            const proc = new NativeProcedure(func, 'add', 2);

            assert.strictEqual(proc.name, 'add');
            assert.strictEqual(proc.arity, 2);
        });

        it('stringifies with name', () => {
            const proc = new NativeProcedure(() => {}, 'myNative');
            assert.strictEqual(proc.toString(), '#<native:myNative>');
        });
    });

    describe('type predicates', () => {
        it('isPair identifies pairs', () => {
            assert.strictEqual(isPair(new Pair(1, 2)), true);
            assert.strictEqual(isPair(NIL), false);
            assert.strictEqual(isPair([1, 2]), false);
        });

        it('isList identifies proper lists', () => {
            assert.strictEqual(isList(NIL), true);
            assert.strictEqual(isList(new Pair(1, NIL)), true);
            assert.strictEqual(isList(new Pair(1, new Pair(2, NIL))), true);
            assert.strictEqual(isList(new Pair(1, 2)), false);
        });

        it('isSymbol identifies symbols', () => {
            assert.strictEqual(isSymbol(intern('foo')), true);
            assert.strictEqual(isSymbol('foo'), false);
        });

        it('isNumber identifies numbers', () => {
            assert.strictEqual(isNumber(42), true);
            assert.strictEqual(isNumber(3.14), true);
            assert.strictEqual(isNumber('42'), false);
        });

        it('isString identifies strings', () => {
            assert.strictEqual(isString('hello'), true);
            assert.strictEqual(isString(42), false);
        });

        it('isBoolean identifies booleans', () => {
            assert.strictEqual(isBoolean(true), true);
            assert.strictEqual(isBoolean(false), true);
            assert.strictEqual(isBoolean(1), false);
        });

        it('isProcedure identifies procedures', () => {
            const env = new Environment();
            assert.strictEqual(isProcedure(new Procedure([], [], env)), true);
            assert.strictEqual(isProcedure(new NativeProcedure(() => {}, 'f')), true);
            assert.strictEqual(isProcedure(() => {}), false);
        });
    });

    describe('arrayToList', () => {
        it('converts empty array to NIL', () => {
            assert.strictEqual(arrayToList([]), NIL);
        });

        it('converts single element array', () => {
            const list = arrayToList([1]);
            assert(list instanceof Pair);
            assert.strictEqual(list.car, 1);
            assert.strictEqual(list.cdr, NIL);
        });

        it('converts multiple element array', () => {
            const list = arrayToList([1, 2, 3]);
            assert.strictEqual(list.car, 1);
            assert.strictEqual(list.cdr.car, 2);
            assert.strictEqual(list.cdr.cdr.car, 3);
            assert.strictEqual(list.cdr.cdr.cdr, NIL);
        });
    });

    describe('listToArray', () => {
        it('converts NIL to empty array', () => {
            assert.deepStrictEqual(listToArray(NIL), []);
        });

        it('converts single element list', () => {
            const list = new Pair(1, NIL);
            assert.deepStrictEqual(listToArray(list), [1]);
        });

        it('converts multiple element list', () => {
            const list = new Pair(1, new Pair(2, new Pair(3, NIL)));
            assert.deepStrictEqual(listToArray(list), [1, 2, 3]);
        });

        it('throws on improper list', () => {
            const improper = new Pair(1, 2);
            assert.throws(() => listToArray(improper), /[Nn]ot a proper list/);
        });
    });

    describe('listLength', () => {
        it('returns 0 for NIL', () => {
            assert.strictEqual(listLength(NIL), 0);
        });

        it('returns correct length', () => {
            const list = arrayToList([1, 2, 3, 4, 5]);
            assert.strictEqual(listLength(list), 5);
        });
    });

    describe('deepEqual', () => {
        it('compares identical values', () => {
            assert.strictEqual(deepEqual(42, 42), true);
            assert.strictEqual(deepEqual('a', 'a'), true);
        });

        it('compares different values', () => {
            assert.strictEqual(deepEqual(1, 2), false);
            assert.strictEqual(deepEqual('a', 'b'), false);
        });

        it('compares symbols', () => {
            const sym1 = intern('foo');
            const sym2 = intern('foo');
            const sym3 = intern('bar');

            assert.strictEqual(deepEqual(sym1, sym2), true);
            assert.strictEqual(deepEqual(sym1, sym3), false);
        });

        it('compares NIL', () => {
            assert.strictEqual(deepEqual(NIL, NIL), true);
        });

        it('compares pairs recursively', () => {
            const pair1 = new Pair(1, new Pair(2, NIL));
            const pair2 = new Pair(1, new Pair(2, NIL));
            const pair3 = new Pair(1, new Pair(3, NIL));

            assert.strictEqual(deepEqual(pair1, pair2), true);
            assert.strictEqual(deepEqual(pair1, pair3), false);
        });

        it('compares nested structures', () => {
            const list1 = arrayToList([arrayToList([1, 2]), arrayToList([3, 4])]);
            const list2 = arrayToList([arrayToList([1, 2]), arrayToList([3, 4])]);

            assert.strictEqual(deepEqual(list1, list2), true);
        });
    });

    describe('stringify', () => {
        it('stringifies NIL', () => {
            assert.strictEqual(stringify(NIL), '()');
        });

        it('stringifies VOID to empty string', () => {
            assert.strictEqual(stringify(VOID), '');
        });

        it('stringifies booleans', () => {
            assert.strictEqual(stringify(true), '#t');
            assert.strictEqual(stringify(false), '#f');
        });

        it('stringifies numbers', () => {
            assert.strictEqual(stringify(42), '42');
            assert.strictEqual(stringify(3.14), '3.14');
        });

        it('stringifies strings with quotes', () => {
            assert.strictEqual(stringify('hello'), '"hello"');
        });

        it('escapes quotes in strings', () => {
            assert.strictEqual(stringify('say "hi"'), '"say \\"hi\\""');
        });

        it('stringifies symbols', () => {
            assert.strictEqual(stringify(intern('foo')), 'foo');
        });

        it('stringifies lists', () => {
            const list = arrayToList([1, 2, 3]);
            assert.strictEqual(stringify(list), '(1 2 3)');
        });
    });

    describe('display', () => {
        it('returns strings without quotes', () => {
            assert.strictEqual(display('hello'), 'hello');
        });

        it('uses stringify for non-strings', () => {
            assert.strictEqual(display(42), '42');
            assert.strictEqual(display(true), '#t');
        });
    });
});

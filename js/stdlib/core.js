// Core built-in functions for the LISP interpreter

import { RuntimeError } from '../interpreter/errors.js';
import {
    NIL, VOID, UNDEFINED,
    LispSymbol, Pair, NativeProcedure,
    intern, isNil, isPair, isList, isSymbol, isNumber, isString, isBoolean, isProcedure,
    arrayToList, listToArray, listLength, deepEqual, stringify, display
} from '../interpreter/types.js';
import { Environment } from '../interpreter/environment.js';

function createGlobalEnvironment() {
    const env = new Environment();

    // Arithmetic operations
    env.define('+', new NativeProcedure(
        (args) => args.reduce((a, b) => a + b, 0),
        '+', null
    ));

    env.define('-', new NativeProcedure(
        (args) => {
            if (args.length === 0) throw new RuntimeError('- requires at least 1 argument');
            if (args.length === 1) return -args[0];
            return args.reduce((a, b) => a - b);
        },
        '-', null
    ));

    env.define('*', new NativeProcedure(
        (args) => args.reduce((a, b) => a * b, 1),
        '*', null
    ));

    env.define('/', new NativeProcedure(
        (args) => {
            if (args.length === 0) throw new RuntimeError('/ requires at least 1 argument');
            if (args.length === 1) return 1 / args[0];
            return args.reduce((a, b) => a / b);
        },
        '/', null
    ));

    env.define('modulo', new NativeProcedure(
        (args) => ((args[0] % args[1]) + args[1]) % args[1],
        'modulo', 2
    ));

    env.define('remainder', new NativeProcedure(
        (args) => args[0] % args[1],
        'remainder', 2
    ));

    env.define('quotient', new NativeProcedure(
        (args) => Math.trunc(args[0] / args[1]),
        'quotient', 2
    ));

    env.define('abs', new NativeProcedure(
        (args) => Math.abs(args[0]),
        'abs', 1
    ));

    env.define('floor', new NativeProcedure(
        (args) => Math.floor(args[0]),
        'floor', 1
    ));

    env.define('ceiling', new NativeProcedure(
        (args) => Math.ceil(args[0]),
        'ceiling', 1
    ));

    env.define('round', new NativeProcedure(
        (args) => Math.round(args[0]),
        'round', 1
    ));

    env.define('truncate', new NativeProcedure(
        (args) => Math.trunc(args[0]),
        'truncate', 1
    ));

    env.define('sqrt', new NativeProcedure(
        (args) => Math.sqrt(args[0]),
        'sqrt', 1
    ));

    env.define('expt', new NativeProcedure(
        (args) => Math.pow(args[0], args[1]),
        'expt', 2
    ));

    env.define('log', new NativeProcedure(
        (args) => args.length === 1 ? Math.log(args[0]) : Math.log(args[0]) / Math.log(args[1]),
        'log', null
    ));

    env.define('exp', new NativeProcedure(
        (args) => Math.exp(args[0]),
        'exp', 1
    ));

    env.define('sin', new NativeProcedure(
        (args) => Math.sin(args[0]),
        'sin', 1
    ));

    env.define('cos', new NativeProcedure(
        (args) => Math.cos(args[0]),
        'cos', 1
    ));

    env.define('tan', new NativeProcedure(
        (args) => Math.tan(args[0]),
        'tan', 1
    ));

    env.define('asin', new NativeProcedure(
        (args) => Math.asin(args[0]),
        'asin', 1
    ));

    env.define('acos', new NativeProcedure(
        (args) => Math.acos(args[0]),
        'acos', 1
    ));

    env.define('atan', new NativeProcedure(
        (args) => args.length === 1 ? Math.atan(args[0]) : Math.atan2(args[0], args[1]),
        'atan', null
    ));

    env.define('min', new NativeProcedure(
        (args) => Math.min(...args),
        'min', null
    ));

    env.define('max', new NativeProcedure(
        (args) => Math.max(...args),
        'max', null
    ));

    env.define('random', new NativeProcedure(
        (args) => {
            if (args.length === 0) return Math.random();
            return Math.floor(Math.random() * args[0]);
        },
        'random', null
    ));

    // Comparison operations
    env.define('=', new NativeProcedure(
        (args) => {
            for (let i = 1; i < args.length; i++) {
                if (args[i - 1] !== args[i]) return false;
            }
            return true;
        },
        '=', null
    ));

    env.define('<', new NativeProcedure(
        (args) => {
            for (let i = 1; i < args.length; i++) {
                if (args[i - 1] >= args[i]) return false;
            }
            return true;
        },
        '<', null
    ));

    env.define('>', new NativeProcedure(
        (args) => {
            for (let i = 1; i < args.length; i++) {
                if (args[i - 1] <= args[i]) return false;
            }
            return true;
        },
        '>', null
    ));

    env.define('<=', new NativeProcedure(
        (args) => {
            for (let i = 1; i < args.length; i++) {
                if (args[i - 1] > args[i]) return false;
            }
            return true;
        },
        '<=', null
    ));

    env.define('>=', new NativeProcedure(
        (args) => {
            for (let i = 1; i < args.length; i++) {
                if (args[i - 1] < args[i]) return false;
            }
            return true;
        },
        '>=', null
    ));

    // Equality
    env.define('eq?', new NativeProcedure(
        (args) => args[0] === args[1],
        'eq?', 2
    ));

    env.define('eqv?', new NativeProcedure(
        (args) => {
            const a = args[0], b = args[1];
            if (a instanceof LispSymbol && b instanceof LispSymbol) return a.equals(b);
            return a === b;
        },
        'eqv?', 2
    ));

    env.define('equal?', new NativeProcedure(
        (args) => deepEqual(args[0], args[1]),
        'equal?', 2
    ));

    // Type predicates
    env.define('null?', new NativeProcedure(
        (args) => isNil(args[0]),
        'null?', 1
    ));

    env.define('pair?', new NativeProcedure(
        (args) => isPair(args[0]),
        'pair?', 1
    ));

    env.define('list?', new NativeProcedure(
        (args) => isList(args[0]),
        'list?', 1
    ));

    env.define('symbol?', new NativeProcedure(
        (args) => isSymbol(args[0]),
        'symbol?', 1
    ));

    env.define('number?', new NativeProcedure(
        (args) => isNumber(args[0]),
        'number?', 1
    ));

    env.define('string?', new NativeProcedure(
        (args) => isString(args[0]),
        'string?', 1
    ));

    env.define('boolean?', new NativeProcedure(
        (args) => isBoolean(args[0]),
        'boolean?', 1
    ));

    env.define('procedure?', new NativeProcedure(
        (args) => isProcedure(args[0]),
        'procedure?', 1
    ));

    env.define('integer?', new NativeProcedure(
        (args) => Number.isInteger(args[0]),
        'integer?', 1
    ));

    env.define('real?', new NativeProcedure(
        (args) => isNumber(args[0]),
        'real?', 1
    ));

    env.define('positive?', new NativeProcedure(
        (args) => args[0] > 0,
        'positive?', 1
    ));

    env.define('negative?', new NativeProcedure(
        (args) => args[0] < 0,
        'negative?', 1
    ));

    env.define('zero?', new NativeProcedure(
        (args) => args[0] === 0,
        'zero?', 1
    ));

    env.define('even?', new NativeProcedure(
        (args) => args[0] % 2 === 0,
        'even?', 1
    ));

    env.define('odd?', new NativeProcedure(
        (args) => args[0] % 2 !== 0,
        'odd?', 1
    ));

    // List operations
    env.define('cons', new NativeProcedure(
        (args) => new Pair(args[0], args[1]),
        'cons', 2
    ));

    env.define('car', new NativeProcedure(
        (args) => {
            if (!isPair(args[0])) throw new RuntimeError('car: not a pair');
            return args[0].car;
        },
        'car', 1
    ));

    env.define('cdr', new NativeProcedure(
        (args) => {
            if (!isPair(args[0])) throw new RuntimeError('cdr: not a pair');
            return args[0].cdr;
        },
        'cdr', 1
    ));

    // Convenience accessors
    env.define('caar', new NativeProcedure(
        (args) => args[0].car.car,
        'caar', 1
    ));

    env.define('cadr', new NativeProcedure(
        (args) => args[0].cdr.car,
        'cadr', 1
    ));

    env.define('cdar', new NativeProcedure(
        (args) => args[0].car.cdr,
        'cdar', 1
    ));

    env.define('cddr', new NativeProcedure(
        (args) => args[0].cdr.cdr,
        'cddr', 1
    ));

    env.define('caaar', new NativeProcedure(
        (args) => args[0].car.car.car,
        'caaar', 1
    ));

    env.define('caadr', new NativeProcedure(
        (args) => args[0].cdr.car.car,
        'caadr', 1
    ));

    env.define('cadar', new NativeProcedure(
        (args) => args[0].car.cdr.car,
        'cadar', 1
    ));

    env.define('caddr', new NativeProcedure(
        (args) => args[0].cdr.cdr.car,
        'caddr', 1
    ));

    env.define('cdaar', new NativeProcedure(
        (args) => args[0].car.car.cdr,
        'cdaar', 1
    ));

    env.define('cdadr', new NativeProcedure(
        (args) => args[0].cdr.car.cdr,
        'cdadr', 1
    ));

    env.define('cddar', new NativeProcedure(
        (args) => args[0].car.cdr.cdr,
        'cddar', 1
    ));

    env.define('cdddr', new NativeProcedure(
        (args) => args[0].cdr.cdr.cdr,
        'cdddr', 1
    ));

    env.define('set-car!', new NativeProcedure(
        (args) => {
            if (!isPair(args[0])) throw new RuntimeError('set-car!: not a pair');
            args[0].car = args[1];
            return VOID;
        },
        'set-car!', 2
    ));

    env.define('set-cdr!', new NativeProcedure(
        (args) => {
            if (!isPair(args[0])) throw new RuntimeError('set-cdr!: not a pair');
            args[0].cdr = args[1];
            return VOID;
        },
        'set-cdr!', 2
    ));

    env.define('list', new NativeProcedure(
        (args) => arrayToList(args),
        'list', null
    ));

    env.define('length', new NativeProcedure(
        (args) => listLength(args[0]),
        'length', 1
    ));

    env.define('append', new NativeProcedure(
        (args) => {
            if (args.length === 0) return NIL;
            const arrays = [];
            for (let i = 0; i < args.length - 1; i++) {
                arrays.push(...listToArray(args[i]));
            }
            const last = args[args.length - 1];
            if (arrays.length === 0) return last;
            let tail = last;
            for (let i = arrays.length - 1; i >= 0; i--) {
                tail = new Pair(arrays[i], tail);
            }
            return tail;
        },
        'append', null
    ));

    env.define('reverse', new NativeProcedure(
        (args) => arrayToList(listToArray(args[0]).reverse()),
        'reverse', 1
    ));

    env.define('list-ref', new NativeProcedure(
        (args) => {
            const arr = listToArray(args[0]);
            const n = args[1];
            if (n < 0 || n >= arr.length) throw new RuntimeError('list-ref: index out of bounds');
            return arr[n];
        },
        'list-ref', 2
    ));

    env.define('list-tail', new NativeProcedure(
        (args) => {
            let current = args[0];
            const n = args[1];
            for (let i = 0; i < n; i++) {
                if (!isPair(current)) throw new RuntimeError('list-tail: list too short');
                current = current.cdr;
            }
            return current;
        },
        'list-tail', 2
    ));

    env.define('member', new NativeProcedure(
        (args) => {
            let current = args[1];
            while (isPair(current)) {
                if (deepEqual(current.car, args[0])) return current;
                current = current.cdr;
            }
            return false;
        },
        'member', 2
    ));

    env.define('memq', new NativeProcedure(
        (args) => {
            let current = args[1];
            while (isPair(current)) {
                if (current.car === args[0]) return current;
                current = current.cdr;
            }
            return false;
        },
        'memq', 2
    ));

    env.define('memv', new NativeProcedure(
        (args) => {
            let current = args[1];
            const item = args[0];
            while (isPair(current)) {
                const v = current.car;
                if (item === v || (item instanceof LispSymbol && v instanceof LispSymbol && item.equals(v))) {
                    return current;
                }
                current = current.cdr;
            }
            return false;
        },
        'memv', 2
    ));

    env.define('assoc', new NativeProcedure(
        (args) => {
            let current = args[1];
            while (isPair(current)) {
                if (isPair(current.car) && deepEqual(current.car.car, args[0])) {
                    return current.car;
                }
                current = current.cdr;
            }
            return false;
        },
        'assoc', 2
    ));

    env.define('assq', new NativeProcedure(
        (args) => {
            let current = args[1];
            while (isPair(current)) {
                if (isPair(current.car) && current.car.car === args[0]) {
                    return current.car;
                }
                current = current.cdr;
            }
            return false;
        },
        'assq', 2
    ));

    env.define('assv', new NativeProcedure(
        (args) => {
            let current = args[1];
            const key = args[0];
            while (isPair(current)) {
                if (isPair(current.car)) {
                    const k = current.car.car;
                    if (key === k || (key instanceof LispSymbol && k instanceof LispSymbol && key.equals(k))) {
                        return current.car;
                    }
                }
                current = current.cdr;
            }
            return false;
        },
        'assv', 2
    ));

    // Boolean operations
    env.define('not', new NativeProcedure(
        (args) => args[0] === false,
        'not', 1
    ));

    // Conversions
    env.define('number->string', new NativeProcedure(
        (args) => {
            const radix = args.length > 1 ? args[1] : 10;
            return args[0].toString(radix);
        },
        'number->string', null
    ));

    env.define('string->number', new NativeProcedure(
        (args) => {
            const radix = args.length > 1 ? args[1] : 10;
            const n = parseInt(args[0], radix);
            return isNaN(n) ? false : n;
        },
        'string->number', null
    ));

    env.define('symbol->string', new NativeProcedure(
        (args) => {
            if (!isSymbol(args[0])) throw new RuntimeError('symbol->string: not a symbol');
            return args[0].name;
        },
        'symbol->string', 1
    ));

    env.define('string->symbol', new NativeProcedure(
        (args) => {
            if (!isString(args[0])) throw new RuntimeError('string->symbol: not a string');
            return intern(args[0]);
        },
        'string->symbol', 1
    ));

    env.define('list->string', new NativeProcedure(
        (args) => listToArray(args[0]).join(''),
        'list->string', 1
    ));

    env.define('string->list', new NativeProcedure(
        (args) => arrayToList([...args[0]]),
        'string->list', 1
    ));

    env.define('list->vector', new NativeProcedure(
        (args) => listToArray(args[0]),
        'list->vector', 1
    ));

    env.define('vector->list', new NativeProcedure(
        (args) => arrayToList(args[0]),
        'vector->list', 1
    ));

    // Apply and error
    env.define('apply', new NativeProcedure(
        (args, evaluator) => {
            if (args.length < 2) throw new RuntimeError('apply requires at least 2 arguments');
            const proc = args[0];
            const lastArg = args[args.length - 1];
            const leadingArgs = args.slice(1, -1);
            const allArgs = [...leadingArgs, ...listToArray(lastArg)];
            return evaluator.callProcedure(proc, allArgs);
        },
        'apply', null
    ));

    env.define('error', new NativeProcedure(
        (args) => {
            throw new RuntimeError(args.map(a => isString(a) ? a : stringify(a)).join(' '));
        },
        'error', null
    ));

    // Void
    env.define('void', new NativeProcedure(
        () => VOID,
        'void', 0
    ));

    return env;
}

// ES Module exports
export { createGlobalEnvironment };

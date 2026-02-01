// Higher-order list functions for the LISP interpreter

import { RuntimeError } from '../interpreter/errors.js';
import {
    NIL, VOID,
    Pair, NativeProcedure,
    isNil, isPair, isList,
    arrayToList, listToArray, listLength
} from '../interpreter/types.js';

function installListFunctions(env) {
    // map: (map f list) or (map f list1 list2 ...)
    env.define('map', new NativeProcedure(
        (args, evaluator) => {
            if (args.length < 2) throw new RuntimeError('map requires a procedure and at least one list');
            const proc = args[0];
            const lists = args.slice(1);

            if (lists.length === 0) return NIL;

            const arrays = lists.map(listToArray);
            const len = Math.min(...arrays.map(a => a.length));
            const result = [];

            for (let i = 0; i < len; i++) {
                const callArgs = arrays.map(a => a[i]);
                result.push(evaluator.callProcedure(proc, callArgs));
            }

            return arrayToList(result);
        },
        'map', null
    ));

    // for-each: (for-each f list) - like map but for side effects
    env.define('for-each', new NativeProcedure(
        (args, evaluator) => {
            if (args.length < 2) throw new RuntimeError('for-each requires a procedure and at least one list');
            const proc = args[0];
            const lists = args.slice(1);

            if (lists.length === 0) return VOID;

            const arrays = lists.map(listToArray);
            const len = Math.min(...arrays.map(a => a.length));

            for (let i = 0; i < len; i++) {
                const callArgs = arrays.map(a => a[i]);
                evaluator.callProcedure(proc, callArgs);
            }

            return VOID;
        },
        'for-each', null
    ));

    // filter: (filter predicate list)
    env.define('filter', new NativeProcedure(
        (args, evaluator) => {
            if (args.length !== 2) throw new RuntimeError('filter requires 2 arguments');
            const pred = args[0];
            const arr = listToArray(args[1]);
            const result = [];

            for (const item of arr) {
                const keep = evaluator.callProcedure(pred, [item]);
                if (keep !== false) {
                    result.push(item);
                }
            }

            return arrayToList(result);
        },
        'filter', 2
    ));

    // reduce/fold-left: (reduce f init list)
    env.define('reduce', new NativeProcedure(
        (args, evaluator) => {
            if (args.length !== 3) throw new RuntimeError('reduce requires 3 arguments');
            const proc = args[0];
            let acc = args[1];
            const arr = listToArray(args[2]);

            for (const item of arr) {
                acc = evaluator.callProcedure(proc, [acc, item]);
            }

            return acc;
        },
        'reduce', 3
    ));

    // fold-left (alias for reduce)
    env.define('fold-left', new NativeProcedure(
        (args, evaluator) => {
            if (args.length !== 3) throw new RuntimeError('fold-left requires 3 arguments');
            const proc = args[0];
            let acc = args[1];
            const arr = listToArray(args[2]);

            for (const item of arr) {
                acc = evaluator.callProcedure(proc, [acc, item]);
            }

            return acc;
        },
        'fold-left', 3
    ));

    // fold-right: (fold-right f init list)
    env.define('fold-right', new NativeProcedure(
        (args, evaluator) => {
            if (args.length !== 3) throw new RuntimeError('fold-right requires 3 arguments');
            const proc = args[0];
            let acc = args[1];
            const arr = listToArray(args[2]);

            for (let i = arr.length - 1; i >= 0; i--) {
                acc = evaluator.callProcedure(proc, [arr[i], acc]);
            }

            return acc;
        },
        'fold-right', 3
    ));

    // any: (any predicate list) - returns first truthy result or #f
    env.define('any', new NativeProcedure(
        (args, evaluator) => {
            if (args.length !== 2) throw new RuntimeError('any requires 2 arguments');
            const pred = args[0];
            const arr = listToArray(args[1]);

            for (const item of arr) {
                const result = evaluator.callProcedure(pred, [item]);
                if (result !== false) return result;
            }

            return false;
        },
        'any', 2
    ));

    // every: (every predicate list) - returns #f if any item fails predicate
    env.define('every', new NativeProcedure(
        (args, evaluator) => {
            if (args.length !== 2) throw new RuntimeError('every requires 2 arguments');
            const pred = args[0];
            const arr = listToArray(args[1]);
            let lastResult = true;

            for (const item of arr) {
                lastResult = evaluator.callProcedure(pred, [item]);
                if (lastResult === false) return false;
            }

            return lastResult;
        },
        'every', 2
    ));

    // find: (find predicate list) - returns first item matching predicate
    env.define('find', new NativeProcedure(
        (args, evaluator) => {
            if (args.length !== 2) throw new RuntimeError('find requires 2 arguments');
            const pred = args[0];
            const arr = listToArray(args[1]);

            for (const item of arr) {
                const result = evaluator.callProcedure(pred, [item]);
                if (result !== false) return item;
            }

            return false;
        },
        'find', 2
    ));

    // partition: (partition predicate list) -> (satisfies . not-satisfies)
    env.define('partition', new NativeProcedure(
        (args, evaluator) => {
            if (args.length !== 2) throw new RuntimeError('partition requires 2 arguments');
            const pred = args[0];
            const arr = listToArray(args[1]);
            const yes = [];
            const no = [];

            for (const item of arr) {
                const result = evaluator.callProcedure(pred, [item]);
                if (result !== false) {
                    yes.push(item);
                } else {
                    no.push(item);
                }
            }

            return new Pair(arrayToList(yes), arrayToList(no));
        },
        'partition', 2
    ));

    // take: (take n list)
    env.define('take', new NativeProcedure(
        (args) => {
            if (args.length !== 2) throw new RuntimeError('take requires 2 arguments');
            const n = args[0];
            const arr = listToArray(args[1]);
            return arrayToList(arr.slice(0, n));
        },
        'take', 2
    ));

    // drop: (drop n list)
    env.define('drop', new NativeProcedure(
        (args) => {
            if (args.length !== 2) throw new RuntimeError('drop requires 2 arguments');
            const n = args[0];
            const arr = listToArray(args[1]);
            return arrayToList(arr.slice(n));
        },
        'drop', 2
    ));

    // take-while: (take-while predicate list)
    env.define('take-while', new NativeProcedure(
        (args, evaluator) => {
            if (args.length !== 2) throw new RuntimeError('take-while requires 2 arguments');
            const pred = args[0];
            const arr = listToArray(args[1]);
            const result = [];

            for (const item of arr) {
                if (evaluator.callProcedure(pred, [item]) === false) break;
                result.push(item);
            }

            return arrayToList(result);
        },
        'take-while', 2
    ));

    // drop-while: (drop-while predicate list)
    env.define('drop-while', new NativeProcedure(
        (args, evaluator) => {
            if (args.length !== 2) throw new RuntimeError('drop-while requires 2 arguments');
            const pred = args[0];
            const arr = listToArray(args[1]);
            let i = 0;

            while (i < arr.length && evaluator.callProcedure(pred, [arr[i]]) !== false) {
                i++;
            }

            return arrayToList(arr.slice(i));
        },
        'drop-while', 2
    ));

    // zip: (zip list1 list2 ...) -> list of lists
    env.define('zip', new NativeProcedure(
        (args) => {
            if (args.length === 0) return NIL;

            const arrays = args.map(listToArray);
            const len = Math.min(...arrays.map(a => a.length));
            const result = [];

            for (let i = 0; i < len; i++) {
                result.push(arrayToList(arrays.map(a => a[i])));
            }

            return arrayToList(result);
        },
        'zip', null
    ));

    // flatten: (flatten list) - flatten one level
    env.define('flatten', new NativeProcedure(
        (args) => {
            if (args.length !== 1) throw new RuntimeError('flatten requires 1 argument');
            const arr = listToArray(args[0]);
            const result = [];

            for (const item of arr) {
                if (isList(item) && !isNil(item)) {
                    result.push(...listToArray(item));
                } else {
                    result.push(item);
                }
            }

            return arrayToList(result);
        },
        'flatten', 1
    ));

    // range: (range end) or (range start end) or (range start end step)
    env.define('range', new NativeProcedure(
        (args) => {
            let start, end, step;
            if (args.length === 1) {
                start = 0;
                end = args[0];
                step = 1;
            } else if (args.length === 2) {
                start = args[0];
                end = args[1];
                step = 1;
            } else if (args.length >= 3) {
                start = args[0];
                end = args[1];
                step = args[2];
            } else {
                throw new RuntimeError('range requires 1-3 arguments');
            }

            if (step === 0) throw new RuntimeError('range: step cannot be zero');

            const result = [];
            if (step > 0) {
                for (let i = start; i < end; i += step) result.push(i);
            } else {
                for (let i = start; i > end; i += step) result.push(i);
            }

            return arrayToList(result);
        },
        'range', null
    ));

    // iota: (iota count) or (iota count start) or (iota count start step)
    env.define('iota', new NativeProcedure(
        (args) => {
            if (args.length === 0) throw new RuntimeError('iota requires at least 1 argument');
            const count = args[0];
            const start = args.length > 1 ? args[1] : 0;
            const step = args.length > 2 ? args[2] : 1;

            const result = [];
            for (let i = 0; i < count; i++) {
                result.push(start + i * step);
            }

            return arrayToList(result);
        },
        'iota', null
    ));

    // sort: (sort list) or (sort list compare)
    env.define('sort', new NativeProcedure(
        (args, evaluator) => {
            if (args.length < 1) throw new RuntimeError('sort requires at least 1 argument');
            const arr = listToArray(args[0]);

            if (args.length > 1) {
                const compare = args[1];
                arr.sort((a, b) => {
                    const result = evaluator.callProcedure(compare, [a, b]);
                    if (result === true) return -1;
                    if (result === false) return 1;
                    return result;
                });
            } else {
                arr.sort((a, b) => {
                    if (a < b) return -1;
                    if (a > b) return 1;
                    return 0;
                });
            }

            return arrayToList(arr);
        },
        'sort', null
    ));

    // last: (last list)
    env.define('last', new NativeProcedure(
        (args) => {
            if (args.length !== 1) throw new RuntimeError('last requires 1 argument');
            let current = args[0];
            if (isNil(current)) throw new RuntimeError('last: empty list');
            while (isPair(current.cdr)) {
                current = current.cdr;
            }
            return current.car;
        },
        'last', 1
    ));

    // first (alias for car)
    env.define('first', new NativeProcedure(
        (args) => {
            if (!isPair(args[0])) throw new RuntimeError('first: not a pair');
            return args[0].car;
        },
        'first', 1
    ));

    // second
    env.define('second', new NativeProcedure(
        (args) => args[0].cdr.car,
        'second', 1
    ));

    // third
    env.define('third', new NativeProcedure(
        (args) => args[0].cdr.cdr.car,
        'third', 1
    ));

    // fourth
    env.define('fourth', new NativeProcedure(
        (args) => args[0].cdr.cdr.cdr.car,
        'fourth', 1
    ));

    // fifth
    env.define('fifth', new NativeProcedure(
        (args) => args[0].cdr.cdr.cdr.cdr.car,
        'fifth', 1
    ));

    // rest (alias for cdr)
    env.define('rest', new NativeProcedure(
        (args) => {
            if (!isPair(args[0])) throw new RuntimeError('rest: not a pair');
            return args[0].cdr;
        },
        'rest', 1
    ));

    // make-list: (make-list n) or (make-list n fill)
    env.define('make-list', new NativeProcedure(
        (args) => {
            if (args.length < 1) throw new RuntimeError('make-list requires at least 1 argument');
            const n = args[0];
            const fill = args.length > 1 ? args[1] : NIL;
            const result = [];
            for (let i = 0; i < n; i++) {
                result.push(fill);
            }
            return arrayToList(result);
        },
        'make-list', null
    ));
}

// ES Module exports
export { installListFunctions };

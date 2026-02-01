// Additional math functions and I/O for the LISP interpreter

import { RuntimeError } from '../interpreter/errors.js';
import {
    VOID,
    NativeProcedure,
    arrayToList, stringify, display
} from '../interpreter/types.js';

function installMathFunctions(env) {
    // Constants
    env.define('pi', Math.PI);
    env.define('e', Math.E);

    // Additional math
    env.define('gcd', new NativeProcedure(
        (args) => {
            const gcd = (a, b) => b === 0 ? Math.abs(a) : gcd(b, a % b);
            if (args.length === 0) return 0;
            return args.reduce((a, b) => gcd(a, b));
        },
        'gcd', null
    ));

    env.define('lcm', new NativeProcedure(
        (args) => {
            const gcd = (a, b) => b === 0 ? Math.abs(a) : gcd(b, a % b);
            const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
            if (args.length === 0) return 1;
            return args.reduce((a, b) => lcm(a, b));
        },
        'lcm', null
    ));

    env.define('numerator', new NativeProcedure(
        (args) => {
            // For simplicity, just return the number (integers are their own numerator)
            if (Number.isInteger(args[0])) return args[0];
            // For floats, approximate
            const str = args[0].toString();
            const decimals = str.includes('.') ? str.split('.')[1].length : 0;
            return args[0] * Math.pow(10, decimals);
        },
        'numerator', 1
    ));

    env.define('denominator', new NativeProcedure(
        (args) => {
            if (Number.isInteger(args[0])) return 1;
            const str = args[0].toString();
            const decimals = str.includes('.') ? str.split('.')[1].length : 0;
            return Math.pow(10, decimals);
        },
        'denominator', 1
    ));

    env.define('nan?', new NativeProcedure(
        (args) => Number.isNaN(args[0]),
        'nan?', 1
    ));

    env.define('infinite?', new NativeProcedure(
        (args) => !Number.isFinite(args[0]) && !Number.isNaN(args[0]),
        'infinite?', 1
    ));

    env.define('finite?', new NativeProcedure(
        (args) => Number.isFinite(args[0]),
        'finite?', 1
    ));

    env.define('exact?', new NativeProcedure(
        (args) => Number.isInteger(args[0]),
        'exact?', 1
    ));

    env.define('inexact?', new NativeProcedure(
        (args) => !Number.isInteger(args[0]),
        'inexact?', 1
    ));

    env.define('exact->inexact', new NativeProcedure(
        (args) => Number(args[0]),
        'exact->inexact', 1
    ));

    env.define('inexact->exact', new NativeProcedure(
        (args) => Math.round(args[0]),
        'inexact->exact', 1
    ));

    // Bitwise operations
    env.define('bitwise-and', new NativeProcedure(
        (args) => args.reduce((a, b) => a & b),
        'bitwise-and', null
    ));

    env.define('bitwise-or', new NativeProcedure(
        (args) => args.reduce((a, b) => a | b),
        'bitwise-or', null
    ));

    env.define('bitwise-xor', new NativeProcedure(
        (args) => args.reduce((a, b) => a ^ b),
        'bitwise-xor', null
    ));

    env.define('bitwise-not', new NativeProcedure(
        (args) => ~args[0],
        'bitwise-not', 1
    ));

    env.define('arithmetic-shift', new NativeProcedure(
        (args) => {
            const n = args[0];
            const count = args[1];
            return count >= 0 ? n << count : n >> -count;
        },
        'arithmetic-shift', 2
    ));

    // I/O functions
    env.define('display', new NativeProcedure(
        (args, evaluator) => {
            const str = display(args[0]);
            if (evaluator && evaluator.outputCollector) {
                evaluator.outputCollector.write(str);
            }
            return VOID;
        },
        'display', 1
    ));

    env.define('newline', new NativeProcedure(
        (args, evaluator) => {
            if (evaluator && evaluator.outputCollector) {
                evaluator.outputCollector.write('\n');
            }
            return VOID;
        },
        'newline', 0
    ));

    env.define('print', new NativeProcedure(
        (args, evaluator) => {
            const str = stringify(args[0]);
            if (evaluator && evaluator.outputCollector) {
                evaluator.outputCollector.write(str + '\n');
            }
            return VOID;
        },
        'print', 1
    ));

    env.define('write', new NativeProcedure(
        (args, evaluator) => {
            const str = stringify(args[0]);
            if (evaluator && evaluator.outputCollector) {
                evaluator.outputCollector.write(str);
            }
            return VOID;
        },
        'write', 1
    ));

    // Current time
    env.define('current-seconds', new NativeProcedure(
        () => Math.floor(Date.now() / 1000),
        'current-seconds', 0
    ));

    env.define('current-milliseconds', new NativeProcedure(
        () => Date.now(),
        'current-milliseconds', 0
    ));

    // Identity and compose
    env.define('identity', new NativeProcedure(
        (args) => args[0],
        'identity', 1
    ));

    env.define('compose', new NativeProcedure(
        (args, evaluator) => {
            const funcs = args;
            return new NativeProcedure(
                (innerArgs, ev) => {
                    let result = innerArgs[0];
                    for (let i = funcs.length - 1; i >= 0; i--) {
                        result = evaluator.callProcedure(funcs[i], [result]);
                    }
                    return result;
                },
                'composed', 1
            );
        },
        'compose', null
    ));

    // Curry
    env.define('curry', new NativeProcedure(
        (args, evaluator) => {
            const func = args[0];
            const arity = args[1];
            const collected = [];

            function makeCurried(collected) {
                return new NativeProcedure(
                    (innerArgs, ev) => {
                        const newCollected = [...collected, ...innerArgs];
                        if (newCollected.length >= arity) {
                            return evaluator.callProcedure(func, newCollected);
                        }
                        return makeCurried(newCollected);
                    },
                    'curried', null
                );
            }

            return makeCurried([]);
        },
        'curry', 2
    ));

    // Negate
    env.define('negate', new NativeProcedure(
        (args, evaluator) => {
            const pred = args[0];
            return new NativeProcedure(
                (innerArgs, ev) => {
                    const result = evaluator.callProcedure(pred, innerArgs);
                    return result === false;
                },
                'negated', null
            );
        },
        'negate', 1
    ));

    // Const
    env.define('const', new NativeProcedure(
        (args) => {
            const value = args[0];
            return new NativeProcedure(
                () => value,
                'const', null
            );
        },
        'const', 1
    ));

    // Flip
    env.define('flip', new NativeProcedure(
        (args, evaluator) => {
            const func = args[0];
            return new NativeProcedure(
                (innerArgs, ev) => {
                    return evaluator.callProcedure(func, [innerArgs[1], innerArgs[0]]);
                },
                'flipped', 2
            );
        },
        'flip', 1
    ));
}

// ES Module exports
export { installMathFunctions };

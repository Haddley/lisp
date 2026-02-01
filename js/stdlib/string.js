// String functions for the LISP interpreter

import { RuntimeError } from '../interpreter/errors.js';
import {
    NIL,
    NativeProcedure, LispSymbol,
    intern, isString,
    arrayToList, listToArray, stringify, display
} from '../interpreter/types.js';

function installStringFunctions(env) {
    // String creation and basic ops
    env.define('string', new NativeProcedure(
        (args) => args.join(''),
        'string', null
    ));

    env.define('make-string', new NativeProcedure(
        (args) => {
            const n = args[0];
            const char = args.length > 1 ? args[1] : ' ';
            return char.repeat(n);
        },
        'make-string', null
    ));

    env.define('string-length', new NativeProcedure(
        (args) => {
            if (!isString(args[0])) throw new RuntimeError('string-length: not a string');
            return args[0].length;
        },
        'string-length', 1
    ));

    env.define('string-ref', new NativeProcedure(
        (args) => {
            if (!isString(args[0])) throw new RuntimeError('string-ref: not a string');
            const i = args[1];
            if (i < 0 || i >= args[0].length) throw new RuntimeError('string-ref: index out of bounds');
            return args[0][i];
        },
        'string-ref', 2
    ));

    // Comparison
    env.define('string=?', new NativeProcedure(
        (args) => args[0] === args[1],
        'string=?', 2
    ));

    env.define('string<?', new NativeProcedure(
        (args) => args[0] < args[1],
        'string<?', 2
    ));

    env.define('string>?', new NativeProcedure(
        (args) => args[0] > args[1],
        'string>?', 2
    ));

    env.define('string<=?', new NativeProcedure(
        (args) => args[0] <= args[1],
        'string<=?', 2
    ));

    env.define('string>=?', new NativeProcedure(
        (args) => args[0] >= args[1],
        'string>=?', 2
    ));

    // Case-insensitive comparison
    env.define('string-ci=?', new NativeProcedure(
        (args) => args[0].toLowerCase() === args[1].toLowerCase(),
        'string-ci=?', 2
    ));

    env.define('string-ci<?', new NativeProcedure(
        (args) => args[0].toLowerCase() < args[1].toLowerCase(),
        'string-ci<?', 2
    ));

    env.define('string-ci>?', new NativeProcedure(
        (args) => args[0].toLowerCase() > args[1].toLowerCase(),
        'string-ci>?', 2
    ));

    env.define('string-ci<=?', new NativeProcedure(
        (args) => args[0].toLowerCase() <= args[1].toLowerCase(),
        'string-ci<=?', 2
    ));

    env.define('string-ci>=?', new NativeProcedure(
        (args) => args[0].toLowerCase() >= args[1].toLowerCase(),
        'string-ci>=?', 2
    ));

    // Substring and concatenation
    env.define('substring', new NativeProcedure(
        (args) => {
            if (!isString(args[0])) throw new RuntimeError('substring: not a string');
            const start = args[1];
            const end = args.length > 2 ? args[2] : args[0].length;
            return args[0].substring(start, end);
        },
        'substring', null
    ));

    env.define('string-append', new NativeProcedure(
        (args) => args.join(''),
        'string-append', null
    ));

    env.define('string-copy', new NativeProcedure(
        (args) => {
            if (!isString(args[0])) throw new RuntimeError('string-copy: not a string');
            return String(args[0]);
        },
        'string-copy', 1
    ));

    // Search
    env.define('string-contains', new NativeProcedure(
        (args) => {
            const idx = args[0].indexOf(args[1]);
            return idx === -1 ? false : idx;
        },
        'string-contains', 2
    ));

    env.define('string-prefix?', new NativeProcedure(
        (args) => args[0].startsWith(args[1]),
        'string-prefix?', 2
    ));

    env.define('string-suffix?', new NativeProcedure(
        (args) => args[0].endsWith(args[1]),
        'string-suffix?', 2
    ));

    env.define('string-index', new NativeProcedure(
        (args, evaluator) => {
            const str = args[0];
            const pred = args[1];
            for (let i = 0; i < str.length; i++) {
                if (evaluator.callProcedure(pred, [str[i]]) !== false) {
                    return i;
                }
            }
            return false;
        },
        'string-index', 2
    ));

    // Transformation
    env.define('string-upcase', new NativeProcedure(
        (args) => args[0].toUpperCase(),
        'string-upcase', 1
    ));

    env.define('string-downcase', new NativeProcedure(
        (args) => args[0].toLowerCase(),
        'string-downcase', 1
    ));

    env.define('string-titlecase', new NativeProcedure(
        (args) => args[0].replace(/\w\S*/g, t =>
            t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()
        ),
        'string-titlecase', 1
    ));

    env.define('string-trim', new NativeProcedure(
        (args) => args[0].trim(),
        'string-trim', 1
    ));

    env.define('string-trim-left', new NativeProcedure(
        (args) => args[0].trimStart(),
        'string-trim-left', 1
    ));

    env.define('string-trim-right', new NativeProcedure(
        (args) => args[0].trimEnd(),
        'string-trim-right', 1
    ));

    // Split and join
    env.define('string-split', new NativeProcedure(
        (args) => {
            const delim = args.length > 1 ? args[1] : ' ';
            return arrayToList(args[0].split(delim));
        },
        'string-split', null
    ));

    env.define('string-join', new NativeProcedure(
        (args) => {
            const delim = args.length > 1 ? args[1] : '';
            return listToArray(args[0]).join(delim);
        },
        'string-join', null
    ));

    // Replace
    env.define('string-replace', new NativeProcedure(
        (args) => args[0].split(args[1]).join(args[2]),
        'string-replace', 3
    ));

    // Reverse
    env.define('string-reverse', new NativeProcedure(
        (args) => [...args[0]].reverse().join(''),
        'string-reverse', 1
    ));

    // Repeat
    env.define('string-repeat', new NativeProcedure(
        (args) => args[0].repeat(args[1]),
        'string-repeat', 2
    ));

    // Pad
    env.define('string-pad-left', new NativeProcedure(
        (args) => {
            const str = args[0];
            const len = args[1];
            const char = args.length > 2 ? args[2] : ' ';
            return str.padStart(len, char);
        },
        'string-pad-left', null
    ));

    env.define('string-pad-right', new NativeProcedure(
        (args) => {
            const str = args[0];
            const len = args[1];
            const char = args.length > 2 ? args[2] : ' ';
            return str.padEnd(len, char);
        },
        'string-pad-right', null
    ));

    // Char predicates
    env.define('char-alphabetic?', new NativeProcedure(
        (args) => /[a-zA-Z]/.test(args[0]),
        'char-alphabetic?', 1
    ));

    env.define('char-numeric?', new NativeProcedure(
        (args) => /[0-9]/.test(args[0]),
        'char-numeric?', 1
    ));

    env.define('char-whitespace?', new NativeProcedure(
        (args) => /\s/.test(args[0]),
        'char-whitespace?', 1
    ));

    env.define('char-upper-case?', new NativeProcedure(
        (args) => args[0] === args[0].toUpperCase() && /[a-zA-Z]/.test(args[0]),
        'char-upper-case?', 1
    ));

    env.define('char-lower-case?', new NativeProcedure(
        (args) => args[0] === args[0].toLowerCase() && /[a-zA-Z]/.test(args[0]),
        'char-lower-case?', 1
    ));

    env.define('char-upcase', new NativeProcedure(
        (args) => args[0].toUpperCase(),
        'char-upcase', 1
    ));

    env.define('char-downcase', new NativeProcedure(
        (args) => args[0].toLowerCase(),
        'char-downcase', 1
    ));

    // Format (simple version)
    env.define('format', new NativeProcedure(
        (args) => {
            let template = args[0];
            let i = 1;
            return template.replace(/~[aAsS%~]/g, (match) => {
                switch (match) {
                    case '~a':
                    case '~A':
                        return display(args[i++]);
                    case '~s':
                    case '~S':
                        return stringify(args[i++]);
                    case '~%':
                        return '\n';
                    case '~~':
                        return '~';
                    default:
                        return match;
                }
            });
        },
        'format', null
    ));
}

// ES Module exports
export { installStringFunctions };

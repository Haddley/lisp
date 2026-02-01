// Data types for the LISP interpreter

import { RuntimeError } from './errors.js';

// Nil/Empty list singleton
const NIL = Object.freeze({
    type: 'nil',
    toString() { return '()'; }
});

// Void (returned by side-effect operations)
const VOID = Object.freeze({
    type: 'void',
    toString() { return ''; }
});

// Undefined placeholder (for letrec)
const UNDEFINED = Object.freeze({
    type: 'undefined',
    toString() { return '#<undefined>'; }
});

// Symbol class (distinct from string)
class LispSymbol {
    constructor(name) {
        this.name = name;
    }

    toString() {
        return this.name;
    }

    equals(other) {
        return other instanceof LispSymbol && other.name === this.name;
    }
}

// Interned symbol table for efficiency
const symbolTable = new Map();

function intern(name) {
    if (!symbolTable.has(name)) {
        symbolTable.set(name, new LispSymbol(name));
    }
    return symbolTable.get(name);
}

// Cons cell / Pair
class Pair {
    constructor(car, cdr) {
        this.car = car;
        this.cdr = cdr;
    }

    toString() {
        return `(${this.toStringHelper()})`;
    }

    toStringHelper() {
        const carStr = stringify(this.car);
        if (this.cdr === NIL) {
            return carStr;
        }
        if (this.cdr instanceof Pair) {
            return `${carStr} ${this.cdr.toStringHelper()}`;
        }
        // Dotted pair
        return `${carStr} . ${stringify(this.cdr)}`;
    }
}

// User-defined procedure
class Procedure {
    constructor(params, body, closure, name = null) {
        this.params = params;        // Array of parameter names
        this.body = body;            // Array of body expressions
        this.closure = closure;      // Environment at definition time
        this.name = name;            // Optional name for debugging
        this.isVariadic = false;     // Does it accept rest args?
        this.restParam = null;       // Name of rest parameter
    }

    toString() {
        return this.name ? `#<procedure:${this.name}>` : '#<procedure>';
    }
}

// Native (built-in) procedure
class NativeProcedure {
    constructor(func, name, arity = null) {
        this.func = func;            // JavaScript function
        this.name = name;
        this.arity = arity;          // Expected argument count (null = variadic)
    }

    apply(args, evaluator = null, env = null) {
        if (this.arity !== null && args.length !== this.arity) {
            throw new RuntimeError(
                `${this.name} expects ${this.arity} argument${this.arity === 1 ? '' : 's'}, got ${args.length}`
            );
        }
        return this.func(args, evaluator, env);
    }

    toString() {
        return `#<native:${this.name}>`;
    }
}

// Type checking utilities
function isNil(v) { return v === NIL; }
function isPair(v) { return v instanceof Pair; }
function isList(v) {
    let current = v;
    while (current !== NIL) {
        if (!(current instanceof Pair)) return false;
        current = current.cdr;
    }
    return true;
}
function isSymbol(v) { return v instanceof LispSymbol; }
function isNumber(v) { return typeof v === 'number'; }
function isString(v) { return typeof v === 'string'; }
function isBoolean(v) { return typeof v === 'boolean'; }
function isProcedure(v) { return v instanceof Procedure || v instanceof NativeProcedure; }

// Conversion utilities
function arrayToList(arr) {
    let result = NIL;
    for (let i = arr.length - 1; i >= 0; i--) {
        result = new Pair(arr[i], result);
    }
    return result;
}

function listToArray(list) {
    const result = [];
    let current = list;
    while (current !== NIL) {
        if (!(current instanceof Pair)) {
            throw new RuntimeError('Not a proper list');
        }
        result.push(current.car);
        current = current.cdr;
    }
    return result;
}

function listLength(list) {
    let length = 0;
    let current = list;
    while (current !== NIL) {
        if (!(current instanceof Pair)) {
            throw new RuntimeError('Not a proper list');
        }
        length++;
        current = current.cdr;
    }
    return length;
}

// Deep equality check
function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;

    if (a instanceof LispSymbol && b instanceof LispSymbol) {
        return a.name === b.name;
    }

    if (a instanceof Pair && b instanceof Pair) {
        return deepEqual(a.car, b.car) && deepEqual(a.cdr, b.cdr);
    }

    if (a === NIL && b === NIL) return true;

    return false;
}

// Pretty printing
function stringify(value) {
    if (value === NIL) return '()';
    if (value === VOID) return '';
    if (value === UNDEFINED) return '#<undefined>';
    if (value === true) return '#t';
    if (value === false) return '#f';
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return String(value);
        return String(value);
    }
    if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    if (value instanceof LispSymbol) return value.name;
    if (value instanceof Pair) return value.toString();
    if (value instanceof Procedure) return value.toString();
    if (value instanceof NativeProcedure) return value.toString();
    return String(value);
}

// For display (strings without quotes)
function display(value) {
    if (typeof value === 'string') return value;
    return stringify(value);
}

// Helper to reset symbol table (for testing)
function resetSymbolTable() {
    symbolTable.clear();
}

// ES Module exports
export {
    NIL, VOID, UNDEFINED,
    LispSymbol, Pair, Procedure, NativeProcedure,
    symbolTable, intern, resetSymbolTable,
    isNil, isPair, isList, isSymbol, isNumber, isString, isBoolean, isProcedure,
    arrayToList, listToArray, listLength,
    deepEqual, stringify, display
};

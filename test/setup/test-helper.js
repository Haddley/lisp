// Test helper utilities for LISP interpreter tests

// Import interpreter modules
import { LispError, LexerError, ParseError, RuntimeError } from '../../js/interpreter/errors.js';
import {
    NIL, VOID, UNDEFINED,
    LispSymbol, Pair, Procedure, NativeProcedure,
    symbolTable, intern, resetSymbolTable,
    isNil, isPair, isList, isSymbol, isNumber, isString, isBoolean, isProcedure,
    arrayToList, listToArray, listLength,
    deepEqual, stringify, display
} from '../../js/interpreter/types.js';
import { TokenType, Token, Lexer } from '../../js/interpreter/lexer.js';
import { Expr, LiteralExpr, SymbolExpr, ListExpr, QuoteExpr, DottedPairExpr, Parser } from '../../js/interpreter/parser.js';
import { Environment } from '../../js/interpreter/environment.js';
import { SPECIAL_FORMS, TailCall, Evaluator } from '../../js/interpreter/evaluator.js';
import { createGlobalEnvironment } from '../../js/stdlib/core.js';
import { installListFunctions } from '../../js/stdlib/list.js';
import { installStringFunctions } from '../../js/stdlib/string.js';
import { installMathFunctions } from '../../js/stdlib/math.js';

/**
 * Output collector for capturing display/print output during tests
 */
class OutputCollector {
    constructor() {
        this.output = [];
    }

    write(str) {
        this.output.push(str);
    }

    getOutput() {
        return this.output.join('');
    }

    getLines() {
        return this.output;
    }

    clear() {
        this.output = [];
    }
}

/**
 * Create a fresh interpreter instance for testing
 * Resets the symbol table to ensure test isolation
 */
function createInterpreter() {
    // Reset symbol table for test isolation
    resetSymbolTable();

    // Create fresh global environment with all stdlib functions
    const globalEnv = createGlobalEnvironment();
    installListFunctions(globalEnv);
    installStringFunctions(globalEnv);
    installMathFunctions(globalEnv);

    const evaluator = new Evaluator(globalEnv);

    return {
        globalEnv,
        evaluator,

        /**
         * Run LISP source code and return the result
         * @param {string} source - LISP source code
         * @param {OutputCollector} outputCollector - optional output collector
         * @returns {*} The result of evaluation
         */
        run(source, outputCollector = null) {
            evaluator.setOutput(outputCollector);

            const lexer = new Lexer(source);
            const tokens = lexer.tokenize();

            const parser = new Parser(tokens);
            const expressions = parser.parse();

            let result = VOID;
            for (const expr of expressions) {
                result = evaluator.evaluate(expr, globalEnv);
            }
            return result;
        },

        /**
         * Tokenize source code
         * @param {string} source - LISP source code
         * @returns {Token[]} Array of tokens
         */
        tokenize(source) {
            const lexer = new Lexer(source);
            return lexer.tokenize();
        },

        /**
         * Parse source code into AST
         * @param {string} source - LISP source code
         * @returns {Expr[]} Array of expressions
         */
        parse(source) {
            const lexer = new Lexer(source);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            return parser.parse();
        }
    };
}

// Shared interpreter for evalToString and evalWithOutput when no interp is provided
let sharedInterpreter = null;

function getSharedInterpreter() {
    if (!sharedInterpreter) {
        sharedInterpreter = createInterpreter();
    }
    return sharedInterpreter;
}

function resetSharedInterpreter() {
    sharedInterpreter = null;
}

/**
 * Run LISP code and return result as string
 * @param {string} source - LISP source code
 * @param {object} [interp] - Optional interpreter instance to use
 * @returns {string} Stringified result
 */
function evalToString(source, interp = null) {
    if (!interp) {
        interp = getSharedInterpreter();
    }
    const result = interp.run(source);
    return stringify(result);
}

/**
 * Run LISP code and capture output
 * @param {string} source - LISP source code
 * @param {object} [interp] - Optional interpreter instance to use
 * @returns {{result: *, output: string[]}} Result and captured output as array of strings
 */
function evalWithOutput(source, interp = null) {
    if (!interp) {
        interp = getSharedInterpreter();
    }
    const collector = new OutputCollector();
    const result = interp.run(source, collector);
    return {
        result,
        output: collector.getLines()
    };
}

/**
 * Run LISP code and verify it throws expected error
 * @param {string} source - LISP source code
 * @param {Function} errorType - Expected error class
 * @param {RegExp} messagePattern - Optional pattern to match error message
 * @returns {Error} The thrown error for further inspection
 */
function expectError(source, errorType, messagePattern = null) {
    const interp = createInterpreter();
    try {
        interp.run(source);
        throw new Error(`Expected ${errorType.name} but no error was thrown`);
    } catch (e) {
        if (e.message.startsWith('Expected') && e.message.includes('but no error')) {
            throw e;
        }
        if (!(e instanceof errorType)) {
            throw new Error(`Expected ${errorType.name} but got ${e.constructor.name}: ${e.message}`);
        }
        if (messagePattern && !messagePattern.test(e.message)) {
            throw new Error(`Error message "${e.message}" does not match pattern ${messagePattern}`);
        }
        return e;
    }
}

/**
 * Verify lexer throws expected error
 */
function expectLexerError(source, messagePattern = null) {
    try {
        const lexer = new Lexer(source);
        lexer.tokenize();
        throw new Error('Expected LexerError but no error was thrown');
    } catch (e) {
        if (e.message.startsWith('Expected') && e.message.includes('but no error')) {
            throw e;
        }
        if (!(e instanceof LexerError)) {
            throw new Error(`Expected LexerError but got ${e.constructor.name}: ${e.message}`);
        }
        if (messagePattern && !messagePattern.test(e.message)) {
            throw new Error(`Error message "${e.message}" does not match pattern ${messagePattern}`);
        }
        return e;
    }
}

/**
 * Verify parser throws expected error
 */
function expectParseError(source, messagePattern = null) {
    try {
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        parser.parse();
        throw new Error('Expected ParseError but no error was thrown');
    } catch (e) {
        if (e.message.startsWith('Expected') && e.message.includes('but no error')) {
            throw e;
        }
        if (!(e instanceof ParseError)) {
            throw new Error(`Expected ParseError but got ${e.constructor.name}: ${e.message}`);
        }
        if (messagePattern && !messagePattern.test(e.message)) {
            throw new Error(`Error message "${e.message}" does not match pattern ${messagePattern}`);
        }
        return e;
    }
}

// Re-export everything for test files
export {
    // Test utilities
    OutputCollector,
    createInterpreter,
    evalToString,
    evalWithOutput,
    expectError,
    expectLexerError,
    expectParseError,

    // Error classes
    LispError, LexerError, ParseError, RuntimeError,

    // Types
    NIL, VOID, UNDEFINED,
    LispSymbol, Pair, Procedure, NativeProcedure,
    symbolTable, intern, resetSymbolTable,
    isNil, isPair, isList, isSymbol, isNumber, isString, isBoolean, isProcedure,
    arrayToList, listToArray, listLength,
    deepEqual, stringify, display,

    // Lexer
    TokenType, Token, Lexer,

    // Parser
    Expr, LiteralExpr, SymbolExpr, ListExpr, QuoteExpr, DottedPairExpr, Parser,

    // Environment
    Environment,

    // Evaluator
    SPECIAL_FORMS, TailCall, Evaluator,

    // Stdlib
    createGlobalEnvironment,
    installListFunctions,
    installStringFunctions,
    installMathFunctions
};

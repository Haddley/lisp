// Main application entry point

import { VOID } from './interpreter/types.js';
import { Lexer } from './interpreter/lexer.js';
import { Parser } from './interpreter/parser.js';
import { Evaluator } from './interpreter/evaluator.js';
import { createGlobalEnvironment } from './stdlib/core.js';
import { installListFunctions } from './stdlib/list.js';
import { installStringFunctions } from './stdlib/string.js';
import { installMathFunctions } from './stdlib/math.js';
import { Notebook } from './ui/notebook.js';

class LispInterpreter {
    constructor() {
        this.globalEnv = createGlobalEnvironment();
        installListFunctions(this.globalEnv);
        installStringFunctions(this.globalEnv);
        installMathFunctions(this.globalEnv);

        this.evaluator = new Evaluator(this.globalEnv);
        this.userBindingsCount = 0;
    }

    run(source, outputCollector = null) {
        // Set output collector
        this.evaluator.setOutput(outputCollector);

        // Tokenize
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();

        // Parse
        const parser = new Parser(tokens);
        const expressions = parser.parse();

        // Evaluate each expression, return last result
        let result = VOID;
        const initialBindings = this.globalEnv.size();

        for (const expr of expressions) {
            result = this.evaluator.evaluate(expr, this.globalEnv);
        }

        // Track user-defined bindings
        this.userBindingsCount = this.globalEnv.size() - initialBindings + this.userBindingsCount;

        return result;
    }

    reset() {
        this.globalEnv = createGlobalEnvironment();
        installListFunctions(this.globalEnv);
        installStringFunctions(this.globalEnv);
        installMathFunctions(this.globalEnv);
        this.evaluator = new Evaluator(this.globalEnv);
        this.userBindingsCount = 0;
    }

    getBindingCount() {
        // Return count of user-defined bindings (approximate)
        return this.userBindingsCount;
    }
}

// Welcome code for new notebooks
const WELCOME_CODE = `; Welcome to LISP Notebook!
; A Scheme-like interpreter in your browser.
; Press Shift+Enter to run this cell.

; Try defining a function:
(define (square x) (* x x))

; And calling it:
(square 5)`;

const EXAMPLE_CODE_2 = `; Higher-order functions work great!
(define nums '(1 2 3 4 5 6 7 8 9 10))

; Map squares the list
(map square nums)`;

const EXAMPLE_CODE_3 = `; Filter for even numbers
(filter even? nums)

; Reduce to sum
(reduce + 0 nums)

; Combine them - sum of squares of even numbers
(reduce + 0 (map square (filter even? nums)))`;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    const interpreter = new LispInterpreter();
    const container = document.getElementById('cells-container');
    const notebook = new Notebook(container, interpreter);

    // Try to load saved notebook
    const loaded = notebook.loadFromLocalStorage();

    // If no saved cells, create welcome cells
    if (!loaded || notebook.cells.length === 0) {
        const cell1 = notebook.addCell();
        cell1.setCode(WELCOME_CODE);

        const cell2 = notebook.addCell();
        cell2.setCode(EXAMPLE_CODE_2);

        const cell3 = notebook.addCell();
        cell3.setCode(EXAMPLE_CODE_3);

        notebook.cells[0].focus();
    } else {
        // Focus first cell
        if (notebook.cells.length > 0) {
            notebook.cells[0].focus();
        }
    }

    // Auto-save periodically
    setInterval(() => {
        notebook.saveToLocalStorage();
    }, 10000);

    // Save before leaving
    window.addEventListener('beforeunload', () => {
        notebook.saveToLocalStorage();
    });

    // Update status initially
    notebook.updateStatus();

    // Make notebook globally accessible for debugging
    window.notebook = notebook;
    window.interpreter = interpreter;

    console.log('LISP Notebook initialized. Access via window.notebook and window.interpreter');
});

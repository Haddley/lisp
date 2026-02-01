# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests (379 tests)
npm test

# Run specific test suites
npm run test:unit          # Lexer, parser, types, environment, evaluator
npm run test:stdlib        # Core, list, string, math functions
npm run test:integration   # Programs, edge cases, TCO verification

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run the web app (requires a local server for ES modules)
npx serve .
# Then open http://localhost:3000
# Or
# python3 -m http.server 8000
# Then open http://localhost:8000
```

## Architecture

This is a Scheme-like LISP interpreter with a Jupyter-style notebook UI, built entirely with vanilla JS (no dependencies).

### Interpreter Pipeline

Source code flows through: **Lexer → Parser → Evaluator**

- `js/interpreter/lexer.js` - Tokenizes source into tokens with line/column tracking
- `js/interpreter/parser.js` - Builds AST with node types: `LiteralExpr`, `SymbolExpr`, `ListExpr`, `QuoteExpr`, `DottedPairExpr`
- `js/interpreter/evaluator.js` - Evaluates AST with tail-call optimization via trampoline loop
- `js/interpreter/environment.js` - Lexical scoping with parent chain lookup
- `js/interpreter/types.js` - Core types: `NIL`, `VOID`, `Pair`, `LispSymbol`, `Procedure`, `NativeProcedure`

### Standard Library

Each stdlib module exports an install function that registers native procedures:

- `js/stdlib/core.js` - `createGlobalEnvironment()` with arithmetic, comparison, type predicates, basic list ops
- `js/stdlib/list.js` - `installListFunctions()` for map, filter, reduce, range, etc.
- `js/stdlib/string.js` - `installStringFunctions()` for string manipulation
- `js/stdlib/math.js` - `installMathFunctions()` for extended math, I/O, functional utilities

### UI Layer

- `js/main.js` - `LispInterpreter` class wrapping the pipeline, app initialization
- `js/ui/notebook.js` - Manages cells, localStorage persistence, toolbar actions
- `js/ui/cell.js` - Individual cell with code editor, output display, keyboard shortcuts

### Test Setup

Tests use Node.js built-in test runner (`node:test`). Key utilities in `test/setup/test-helper.js`:

- `createInterpreter()` - Fresh interpreter with `resetSymbolTable()` for test isolation
- `expectError(source, ErrorType, pattern)` - Verify error throwing
- Re-exports all interpreter internals for direct testing

## Key Implementation Details

- **Tail-call optimization**: The evaluator uses a trampoline loop with `TailCall` markers, enabling deep recursion (100k+ calls) without stack overflow
- **Symbol interning**: All symbols are interned via `intern()` in types.js for identity comparison with `eq?`
- **ES modules**: All files use ES module imports/exports, browser loads via `<script type="module">`
- **Special forms**: Handled in evaluator's `SPECIAL_FORMS` set: define, lambda, if, cond, let, let*, letrec, begin, quote, set!, and, or

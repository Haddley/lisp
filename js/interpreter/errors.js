// Custom error classes for the LISP interpreter

class LispError extends Error {
    constructor(message, line = null, column = null) {
        super(message);
        this.name = 'LispError';
        this.line = line;
        this.column = column;
    }

    toString() {
        let str = `${this.name}: ${this.message}`;
        if (this.line !== null) {
            str += ` at line ${this.line}`;
            if (this.column !== null) {
                str += `, column ${this.column}`;
            }
        }
        return str;
    }
}

class LexerError extends LispError {
    constructor(message, line, column) {
        super(message, line, column);
        this.name = 'LexerError';
    }
}

class ParseError extends LispError {
    constructor(message, line = null, column = null) {
        super(message, line, column);
        this.name = 'ParseError';
    }
}

class RuntimeError extends LispError {
    constructor(message, line = null, column = null) {
        super(message, line, column);
        this.name = 'RuntimeError';
    }
}

// ES Module exports
export { LispError, LexerError, ParseError, RuntimeError };

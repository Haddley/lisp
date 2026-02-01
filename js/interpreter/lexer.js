// Lexer/Tokenizer for the LISP interpreter

import { LexerError } from './errors.js';

const TokenType = {
    // Delimiters
    LEFT_PAREN: 'LEFT_PAREN',
    RIGHT_PAREN: 'RIGHT_PAREN',
    LEFT_BRACKET: 'LEFT_BRACKET',
    RIGHT_BRACKET: 'RIGHT_BRACKET',

    // Literals
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    BOOLEAN: 'BOOLEAN',

    // Identifiers
    SYMBOL: 'SYMBOL',

    // Special
    QUOTE: 'QUOTE',
    QUASIQUOTE: 'QUASIQUOTE',
    UNQUOTE: 'UNQUOTE',
    UNQUOTE_SPLICING: 'UNQUOTE_SPLICING',
    DOT: 'DOT',

    // End
    EOF: 'EOF'
};

class Token {
    constructor(type, lexeme, literal, line, column) {
        this.type = type;
        this.lexeme = lexeme;
        this.literal = literal;
        this.line = line;
        this.column = column;
    }
}

class Lexer {
    constructor(source) {
        this.source = source;
        this.tokens = [];
        this.start = 0;
        this.current = 0;
        this.line = 1;
        this.column = 1;
        this.startColumn = 1;
    }

    tokenize() {
        while (!this.isAtEnd()) {
            this.start = this.current;
            this.startColumn = this.column;
            this.scanToken();
        }
        this.tokens.push(new Token(TokenType.EOF, '', null, this.line, this.column));
        return this.tokens;
    }

    scanToken() {
        const char = this.advance();

        switch (char) {
            case '(': this.addToken(TokenType.LEFT_PAREN); break;
            case ')': this.addToken(TokenType.RIGHT_PAREN); break;
            case '[': this.addToken(TokenType.LEFT_BRACKET); break;
            case ']': this.addToken(TokenType.RIGHT_BRACKET); break;
            case '\'': this.addToken(TokenType.QUOTE); break;
            case '`': this.addToken(TokenType.QUASIQUOTE); break;
            case ',':
                if (this.peek() === '@') {
                    this.advance();
                    this.addToken(TokenType.UNQUOTE_SPLICING);
                } else {
                    this.addToken(TokenType.UNQUOTE);
                }
                break;
            case '"': this.string(); break;
            case '#': this.hashLiteral(); break;
            case ';': this.comment(); break;
            case ' ':
            case '\r':
            case '\t':
                break;
            case '\n':
                this.line++;
                this.column = 1;
                break;
            default:
                if (this.isDigit(char)) {
                    this.number();
                } else if (char === '-' || char === '+') {
                    // Could be number or symbol
                    if (this.isDigit(this.peek())) {
                        this.number();
                    } else if (char === '-' && this.peek() === '>' || this.isSymbolChar(this.peek())) {
                        this.symbol();
                    } else if (this.isDelimiter(this.peek())) {
                        // Standalone + or -
                        this.addToken(TokenType.SYMBOL);
                    } else {
                        this.symbol();
                    }
                } else if (char === '.') {
                    if (this.isDigit(this.peek())) {
                        this.number();
                    } else if (this.isWhitespace(this.peek()) || this.peek() === ')' || this.peek() === ']' || this.isAtEnd()) {
                        this.addToken(TokenType.DOT);
                    } else {
                        this.symbol();
                    }
                } else if (this.isSymbolStart(char)) {
                    this.symbol();
                } else {
                    throw new LexerError(`Unexpected character: '${char}'`, this.line, this.startColumn);
                }
        }
    }

    string() {
        let value = '';
        const startLine = this.line;
        const startCol = this.startColumn;

        while (this.peek() !== '"' && !this.isAtEnd()) {
            if (this.peek() === '\n') {
                this.line++;
                this.column = 1;
            }

            if (this.peek() === '\\') {
                this.advance();
                const escaped = this.advance();
                switch (escaped) {
                    case 'n': value += '\n'; break;
                    case 't': value += '\t'; break;
                    case 'r': value += '\r'; break;
                    case '\\': value += '\\'; break;
                    case '"': value += '"'; break;
                    case '0': value += '\0'; break;
                    default:
                        throw new LexerError(`Invalid escape sequence: \\${escaped}`, this.line, this.column);
                }
            } else {
                value += this.advance();
            }
        }

        if (this.isAtEnd()) {
            throw new LexerError('Unterminated string', startLine, startCol);
        }

        this.advance(); // Closing "
        this.addToken(TokenType.STRING, value);
    }

    number() {
        // We've already consumed the first character, back up
        this.current = this.start;
        this.column = this.startColumn;

        // Handle sign
        if (this.peek() === '-' || this.peek() === '+') {
            this.advance();
        }

        // Check for special case: just a dot starting a number like .5
        const startedWithDot = this.peek() === '.';

        // Integer part
        while (this.isDigit(this.peek())) {
            this.advance();
        }

        // Decimal part
        if (this.peek() === '.' && (this.isDigit(this.peekNext()) || startedWithDot)) {
            this.advance(); // consume .
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }

        // Exponent part
        if (this.peek() === 'e' || this.peek() === 'E') {
            this.advance();
            if (this.peek() === '+' || this.peek() === '-') {
                this.advance();
            }
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }

        const lexeme = this.source.substring(this.start, this.current);
        const value = parseFloat(lexeme);

        if (isNaN(value)) {
            throw new LexerError(`Invalid number: ${lexeme}`, this.line, this.startColumn);
        }

        this.addToken(TokenType.NUMBER, value);
    }

    symbol() {
        while (this.isSymbolChar(this.peek()) && !this.isAtEnd()) {
            this.advance();
        }

        const lexeme = this.source.substring(this.start, this.current);
        this.addToken(TokenType.SYMBOL, lexeme);
    }

    hashLiteral() {
        const next = this.peek();

        switch (next) {
            case 't':
            case 'T':
                this.advance();
                // Check it's not part of a longer symbol like #true
                if (!this.isSymbolChar(this.peek())) {
                    this.addToken(TokenType.BOOLEAN, true);
                } else if (this.matchString('rue')) {
                    this.addToken(TokenType.BOOLEAN, true);
                } else {
                    throw new LexerError(`Unknown hash literal`, this.line, this.startColumn);
                }
                break;
            case 'f':
            case 'F':
                this.advance();
                if (!this.isSymbolChar(this.peek())) {
                    this.addToken(TokenType.BOOLEAN, false);
                } else if (this.matchString('alse')) {
                    this.addToken(TokenType.BOOLEAN, false);
                } else {
                    throw new LexerError(`Unknown hash literal`, this.line, this.startColumn);
                }
                break;
            case '\\':
                this.advance();
                this.characterLiteral();
                break;
            default:
                throw new LexerError(`Unknown hash literal: #${next}`, this.line, this.startColumn);
        }
    }

    characterLiteral() {
        // Check for named characters
        if (this.matchString('newline')) {
            this.addToken(TokenType.STRING, '\n');
        } else if (this.matchString('space')) {
            this.addToken(TokenType.STRING, ' ');
        } else if (this.matchString('tab')) {
            this.addToken(TokenType.STRING, '\t');
        } else if (this.matchString('return')) {
            this.addToken(TokenType.STRING, '\r');
        } else if (!this.isAtEnd()) {
            // Single character
            const char = this.advance();
            this.addToken(TokenType.STRING, char);
        } else {
            throw new LexerError('Incomplete character literal', this.line, this.startColumn);
        }
    }

    comment() {
        while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance();
        }
    }

    matchString(str) {
        for (let i = 0; i < str.length; i++) {
            if (this.peek() !== str[i]) {
                return false;
            }
            this.advance();
        }
        return true;
    }

    advance() {
        const char = this.source[this.current];
        this.current++;
        this.column++;
        return char;
    }

    peek() {
        if (this.isAtEnd()) return '\0';
        return this.source[this.current];
    }

    peekNext() {
        if (this.current + 1 >= this.source.length) return '\0';
        return this.source[this.current + 1];
    }

    isAtEnd() {
        return this.current >= this.source.length;
    }

    isDigit(c) {
        return c >= '0' && c <= '9';
    }

    isWhitespace(c) {
        return c === ' ' || c === '\t' || c === '\r' || c === '\n';
    }

    isDelimiter(c) {
        return this.isWhitespace(c) || c === '(' || c === ')' || c === '[' || c === ']' || c === '"' || c === ';' || c === '\0';
    }

    isSymbolStart(c) {
        return /[a-zA-Z!$%&*\/:<=>?@^_~]/.test(c);
    }

    isSymbolChar(c) {
        return /[a-zA-Z0-9!$%&*+\-.\/:<=>\?@^_~]/.test(c);
    }

    addToken(type, literal = null) {
        const lexeme = this.source.substring(this.start, this.current);
        this.tokens.push(new Token(type, lexeme, literal, this.line, this.startColumn));
    }
}

// ES Module exports
export { TokenType, Token, Lexer };

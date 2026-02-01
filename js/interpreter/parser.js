// Parser for the LISP interpreter - converts tokens to AST

import { TokenType } from './lexer.js';
import { ParseError } from './errors.js';

// AST Node classes
class Expr {
    accept(visitor) {
        throw new Error('Must implement accept');
    }
}

class LiteralExpr extends Expr {
    constructor(value) {
        super();
        this.value = value;
    }
}

class SymbolExpr extends Expr {
    constructor(name, line = null, column = null) {
        super();
        this.name = name;
        this.line = line;
        this.column = column;
    }
}

class ListExpr extends Expr {
    constructor(elements, line = null, column = null) {
        super();
        this.elements = elements;
        this.line = line;
        this.column = column;
    }
}

class QuoteExpr extends Expr {
    constructor(expression) {
        super();
        this.expression = expression;
    }
}

class DottedPairExpr extends Expr {
    constructor(car, cdr) {
        super();
        this.car = car;
        this.cdr = cdr;
    }
}

// Parser class
class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.current = 0;
    }

    parse() {
        const expressions = [];
        while (!this.isAtEnd()) {
            expressions.push(this.expression());
        }
        return expressions;
    }

    expression() {
        // Handle quote shorthand: 'x -> (quote x)
        if (this.match(TokenType.QUOTE)) {
            const expr = this.expression();
            return new QuoteExpr(expr);
        }

        // Handle quasiquote: `x -> (quasiquote x)
        if (this.match(TokenType.QUASIQUOTE)) {
            const expr = this.expression();
            return new ListExpr([
                new SymbolExpr('quasiquote'),
                expr
            ]);
        }

        // Handle unquote: ,x -> (unquote x)
        if (this.match(TokenType.UNQUOTE)) {
            const expr = this.expression();
            return new ListExpr([
                new SymbolExpr('unquote'),
                expr
            ]);
        }

        // Handle unquote-splicing: ,@x -> (unquote-splicing x)
        if (this.match(TokenType.UNQUOTE_SPLICING)) {
            const expr = this.expression();
            return new ListExpr([
                new SymbolExpr('unquote-splicing'),
                expr
            ]);
        }

        // List
        if (this.match(TokenType.LEFT_PAREN)) {
            return this.list(TokenType.RIGHT_PAREN);
        }

        // Bracket list (alternative syntax)
        if (this.match(TokenType.LEFT_BRACKET)) {
            return this.list(TokenType.RIGHT_BRACKET);
        }

        // Atoms
        return this.atom();
    }

    list(closeToken) {
        const startToken = this.previous();
        const elements = [];

        while (!this.check(closeToken) && !this.isAtEnd()) {
            // Check for dotted pair
            if (this.match(TokenType.DOT)) {
                if (elements.length === 0) {
                    throw new ParseError('Unexpected dot at start of list',
                        this.previous().line, this.previous().column);
                }
                const cdr = this.expression();
                this.consume(closeToken, `Expect '${closeToken === TokenType.RIGHT_PAREN ? ')' : ']'}' after dotted pair`);

                // Build proper dotted pair structure
                let result = cdr;
                for (let i = elements.length - 1; i >= 0; i--) {
                    result = new DottedPairExpr(elements[i], result);
                }
                return result;
            }

            elements.push(this.expression());
        }

        this.consume(closeToken, `Expect '${closeToken === TokenType.RIGHT_PAREN ? ')' : ']'}' after list`);
        return new ListExpr(elements, startToken.line, startToken.column);
    }

    atom() {
        if (this.match(TokenType.NUMBER)) {
            return new LiteralExpr(this.previous().literal);
        }

        if (this.match(TokenType.STRING)) {
            return new LiteralExpr(this.previous().literal);
        }

        if (this.match(TokenType.BOOLEAN)) {
            return new LiteralExpr(this.previous().literal);
        }

        if (this.match(TokenType.SYMBOL)) {
            const token = this.previous();
            return new SymbolExpr(token.literal || token.lexeme, token.line, token.column);
        }

        const token = this.peek();
        throw new ParseError(`Unexpected token: ${token.lexeme}`, token.line, token.column);
    }

    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    check(type) {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    advance() {
        if (!this.isAtEnd()) {
            this.current++;
        }
        return this.previous();
    }

    previous() {
        return this.tokens[this.current - 1];
    }

    peek() {
        return this.tokens[this.current];
    }

    isAtEnd() {
        return this.peek().type === TokenType.EOF;
    }

    consume(type, message) {
        if (this.check(type)) {
            return this.advance();
        }
        const token = this.peek();
        throw new ParseError(message, token.line, token.column);
    }
}

// ES Module exports
export { Expr, LiteralExpr, SymbolExpr, ListExpr, QuoteExpr, DottedPairExpr, Parser };

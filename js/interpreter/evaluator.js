// Evaluator for the LISP interpreter

import { RuntimeError } from './errors.js';
import {
    NIL, VOID, UNDEFINED,
    LispSymbol, Pair, Procedure, NativeProcedure,
    intern, isNil, isPair, isList, isSymbol, isNumber, isString, isBoolean, isProcedure,
    arrayToList, listToArray, listLength, deepEqual, stringify, display
} from './types.js';
import { LiteralExpr, SymbolExpr, ListExpr, QuoteExpr, DottedPairExpr } from './parser.js';
import { Environment } from './environment.js';

// Special forms that need custom evaluation
const SPECIAL_FORMS = new Set([
    'define', 'lambda', 'if', 'cond', 'let', 'let*', 'letrec',
    'begin', 'quote', 'set!', 'and', 'or', 'do'
]);

// Tail call marker for TCO
class TailCall {
    constructor(expr, env) {
        this.expr = expr;
        this.env = env;
    }
}

class Evaluator {
    constructor(globalEnv) {
        this.globalEnv = globalEnv;
        this.outputCollector = null;
    }

    setOutput(collector) {
        this.outputCollector = collector;
    }

    evaluate(expr, env) {
        // Trampoline loop for tail call optimization
        while (true) {
            // Literal - return value directly
            if (expr instanceof LiteralExpr) {
                return expr.value;
            }

            // Symbol - look up in environment
            if (expr instanceof SymbolExpr) {
                try {
                    return env.get(expr.name);
                } catch (e) {
                    throw new RuntimeError(`${e.message}`, expr.line, expr.column);
                }
            }

            // Quote - return unevaluated
            if (expr instanceof QuoteExpr) {
                return this.quoteToValue(expr.expression);
            }

            // Dotted pair
            if (expr instanceof DottedPairExpr) {
                return new Pair(
                    this.evaluate(expr.car, env),
                    this.evaluate(expr.cdr, env)
                );
            }

            // List - could be special form or procedure call
            if (expr instanceof ListExpr) {
                if (expr.elements.length === 0) {
                    return NIL;
                }

                const first = expr.elements[0];

                // Check for special forms
                if (first instanceof SymbolExpr && SPECIAL_FORMS.has(first.name)) {
                    const result = this.evalSpecialForm(first.name, expr.elements.slice(1), env);

                    // Handle tail call optimization
                    if (result instanceof TailCall) {
                        expr = result.expr;
                        env = result.env;
                        continue;
                    }
                    return result;
                }

                // Regular procedure call
                const proc = this.evaluate(first, env);
                const args = expr.elements.slice(1).map(arg => this.evaluate(arg, env));

                if (proc instanceof NativeProcedure) {
                    return proc.apply(args, this, env);
                }

                if (proc instanceof Procedure) {
                    // Create new environment for procedure body
                    const procEnv = new Environment(proc.closure);
                    this.bindArguments(proc, args, procEnv);

                    // Evaluate body, with TCO for last expression
                    for (let i = 0; i < proc.body.length - 1; i++) {
                        this.evaluate(proc.body[i], procEnv);
                    }

                    // Tail call - loop instead of recurse
                    if (proc.body.length > 0) {
                        expr = proc.body[proc.body.length - 1];
                        env = procEnv;
                        continue;
                    }
                    return VOID;
                }

                throw new RuntimeError(`${stringify(proc)} is not a procedure`, expr.line, expr.column);
            }

            throw new RuntimeError(`Cannot evaluate: ${expr}`);
        }
    }

    evalSpecialForm(name, args, env) {
        switch (name) {
            case 'define': return this.evalDefine(args, env);
            case 'lambda': return this.evalLambda(args, env);
            case 'if': return this.evalIf(args, env);
            case 'cond': return this.evalCond(args, env);
            case 'let': return this.evalLet(args, env);
            case 'let*': return this.evalLetStar(args, env);
            case 'letrec': return this.evalLetrec(args, env);
            case 'begin': return this.evalBegin(args, env);
            case 'quote': return this.quoteToValue(args[0]);
            case 'set!': return this.evalSet(args, env);
            case 'and': return this.evalAnd(args, env);
            case 'or': return this.evalOr(args, env);
            case 'do': return this.evalDo(args, env);
            default:
                throw new RuntimeError(`Unknown special form: ${name}`);
        }
    }

    evalDefine(args, env) {
        // (define x 10)
        if (args[0] instanceof SymbolExpr) {
            const name = args[0].name;
            const value = args.length > 1 ? this.evaluate(args[1], env) : VOID;
            env.define(name, value);
            return VOID;
        }

        // (define (f x y) body...) - shorthand for (define f (lambda (x y) body...))
        if (args[0] instanceof ListExpr) {
            const signature = args[0].elements;
            if (signature.length === 0 || !(signature[0] instanceof SymbolExpr)) {
                throw new RuntimeError('Invalid define syntax: expected function name');
            }
            const name = signature[0].name;
            const params = signature.slice(1);
            const body = args.slice(1);

            const proc = this.createProcedure(params, body, env, name);
            env.define(name, proc);
            return VOID;
        }

        throw new RuntimeError('Invalid define syntax');
    }

    evalLambda(args, env) {
        if (args.length < 2) {
            throw new RuntimeError('lambda requires parameters and body');
        }

        let params;
        if (args[0] instanceof ListExpr) {
            params = args[0].elements;
        } else if (args[0] instanceof SymbolExpr) {
            // (lambda args body) - variadic with all args in single list
            const proc = new Procedure([], args.slice(1), env);
            proc.isVariadic = true;
            proc.restParam = args[0].name;
            return proc;
        } else {
            params = [];
        }

        const body = args.slice(1);
        return this.createProcedure(params, body, env);
    }

    createProcedure(paramExprs, body, env, name = null) {
        const proc = new Procedure([], body, env, name);

        for (let i = 0; i < paramExprs.length; i++) {
            const param = paramExprs[i];

            // Check for rest parameter: (lambda (x y . rest) ...)
            if (param instanceof SymbolExpr && param.name === '.') {
                if (i + 1 >= paramExprs.length) {
                    throw new RuntimeError('Expected parameter name after dot');
                }
                proc.isVariadic = true;
                proc.restParam = paramExprs[i + 1].name;
                break;
            }

            if (!(param instanceof SymbolExpr)) {
                throw new RuntimeError('Parameter must be a symbol');
            }
            proc.params.push(param.name);
        }

        return proc;
    }

    evalIf(args, env) {
        if (args.length < 2) {
            throw new RuntimeError('if requires at least 2 arguments');
        }

        const test = this.evaluate(args[0], env);

        if (this.isTruthy(test)) {
            return new TailCall(args[1], env);
        } else if (args.length > 2) {
            return new TailCall(args[2], env);
        }
        return VOID;
    }

    evalCond(args, env) {
        for (const clause of args) {
            if (!(clause instanceof ListExpr) || clause.elements.length === 0) {
                throw new RuntimeError('Invalid cond clause');
            }

            const elements = clause.elements;
            const test = elements[0];

            // Handle else clause
            if (test instanceof SymbolExpr && test.name === 'else') {
                if (elements.length === 1) {
                    return true;
                }
                return this.evalSequence(elements.slice(1), env);
            }

            const testResult = this.evaluate(test, env);
            if (this.isTruthy(testResult)) {
                if (elements.length === 1) {
                    return testResult;
                }
                // Check for => syntax: (cond (test => proc))
                if (elements.length === 3 &&
                    elements[1] instanceof SymbolExpr &&
                    elements[1].name === '=>') {
                    const proc = this.evaluate(elements[2], env);
                    if (proc instanceof NativeProcedure) {
                        return proc.apply([testResult], this, env);
                    }
                    if (proc instanceof Procedure) {
                        const procEnv = new Environment(proc.closure);
                        this.bindArguments(proc, [testResult], procEnv);
                        return this.evalSequence(proc.body, procEnv);
                    }
                    throw new RuntimeError('=> requires a procedure');
                }
                return this.evalSequence(elements.slice(1), env);
            }
        }
        return VOID;
    }

    evalLet(args, env) {
        if (args.length < 2) {
            throw new RuntimeError('let requires bindings and body');
        }

        // Named let: (let name ((x 1) (y 2)) body...)
        if (args[0] instanceof SymbolExpr) {
            return this.evalNamedLet(args, env);
        }

        if (!(args[0] instanceof ListExpr)) {
            throw new RuntimeError('let requires a binding list');
        }

        const bindings = args[0].elements;
        const body = args.slice(1);

        const letEnv = new Environment(env);

        for (const binding of bindings) {
            if (!(binding instanceof ListExpr) || binding.elements.length !== 2) {
                throw new RuntimeError('Invalid let binding');
            }
            if (!(binding.elements[0] instanceof SymbolExpr)) {
                throw new RuntimeError('Binding name must be a symbol');
            }
            const name = binding.elements[0].name;
            const value = this.evaluate(binding.elements[1], env);
            letEnv.define(name, value);
        }

        return this.evalSequence(body, letEnv);
    }

    evalNamedLet(args, env) {
        const name = args[0].name;
        const bindings = args[1].elements;
        const body = args.slice(2);

        const params = [];
        const initValues = [];

        for (const binding of bindings) {
            if (!(binding instanceof ListExpr) || binding.elements.length !== 2) {
                throw new RuntimeError('Invalid let binding');
            }
            params.push(binding.elements[0]);
            initValues.push(this.evaluate(binding.elements[1], env));
        }

        // Create the loop procedure
        const loopEnv = new Environment(env);
        const proc = this.createProcedure(params, body, loopEnv, name);
        loopEnv.define(name, proc);

        // Call it with initial values
        const callEnv = new Environment(loopEnv);
        this.bindArguments(proc, initValues, callEnv);
        return this.evalSequence(body, callEnv);
    }

    evalLetStar(args, env) {
        if (args.length < 2) {
            throw new RuntimeError('let* requires bindings and body');
        }

        if (!(args[0] instanceof ListExpr)) {
            throw new RuntimeError('let* requires a binding list');
        }

        const bindings = args[0].elements;
        const body = args.slice(1);

        let currentEnv = env;

        for (const binding of bindings) {
            if (!(binding instanceof ListExpr) || binding.elements.length !== 2) {
                throw new RuntimeError('Invalid let* binding');
            }
            if (!(binding.elements[0] instanceof SymbolExpr)) {
                throw new RuntimeError('Binding name must be a symbol');
            }
            const newEnv = new Environment(currentEnv);
            const name = binding.elements[0].name;
            const value = this.evaluate(binding.elements[1], currentEnv);
            newEnv.define(name, value);
            currentEnv = newEnv;
        }

        return this.evalSequence(body, currentEnv);
    }

    evalLetrec(args, env) {
        if (args.length < 2) {
            throw new RuntimeError('letrec requires bindings and body');
        }

        if (!(args[0] instanceof ListExpr)) {
            throw new RuntimeError('letrec requires a binding list');
        }

        const bindings = args[0].elements;
        const body = args.slice(1);

        const letEnv = new Environment(env);

        // First pass: bind all names to undefined
        for (const binding of bindings) {
            if (!(binding instanceof ListExpr) || binding.elements.length !== 2) {
                throw new RuntimeError('Invalid letrec binding');
            }
            if (!(binding.elements[0] instanceof SymbolExpr)) {
                throw new RuntimeError('Binding name must be a symbol');
            }
            letEnv.define(binding.elements[0].name, UNDEFINED);
        }

        // Second pass: evaluate and assign values
        for (const binding of bindings) {
            const name = binding.elements[0].name;
            const value = this.evaluate(binding.elements[1], letEnv);
            letEnv.set(name, value);
        }

        return this.evalSequence(body, letEnv);
    }

    evalBegin(args, env) {
        return this.evalSequence(args, env);
    }

    evalSequence(exprs, env) {
        if (exprs.length === 0) {
            return VOID;
        }

        for (let i = 0; i < exprs.length - 1; i++) {
            this.evaluate(exprs[i], env);
        }

        // Return tail call for last expression
        return new TailCall(exprs[exprs.length - 1], env);
    }

    evalSet(args, env) {
        if (args.length !== 2) {
            throw new RuntimeError('set! requires 2 arguments');
        }

        if (!(args[0] instanceof SymbolExpr)) {
            throw new RuntimeError('set! requires a symbol');
        }

        const name = args[0].name;
        const value = this.evaluate(args[1], env);
        env.set(name, value);
        return VOID;
    }

    evalAnd(args, env) {
        let result = true;
        for (let i = 0; i < args.length; i++) {
            result = this.evaluate(args[i], env);
            if (!this.isTruthy(result)) {
                return false;
            }
        }
        return result;
    }

    evalOr(args, env) {
        for (let i = 0; i < args.length; i++) {
            const result = this.evaluate(args[i], env);
            if (this.isTruthy(result)) {
                return result;
            }
        }
        return false;
    }

    evalDo(args, env) {
        // (do ((var init step) ...) (test expr ...) body ...)
        if (args.length < 2) {
            throw new RuntimeError('do requires bindings and test clause');
        }

        const bindings = args[0].elements;
        const testClause = args[1].elements;
        const body = args.slice(2);

        const doEnv = new Environment(env);

        // Initialize variables
        const varNames = [];
        const stepExprs = [];

        for (const binding of bindings) {
            if (!(binding instanceof ListExpr) || binding.elements.length < 2) {
                throw new RuntimeError('Invalid do binding');
            }
            const name = binding.elements[0].name;
            const init = this.evaluate(binding.elements[1], env);
            doEnv.define(name, init);
            varNames.push(name);
            stepExprs.push(binding.elements.length > 2 ? binding.elements[2] : null);
        }

        // Loop
        while (true) {
            // Test
            if (this.isTruthy(this.evaluate(testClause[0], doEnv))) {
                // Return test result expressions
                if (testClause.length > 1) {
                    let result = VOID;
                    for (let i = 1; i < testClause.length; i++) {
                        result = this.evaluate(testClause[i], doEnv);
                    }
                    return result;
                }
                return VOID;
            }

            // Execute body
            for (const expr of body) {
                this.evaluate(expr, doEnv);
            }

            // Step
            const newValues = [];
            for (let i = 0; i < varNames.length; i++) {
                if (stepExprs[i]) {
                    newValues.push(this.evaluate(stepExprs[i], doEnv));
                } else {
                    newValues.push(doEnv.get(varNames[i]));
                }
            }
            for (let i = 0; i < varNames.length; i++) {
                doEnv.set(varNames[i], newValues[i]);
            }
        }
    }

    bindArguments(proc, args, env) {
        // Check arity
        if (!proc.isVariadic && args.length !== proc.params.length) {
            throw new RuntimeError(
                `${proc.name || 'procedure'} expects ${proc.params.length} argument${proc.params.length === 1 ? '' : 's'}, got ${args.length}`
            );
        }

        if (proc.isVariadic && args.length < proc.params.length) {
            throw new RuntimeError(
                `${proc.name || 'procedure'} expects at least ${proc.params.length} argument${proc.params.length === 1 ? '' : 's'}, got ${args.length}`
            );
        }

        // Bind regular parameters
        for (let i = 0; i < proc.params.length; i++) {
            env.define(proc.params[i], args[i]);
        }

        // Bind rest parameter
        if (proc.isVariadic) {
            const rest = args.slice(proc.params.length);
            env.define(proc.restParam, arrayToList(rest));
        }
    }

    isTruthy(value) {
        // In Scheme, only #f is falsy
        return value !== false;
    }

    quoteToValue(expr) {
        if (expr instanceof LiteralExpr) {
            return expr.value;
        }
        if (expr instanceof SymbolExpr) {
            return intern(expr.name);
        }
        if (expr instanceof ListExpr) {
            if (expr.elements.length === 0) {
                return NIL;
            }
            return arrayToList(expr.elements.map(e => this.quoteToValue(e)));
        }
        if (expr instanceof DottedPairExpr) {
            return new Pair(
                this.quoteToValue(expr.car),
                this.quoteToValue(expr.cdr)
            );
        }
        if (expr instanceof QuoteExpr) {
            return arrayToList([
                intern('quote'),
                this.quoteToValue(expr.expression)
            ]);
        }
        return expr;
    }

    // Helper to call a procedure (used by higher-order functions)
    callProcedure(proc, args) {
        if (proc instanceof NativeProcedure) {
            return proc.apply(args, this, this.globalEnv);
        }

        if (proc instanceof Procedure) {
            const procEnv = new Environment(proc.closure);
            this.bindArguments(proc, args, procEnv);

            let result = VOID;
            for (const expr of proc.body) {
                result = this.evaluate(expr, procEnv);
            }
            return result;
        }

        throw new RuntimeError(`${stringify(proc)} is not a procedure`);
    }
}

// ES Module exports
export { SPECIAL_FORMS, TailCall, Evaluator };

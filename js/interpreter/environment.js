// Environment class for managing variable scopes

import { RuntimeError } from './errors.js';

class Environment {
    constructor(parent = null) {
        this.bindings = new Map();
        this.parent = parent;
    }

    define(name, value) {
        this.bindings.set(name, value);
    }

    get(name) {
        if (this.bindings.has(name)) {
            return this.bindings.get(name);
        }
        if (this.parent) {
            return this.parent.get(name);
        }
        throw new RuntimeError(`Undefined variable: ${name}`);
    }

    set(name, value) {
        if (this.bindings.has(name)) {
            this.bindings.set(name, value);
            return;
        }
        if (this.parent) {
            this.parent.set(name, value);
            return;
        }
        throw new RuntimeError(`Cannot set undefined variable: ${name}`);
    }

    has(name) {
        if (this.bindings.has(name)) {
            return true;
        }
        if (this.parent) {
            return this.parent.has(name);
        }
        return false;
    }

    // Get all bindings including from parent scopes
    getAllBindings() {
        const result = new Map();
        let env = this;
        while (env) {
            for (const [key, value] of env.bindings) {
                if (!result.has(key)) {
                    result.set(key, value);
                }
            }
            env = env.parent;
        }
        return result;
    }

    // Count bindings in current scope only
    size() {
        return this.bindings.size;
    }
}

// ES Module exports
export { Environment };

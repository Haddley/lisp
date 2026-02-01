// Unit tests for Environment

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Environment, RuntimeError } from '../setup/test-helper.js';

describe('Environment', () => {
    describe('define', () => {
        it('creates a binding', () => {
            const env = new Environment();
            env.define('x', 42);

            assert.strictEqual(env.get('x'), 42);
        });

        it('allows redefining', () => {
            const env = new Environment();
            env.define('x', 1);
            env.define('x', 2);

            assert.strictEqual(env.get('x'), 2);
        });

        it('can define any value', () => {
            const env = new Environment();
            env.define('num', 42);
            env.define('str', 'hello');
            env.define('bool', true);
            env.define('nil', null);

            assert.strictEqual(env.get('num'), 42);
            assert.strictEqual(env.get('str'), 'hello');
            assert.strictEqual(env.get('bool'), true);
            assert.strictEqual(env.get('nil'), null);
        });
    });

    describe('get', () => {
        it('retrieves defined value', () => {
            const env = new Environment();
            env.define('foo', 'bar');

            assert.strictEqual(env.get('foo'), 'bar');
        });

        it('throws on undefined variable', () => {
            const env = new Environment();

            assert.throws(
                () => env.get('undefined_var'),
                (err) => err instanceof RuntimeError && /[Uu]ndefined/.test(err.message)
            );
        });

        it('looks up in parent scope', () => {
            const parent = new Environment();
            parent.define('x', 10);

            const child = new Environment(parent);

            assert.strictEqual(child.get('x'), 10);
        });

        it('looks up through multiple parent scopes', () => {
            const grandparent = new Environment();
            grandparent.define('x', 1);

            const parent = new Environment(grandparent);
            const child = new Environment(parent);

            assert.strictEqual(child.get('x'), 1);
        });

        it('returns local value over parent value', () => {
            const parent = new Environment();
            parent.define('x', 'parent');

            const child = new Environment(parent);
            child.define('x', 'child');

            assert.strictEqual(child.get('x'), 'child');
            assert.strictEqual(parent.get('x'), 'parent');
        });
    });

    describe('set', () => {
        it('updates existing binding', () => {
            const env = new Environment();
            env.define('x', 1);
            env.set('x', 2);

            assert.strictEqual(env.get('x'), 2);
        });

        it('throws on undefined variable', () => {
            const env = new Environment();

            assert.throws(
                () => env.set('undefined_var', 42),
                (err) => err instanceof RuntimeError && /[Uu]ndefined|[Cc]annot set/.test(err.message)
            );
        });

        it('updates binding in parent scope', () => {
            const parent = new Environment();
            parent.define('x', 1);

            const child = new Environment(parent);
            child.set('x', 2);

            assert.strictEqual(parent.get('x'), 2);
            assert.strictEqual(child.get('x'), 2);
        });

        it('does not create new binding in child', () => {
            const parent = new Environment();
            parent.define('x', 1);

            const child = new Environment(parent);
            child.set('x', 2);

            // Child should not have its own binding
            assert.strictEqual(child.bindings.has('x'), false);
        });
    });

    describe('has', () => {
        it('returns true for defined variable', () => {
            const env = new Environment();
            env.define('x', 42);

            assert.strictEqual(env.has('x'), true);
        });

        it('returns false for undefined variable', () => {
            const env = new Environment();

            assert.strictEqual(env.has('x'), false);
        });

        it('checks parent scopes', () => {
            const parent = new Environment();
            parent.define('x', 42);

            const child = new Environment(parent);

            assert.strictEqual(child.has('x'), true);
        });
    });

    describe('getAllBindings', () => {
        it('returns empty map for empty environment', () => {
            const env = new Environment();
            const bindings = env.getAllBindings();

            assert.strictEqual(bindings.size, 0);
        });

        it('returns all local bindings', () => {
            const env = new Environment();
            env.define('a', 1);
            env.define('b', 2);

            const bindings = env.getAllBindings();

            assert.strictEqual(bindings.get('a'), 1);
            assert.strictEqual(bindings.get('b'), 2);
        });

        it('includes parent bindings', () => {
            const parent = new Environment();
            parent.define('x', 1);

            const child = new Environment(parent);
            child.define('y', 2);

            const bindings = child.getAllBindings();

            assert.strictEqual(bindings.get('x'), 1);
            assert.strictEqual(bindings.get('y'), 2);
        });

        it('child shadows parent', () => {
            const parent = new Environment();
            parent.define('x', 'parent');

            const child = new Environment(parent);
            child.define('x', 'child');

            const bindings = child.getAllBindings();

            assert.strictEqual(bindings.get('x'), 'child');
        });
    });

    describe('size', () => {
        it('returns 0 for empty environment', () => {
            const env = new Environment();
            assert.strictEqual(env.size(), 0);
        });

        it('returns number of local bindings', () => {
            const env = new Environment();
            env.define('a', 1);
            env.define('b', 2);
            env.define('c', 3);

            assert.strictEqual(env.size(), 3);
        });

        it('does not count parent bindings', () => {
            const parent = new Environment();
            parent.define('x', 1);

            const child = new Environment(parent);
            child.define('y', 2);

            assert.strictEqual(child.size(), 1);
        });
    });

    describe('scope chains', () => {
        it('supports deeply nested scopes', () => {
            let env = new Environment();
            env.define('level', 0);

            for (let i = 1; i <= 10; i++) {
                env = new Environment(env);
                env.define('level', i);
            }

            assert.strictEqual(env.get('level'), 10);
        });

        it('maintains separate scopes for siblings', () => {
            const parent = new Environment();
            parent.define('shared', 'parent');

            const child1 = new Environment(parent);
            child1.define('local', 'child1');

            const child2 = new Environment(parent);
            child2.define('local', 'child2');

            assert.strictEqual(child1.get('local'), 'child1');
            assert.strictEqual(child2.get('local'), 'child2');
            assert.strictEqual(child1.has('local'), true);
            assert.strictEqual(child2.has('local'), true);
        });
    });
});

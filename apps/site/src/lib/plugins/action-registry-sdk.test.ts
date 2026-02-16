import { createActionRegistry } from 'supersurkhet-sdk';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('supersurkhet-sdk ActionRegistry', () => {
  it('infers action id from input object without explicit id generic', async () => {
    const registry = createActionRegistry().defineAction({
      id: 'math.multiply',
      handler: async (input: { a: number; b: number }) => ({
        product: input.a * input.b,
      }),
    });

    const result = await registry.call('math.multiply', { a: 3, b: 4 });
    expect(result).toEqual({ product: 12 });
    expectTypeOf(result).toEqualTypeOf<{ product: number }>();
  });

  it('chains defineAction with accumulated typed call signatures', async () => {
    const registry = createActionRegistry()
      .defineAction({
        id: 'math.add',
        description: 'Adds two numbers',
        handler: async (input: { a: number; b: number }) => ({
          sum: input.a + input.b,
        }),
      })
      .defineAction({
        id: 'text.echo',
        handler: async (input: { value: string }) => input.value,
      });

    const sum = await registry.call('math.add', { a: 2, b: 3 });
    const echoed = await registry.call('text.echo', { value: 'hello' });

    expect(sum).toEqual({ sum: 5 });
    expect(echoed).toBe('hello');
    expectTypeOf(sum).toEqualTypeOf<{ sum: number }>();
    expectTypeOf(echoed).toEqualTypeOf<string>();
  });

  it('emits manifest entries for all registered actions', () => {
    const registry = createActionRegistry()
      .defineAction({
        id: 'math.add',
        description: 'Adds two numbers',
        capabilities: ['math:read'],
        handler: async (input: { a: number; b: number }) => ({
          sum: input.a + input.b,
        }),
      })
      .defineAction({
        id: 'text.echo',
        handler: async (input: { value: string }) => input.value,
      });

    const manifest = registry.manifest();
    expect(manifest).toHaveLength(2);
    expect(manifest.map((entry) => entry.actionId).sort()).toEqual([
      'math.add',
      'text.echo',
    ]);
    expect(
      manifest.find((entry) => entry.actionId === 'math.add'),
    ).toMatchObject({
      actionId: 'math.add',
      description: 'Adds two numbers',
      capabilities: ['math:read'],
    });
  });
});

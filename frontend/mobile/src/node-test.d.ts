declare module "node:test" {
  export function describe(
    name: string,
    fn: () => void | Promise<void>,
  ): void;
  export function it(
    name: string,
    fn: () => void | Promise<void>,
  ): void;
}

declare module "node:assert/strict" {
  const assert: {
    ok(value: unknown, message?: string): asserts value;
    equal<T>(actual: T, expected: T, message?: string): void;
    deepEqual<T>(actual: T, expected: T, message?: string): void;
    match(value: string, regExp: RegExp, message?: string): void;
    doesNotMatch(value: string, regExp: RegExp, message?: string): void;
    throws(
      block: () => unknown,
      error?: RegExp | (new (...args: never[]) => Error),
      message?: string,
    ): void;
  };
  export default assert;
}

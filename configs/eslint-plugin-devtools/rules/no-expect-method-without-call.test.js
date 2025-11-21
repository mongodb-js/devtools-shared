'use strict';
const { RuleTester } = require('eslint');
const rule = require('./no-expect-method-without-call');

const ruleTester = new RuleTester();

ruleTester.run('no-expect-method-without-call', rule, {
  valid: [
    {
      code: 'expect(5 > 3).to.not.be.false',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'expect(5 > 3).to.be.true',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'expect("pineapple").to.be.a("string")',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'expect(5 + 5).to.equal(10)',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'expect(() => someFn()).to.throw()',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'expect(() => someFn()).to.not.throw()',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'expect(() => someFn()).to.not.throws()',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'expect(() => someFn()).to.not.Throw()',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: "expect(() => { throw new Error('test'); }).to.throw()",
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: "expect(function() { throw new Error('test'); }).to.throw()",
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'expect(() => someFn()).to.throw(Error)',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'expect(() => someFn()).to.not.throw(Error)',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: "expect(() => someFn()).to.throw('error message')",
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'expect(() => someFn()).to.throw(/error/)',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: `
it('should test something', () => {
  expect(() => dangerousFunction()).to.throw();
});`,
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'const result = expect(() => fn()).to.throw()',
      parserOptions: { ecmaVersion: 2021 },
    },
    // Valid - not using expect().to.throw.
    {
      code: 'expect(value).to.equal(5)',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      code: 'expect(promise).to.be.rejectedWith(Error)',
      parserOptions: { ecmaVersion: 2021 },
    },
    {
      options: [{ properties: ['throw'] }],
      code: `
      it("does not fail passed property", function() {
        expect(result).to.throw;
      });
    `,
    },
  ],

  invalid: [
    {
      code: 'expect(() => someFn()).to.throw',
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().to.throw must be invoked with parentheses, e.g., expect().to.throw()',
        },
      ],
    },
    {
      code: 'expect("pineapple").to.be.a',
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().to.be.a must be invoked with parentheses, e.g., expect().to.be.a()',
        },
      ],
    },
    {
      code: 'expect("pineapple").to.not.include',
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().to.not.include must be invoked with parentheses, e.g., expect().to.not.include()',
        },
      ],
    },
    {
      code: 'expect("pineapple").to.throw;',
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().to.throw must be invoked with parentheses, e.g., expect().to.throw()',
        },
      ],
    },
    {
      code: 'expect("pineapple").to.not.throw',
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().to.not.throw must be invoked with parentheses, e.g., expect().to.not.throw()',
        },
      ],
    },
    {
      code: 'expect(() => someFn()).to.not.throws',
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().to.not.throws must be invoked with parentheses, e.g., expect().to.not.throws()',
        },
      ],
    },
    {
      code: 'expect(() => someFn()).to.not.Throw',
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().to.not.Throw must be invoked with parentheses, e.g., expect().to.not.Throw()',
        },
      ],
    },
    {
      code: 'expect(() => someFn()).not.to.throw',
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().not.to.throw must be invoked with parentheses, e.g., expect().not.to.throw()',
        },
      ],
    },
    {
      code: 'expect(function() { throw new Error(); }).to.throw',
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().to.throw must be invoked with parentheses, e.g., expect().to.throw()',
        },
      ],
    },
    {
      code: `
it('should test something', () => {
  expect(() => dangerousFunction()).to.throw;
});`,
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().to.throw must be invoked with parentheses, e.g., expect().to.throw()',
        },
      ],
    },
    {
      code: 'const result = expect(() => fn()).to.throw',
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().to.throw must be invoked with parentheses, e.g., expect().to.throw()',
        },
      ],
    },
    {
      code: 'expect(async () => someFn()).to.throw',
      parserOptions: { ecmaVersion: 2021 },
      errors: [
        {
          message:
            'expect().to.throw must be invoked with parentheses, e.g., expect().to.throw()',
        },
      ],
    },
  ],
});

'use strict';
const { RuleTester } = require('@typescript-eslint/rule-tester');
const rule = require('./no-plain-object-records');

RuleTester.afterAll = after;
const ruleTester = new RuleTester();

ruleTester.run('no-plain-object-records', rule, {
  valid: [
    {
      code: 'const record: Record<string, number> = Object.create(null);',
    },
    {
      code: 'const record: Record<string, number> = {__proto__: null, a: 1, b: 2};',
    },
    {
      code: 'const record: Record<string, number> = {__proto__: 42, a: 1, b: 2};',
    },
    {
      code: 'const record: Record<string, number> = {a, b, __proto__: 42};',
    },
  ],

  invalid: [
    {
      code: 'const record: Record<string, number> = {a, b};',
      output: 'const record: Record<string, number> = {__proto__: null, a, b};',
      errors: [
        {
          message:
            '{} is not a good initializer for records. Use Object.create(null) instead.',
        },
      ],
    },
    {
      code: 'const record: Record<string, unknown> = {};',
      output: 'const record: Record<string, unknown> = Object.create(null);',
      errors: [
        {
          message:
            '{} is not a good initializer for records. Use Object.create(null) instead.',
        },
      ],
    },
    {
      code: 'let foo, record: Record<string, unknown> = {};',
      output: 'let foo, record: Record<string, unknown> = Object.create(null);',
      errors: [
        {
          message:
            '{} is not a good initializer for records. Use Object.create(null) instead.',
        },
      ],
    },
  ],
});

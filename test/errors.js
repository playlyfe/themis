var Themis = require('../src/themis');
var util = require('util');

describe('The error messages', function () {

  it('has an INVALID_TYPE check', function () {
    var schema = {
      type: 'object'
    };
    var data = [];
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'INVALID_TYPE',
           path: '',
           instance: [],
           message: 'Data should be of type object not array',
           validator: 'type',
           validator_value: 'object',
           schema: { type: 'object' },
           relative_schema_path: '/type',
           absolute_schema_path: '0#/type' } ],
      passed: 0,
      data: [] });
  });

  it('has an INVALID_FORMAT check', function () {
    var schema = {
      type: 'string',
      format: 'date'
    };
    var data = 'foo';
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'INVALID_FORMAT',
           path: '',
           instance: 'foo',
           message: '\"foo\" should match format date',
           validator: 'format',
           validator_value: 'date',
           schema: { type: 'string', format: 'date' },
           relative_schema_path: '/format',
           absolute_schema_path: '0#/format' } ],
      passed: 1,
      data: 'foo' });
  });

  it('has an ENUM_MISMATCH check', function () {
    var schema = {
      enum: ['string', 1, {}]
    };
    var data = 'foo';
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'ENUM_MISMATCH',
           path: '',
           instance: 'foo',
           message: '"foo" is not one of [ "string", 1, {} ]',
           validator: 'enum',
           validator_value: [ 'string', 1, {} ],
           schema: { enum: [ 'string', 1, {} ] },
           relative_schema_path: '/enum',
           absolute_schema_path: '0#/enum' } ],
      passed: 0,
      data: 'foo' });
  });

  it('has an ALL_OF_FAILED check', function () {
    var schema = {
      allOf: [
        { type: 'integer' },
        { type: 'number' }
      ]
    };
    var data = 1.5;
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'ALL_OF_FAILED',
           path: '',
           instance: 1.5,
           message: 'Data is not valid under all of the given schemas',
           validator: 'allOf',
           validator_value: [ { type: 'integer' }, { type: 'number' } ],
           schema: { allOf: [ { type: 'integer' }, { type: 'number' } ] },
           relative_schema_path: '/allOf',
           absolute_schema_path: '0#/allOf',
           context:
            [ { valid: false,
                passed: 0,
                errors: [ { code: 'INVALID_TYPE',
                            path: '',
                            instance: 1.5,
                            message: 'Data should be of type integer not number',
                            validator: 'type',
                            validator_value: 'integer',
                            schema: { type: 'integer' },
                            relative_schema_path: '/type',
                            absolute_schema_path: '0#/allOf/0/type' } ] } ] } ],
      passed: 0,
      data: 1.5 });
  });

  it('has an ANY_OF_MISSING check', function () {
    var schema = {
      anyOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'object' }
      ]
    };
    var data = [];
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'ANY_OF_MISSING',
           path: '',
           instance: [],
           message: 'Data is not valid under any of the given schemas',
           validator: 'anyOf',
           validator_value:
            [ { type: 'string' },
              { type: 'number' },
              { type: 'object' } ],
           schema:
            { anyOf:
               [ { type: 'string' },
                 { type: 'number' },
                 { type: 'object' } ] },
           relative_schema_path: '/anyOf',
           absolute_schema_path: '0#/anyOf',
           context:
            [ { valid: false,
                passed: 0,
                errors:
                 [ { code: 'INVALID_TYPE',
                     path: '',
                     instance: [],
                     message: 'Data should be of type string not array',
                     validator: 'type',
                     validator_value: 'string',
                     schema: { type: 'string' },
                     relative_schema_path: '/type',
                     absolute_schema_path: '0#/anyOf/0/type' } ] },
              { valid: false,
                passed: 0,
                errors:
                 [ { code: 'INVALID_TYPE',
                     path: '',
                     instance: [],
                     message: 'Data should be of type number not array',
                     validator: 'type',
                     validator_value: 'number',
                     schema: { type: 'number' },
                     relative_schema_path: '/type',
                     absolute_schema_path: '0#/anyOf/1/type' } ] },
              { valid: false,
                passed: 0,
                errors:
                 [ { code: 'INVALID_TYPE',
                     path: '',
                     instance: [],
                     message: 'Data should be of type object not array',
                     validator: 'type',
                     validator_value: 'object',
                     schema: { type: 'object' },
                     relative_schema_path: '/type',
                     absolute_schema_path: '0#/anyOf/2/type' } ] } ] } ],
      passed: 0,
      data: [] });
  });

  it('has a ONE_OF_MISSING check', function () {
    var schema = {
      oneOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'object' }
      ]
    };
    var data = [];
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'ONE_OF_MISSING',
           path: '',
           instance: [],
           message: 'Data is not valid under any of the given schemas',
           validator: 'oneOf',
           validator_value:
            [ { type: 'string' },
              { type: 'number' },
              { type: 'object' } ],
           schema:
            { oneOf:
               [ { type: 'string' },
                 { type: 'number' },
                 { type: 'object' } ] },
           relative_schema_path: '/oneOf',
           absolute_schema_path: '0#/oneOf',
           context:
            [ { valid: false,
                passed: 0,
                errors:
                 [ { code: 'INVALID_TYPE',
                     path: '',
                     instance: [],
                     message: 'Data should be of type string not array',
                     validator: 'type',
                     validator_value: 'string',
                     schema: { type: 'string' },
                     relative_schema_path: '/type',
                     absolute_schema_path: '0#/oneOf/0/type' } ] },
              { valid: false,
                passed: 0,
                errors:
                 [ { code: 'INVALID_TYPE',
                     path: '',
                     instance: [],
                     message: 'Data should be of type number not array',
                     validator: 'type',
                     validator_value: 'number',
                     schema: { type: 'number' },
                     relative_schema_path: '/type',
                     absolute_schema_path: '0#/oneOf/1/type' } ] },
              { valid: false,
                passed: 0,
                errors:
                 [ { code: 'INVALID_TYPE',
                     path: '',
                     instance: [],
                     message: 'Data should be of type object not array',
                     validator: 'type',
                     validator_value: 'object',
                     schema: { type: 'object' },
                     relative_schema_path: '/type',
                     absolute_schema_path: '0#/oneOf/2/type' } ] } ] } ],
      passed: 0,
      data: [] });
  });

  it('has a ONE_OF_MULTIPLE check', function () {
    var schema = {
      oneOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'integer' },
        { type: 'object' }
      ]
    };
    var data = 1;
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'ONE_OF_MULTIPLE',
           path: '',
           instance: 1,
           message: 'Data is valid under each of the given schemas, but should be valid under only one of them',
           validator: 'oneOf',
           validator_value:
            [ { type: 'string' },
              { type: 'number' },
              { type: 'integer' },
              { type: 'object' } ],
           schema:
            { oneOf:
               [ { type: 'string' },
                 { type: 'number' },
                 { type: 'integer' },
                 { type: 'object' } ] },
           relative_schema_path: '/oneOf',
           absolute_schema_path: '0#/oneOf',
           context:
            [ { valid: true, schema: { type: 'number' } },
              { valid: true, schema: { type: 'integer' } } ] } ],
      passed: 0,
      data: 1 });
  });

  it('has a NOT_PASSED check', function () {
    var schema = {
      not: {
        anyOf: [
          { type: 'integer' },
          { type: 'number' }
        ]
      }
    };
    var data = 1;
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'NOT_PASSED',
           path: '',
           instance: 1,
           message: 'Data should not match the given schema',
           validator: 'not',
           validator_value: { anyOf: [ { type: 'integer' }, { type: 'number' } ] },
           schema: { not: { anyOf: [ { type: 'integer' }, { type: 'number' } ] } },
           relative_schema_path: '/not',
           absolute_schema_path: '0#/not' } ],
      passed: 0,
      data: 1 });
    //console.log(util.inspect(report, { depth: 10, colors: true }));
  });

  it('has a ARRAY_LENGTH_SHORT check', function () {
    var schema = {
      type: 'array',
      minItems: 3
    };
    var data = [1];
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'ARRAY_LENGTH_SHORT',
           path: '',
           instance: [ 1 ],
           message: 'Array is too short, minimum 3',
           validator: 'minItems',
           validator_value: 3,
           schema: { type: 'array', minItems: 3 },
           relative_schema_path: '/minItems',
           absolute_schema_path: '0#/minItems' } ],
      passed: 1,
      data: [ 1 ] });
  });

  it('has a ARRAY_LENGTH_LONG check', function () {
    var schema = {
      type: 'array',
      maxItems: 3
    };
    var data = [1,2,3,4];
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'ARRAY_LENGTH_LONG',
           path: '',
           instance: [ 1, 2, 3, 4 ],
           message: 'Array is too long, maximum 3',
           validator: 'maxItems',
           validator_value: 3,
           schema: { type: 'array', maxItems: 3 },
           relative_schema_path: '/maxItems',
           absolute_schema_path: '0#/maxItems' } ],
      passed: 1,
      data: [ 1, 2, 3, 4 ] });
  });

  it('has a ARRAY_UNIQUE check', function () {
    var schema = {
      type: 'array',
      uniqueItems: true
    };
    var data = [ { x: 1 }, { x: 2 }, { x: 3 }, { x: 1 }];
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'ARRAY_UNIQUE',
           path: '',
           instance:
            [ { x: 1 },
              { x: 2 },
              { x: 3 },
              { x: 1 } ],
           message: 'Array has non unique elements',
           validator: 'uniqueItems',
           validator_value: true,
           schema: { type: 'array', uniqueItems: true },
           relative_schema_path: '/uniqueItems',
           absolute_schema_path: '0#/uniqueItems' } ],
      passed: 1,
      data:
       [ { x: 1 },
         { x: 2 },
         { x: 3 },
         { x: 1 } ] }
    );
  });

  it('has a ARRAY_ADDITIONAL_ITEMS check', function () {
    var schema = {
      type: 'array',
      items: [
        { type: 'string' },
        { type: 'number' }
      ],
      additionalItems: false
    };
    var data = ['a', 1, { foo: 'bar' }];
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'ARRAY_ADDITIONAL_ITEMS',
           path: '',
           instance: [ 'a', 1, { foo: 'bar' } ],
           message: 'Additional items not allowed, [ { "foo": "bar" } ] is unexpected',
           validator: 'additionalItems',
           validator_value: false,
           schema:
            { type: 'array',
              items: [ { type: 'string' }, { type: 'number' } ],
              additionalItems: false },
           relative_schema_path: '/additionalItems',
           absolute_schema_path: '0#/additionalItems' } ],
      passed: 3,
      data: [ 'a', 1, { foo: 'bar' } ] });
  });

  it('has a MULTIPLE_OF check', function () {
    var schema = {
      type: 'number',
      multipleOf: 5
    };
    var data = 3;
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'MULTIPLE_OF',
           path: '',
           instance: 3,
           message: '3 is not a multiple of 5',
           validator: 'multipleOf',
           validator_value: 5,
           schema: { type: 'number', multipleOf: 5 },
           relative_schema_path: '/multipleOf',
           absolute_schema_path: '0#/multipleOf' } ],
      passed: 1,
      data: 3 });
  });

  it('has a MINIMUM check', function () {
    var schema = {
      type: 'number',
      minimum: 5
    };
    var data = 3;
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'MINIMUM',
           path: '',
           instance: 3,
           message: '3 is less than the minimum of 5',
           validator: 'minimum',
           validator_value: 5,
           schema: { type: 'number', minimum: 5 },
           relative_schema_path: '/minimum',
           absolute_schema_path: '0#/minimum' } ],
      passed: 1,
      data: 3 });
  });

  it('has a MINIMUM_EXCLUSIVE check', function () {
    var schema = {
      type: 'number',
      minimum: 5,
      exclusiveMinimum: true
    };
    var data = 5;
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'MINIMUM_EXCLUSIVE',
           path: '',
           instance: 5,
           message: '5 is less than or equal to the minimum of 5',
           validator: 'exclusiveMinimum',
           validator_value: true,
           schema:
            { type: 'number',
              minimum: 5,
              exclusiveMinimum: true },
           relative_schema_path: '/exclusiveMinimum',
           absolute_schema_path: '0#/exclusiveMinimum' } ],
      passed: 1,
      data: 5 });
  });

  it('has a MAXIMUM check', function () {
    var schema = {
      type: 'number',
      maximum: 5
    };
    var data = 6;
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'MAXIMUM',
           path: '',
           instance: 6,
           message: '6 is greater than the maximum of 5',
           validator: 'maximum',
           validator_value: 5,
           schema: { type: 'number', maximum: 5 },
           relative_schema_path: '/maximum',
           absolute_schema_path: '0#/maximum' } ],
      passed: 1,
      data: 6 });
  });

  it('has a MAXIMUM_EXCLUSIVE check', function () {
    var schema = {
      type: 'number',
      maximum: 5,
      exclusiveMaximum: true
    };
    var data = 5;
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'MAXIMUM_EXCLUSIVE',
           path: '',
           instance: 5,
           message: '5 is greater than or equal to the maximum of 5',
           validator: 'exclusiveMaximum',
           validator_value: true,
           schema:
            { type: 'number',
              maximum: 5,
              exclusiveMaximum: true },
           relative_schema_path: '/exclusiveMaximum',
           absolute_schema_path: '0#/exclusiveMaximum' } ],
      passed: 1,
      data: 5 });
  });

  it('has a OBJECT_PROPERTIES_MINIMUM check', function () {
    var schema = {
      type: 'object',
      minProperties: 2
    };
    var data = {};
    var report = Themis.validator(schema)(data, '0');

    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'OBJECT_PROPERTIES_MINIMUM',
           path: '',
           instance: {},
           message: 'Object has less than the minimum of 2 properties',
           validator: 'minProperties',
           validator_value: 2,
           schema: { type: 'object', minProperties: 2 },
           relative_schema_path: '/minProperties',
           absolute_schema_path: '0#/minProperties' } ],
      passed: 1,
      data: {} });
  });

  it('has a OBJECT_PROPERTIES_MAXIMUM check', function () {
    var schema = {
      type: 'object',
      maxProperties: 2
    };
    var data = { x: true, y: 'foo', z: 'boo' };
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'OBJECT_PROPERTIES_MAXIMUM',
           path: '',
           instance: { x: true, y: 'foo', z: 'boo' },
           message: 'Object has more than the maximum of 2 properties',
           validator: 'maxProperties',
           validator_value: 2,
           schema: { type: 'object', maxProperties: 2 },
           relative_schema_path: '/maxProperties',
           absolute_schema_path: '0#/maxProperties' } ],
      passed: 1,
      data: { x: true, y: 'foo', z: 'boo' } });
  });

  it('has a OBJECT_MISSING_REQUIRED_PROPERTY check', function () {
    var schema = {
      type: 'object',
      required: ['foo', 'bar', 'baz']
    };
    var data = {};
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
           path: '',
           instance: {},
           message: 'The required property \'baz\' is missing',
           validator: 'required',
           validator_value: [ 'foo', 'bar', 'baz' ],
           schema:
            { type: 'object',
              required: [ 'foo', 'bar', 'baz' ] },
           relative_schema_path: '/required',
           absolute_schema_path: '0#/required' },
         { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
           path: '',
           instance: {},
           message: 'The required property \'bar\' is missing',
           validator: 'required',
           validator_value: [ 'foo', 'bar', 'baz' ],
           schema:
            { type: 'object',
              required: [ 'foo', 'bar', 'baz' ] },
           relative_schema_path: '/required',
           absolute_schema_path: '0#/required' },
         { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
           path: '',
           instance: {},
           message: 'The required property \'foo\' is missing',
           validator: 'required',
           validator_value: [ 'foo', 'bar', 'baz' ],
           schema:
            { type: 'object',
              required: [ 'foo', 'bar', 'baz' ] },
           relative_schema_path: '/required',
           absolute_schema_path: '0#/required' } ],
      passed: 1,
      data: {} });
  });

  it('has a OBJECT_ADDITIONAL_PROPERTIES check', function () {
    var schema = {
      type: 'object',
      additionalProperties: false
    };
    var data = { x: 'foo', y: 'bar' };
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'OBJECT_ADDITIONAL_PROPERTIES',
           path: '',
           instance: { x: 'foo', y: 'bar' },
           message: 'Additional properties not allowed, [ "x", "y" ] is unexpected',
           validator: 'additionalProperties',
           validator_value: false,
           schema:
            { type: 'object',
              additionalProperties: false },
           relative_schema_path: '/additionalProperties',
           absolute_schema_path: '0#/additionalProperties' } ],
      passed: 1,
      data: { x: 'foo', y: 'bar' } });
  });

  it('has a OBJECT_DEPENDENCY_KEY check', function () {
    var schema = {
      type: 'object',
      dependencies: {
        foo: {
          type: 'object',
          properties: {
            bar: {
              type: 'number'
            }
          }
        },
        bar: ['foo', 'baz']
      }
    };
    var data = { foo: true, bar: true };
    var report = Themis.validator(schema)(data, '0');

    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'INVALID_TYPE',
           path: '/bar',
           instance: true,
           validator: 'type',
           message: 'Data should be of type number not boolean',
           validator_value: 'number',
           schema: { type: 'number' },
           relative_schema_path: '/type',
           absolute_schema_path: '0#/dependencies/foo/properties/bar/type' },
         { code: 'OBJECT_DEPENDENCY_KEY',
           path: '',
           instance: { foo: true, bar: true },
           validator: 'dependencies',
           message: 'The keys [ "foo", "baz" ] must exist due to key "bar"',
           validator_value:
            { foo:
               { type: 'object',
                 properties: { bar: { type: 'number' } } },
              bar: [ 'foo', 'baz' ] },
           schema:
            { type: 'object',
              dependencies:
               { foo:
                  { type: 'object',
                    properties: { bar: { type: 'number' } } },
                 bar: [ 'foo', 'baz' ] } },
           relative_schema_path: '/dependencies',
           absolute_schema_path: '0#/dependencies' } ],
      passed: 1,
      data: { foo: true, bar: true } });
  });

  it('has a MIN_LENGTH check', function () {
    var schema = {
      type: 'string',
      minLength: 3
    };
    var data = 'as';
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'MIN_LENGTH',
           path: '',
           instance: 'as',
           message: '"as" is too short, minimum 3',
           validator: 'minLength',
           validator_value: 3,
           schema: { type: 'string', minLength: 3 },
           relative_schema_path: '/minLength',
           absolute_schema_path: '0#/minLength' } ],
      passed: 1,
      data: 'as' });
  });

  it('has a MAX_LENGTH check', function () {
    var schema = {
      type: 'string',
      maxLength: 3
    };
    var data = 'asdb';
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'MAX_LENGTH',
           path: '',
           instance: 'asdb',
           message: '"asdb" is too long, maximum 3',
           validator: 'maxLength',
           validator_value: 3,
           schema: { type: 'string', maxLength: 3 },
           relative_schema_path: '/maxLength',
           absolute_schema_path: '0#/maxLength' } ],
      passed: 1,
      data: 'asdb' });
  });

  it('has a PATTERN check', function () {
    var schema = {
      type: 'string',
      pattern: '^a.*b$'
    };
    var data = 'xb';
    var report = Themis.validator(schema)(data, '0');
    report.should.deep.equal({ valid: false,
      errors:
       [ { code: 'PATTERN',
           path: '',
           instance: 'xb',
           message: '"xb" should match the pattern ^a.*b$',
           validator: 'pattern',
           validator_value: '^a.*b$',
           schema: { type: 'string', pattern: '^a.*b$' },
           relative_schema_path: '/pattern',
           absolute_schema_path: '0#/pattern' } ],
      passed: 1,
      data: 'xb' });
  });

});

describe('The error algorithms', function () {

  describe('The best match alogrithm', function () {

    it('returns the most likely error', function () {
      var schemas = [
        {
          id: 'shape',
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              enum: ['point', 'triangle', 'box']
            }
          },
          oneOf: [
            { $ref: 'box' },
            { $ref: 'point' },
            { $ref: 'triangle' }
          ]
        },
        {
          id: 'point',
          type: 'object',
          required: ['type', 'data'],
          properties: {
            type: {
              type: 'string',
              enum: ['point']
            },
            data: {
              type: 'object',
              required: ['x', 'y'],
              properties: {
                x: {
                  type: 'number'
                },
                y: {
                  type: 'number'
                }
              }
            }
          }
        },
        {
          id: 'box',
          type: 'object',
          required: ['type', 'data'],
          properties: {
            type: {
              type: 'string',
              enum: ['box']
            },
            data: {
              type: 'array',
              additionalItems: false,
              minItems: 4,
              items: [
                { $ref: 'point' },
                { $ref: 'point' },
                { $ref: 'point' },
                { $ref: 'point' }
              ]
            }
          }
        },
        {
          id: 'triangle',
          type: 'object',
          required: ['type', 'data'],
          properties: {
            type: {
              type: 'string',
              enum: ['triangle']
            },
            data: {
              type: 'array',
              additionalItems: false,
              minItems: 3,
              items: [
                { $ref: 'point' },
                { $ref: 'point' },
                { $ref: 'point' }
              ]
            }
          }
        }
      ];

      var data = {};
      var validator = Themis.validator(schemas, { errors: { validator_value: false, schema: false } });
      var report = validator(data, 'shape', { algorithm: 'best_match' });

      report.should.deep.equal({ valid: false,
        errors:
         [ { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
             path: '',
             instance: {},
             message: 'The required property \'type\' is missing',
             validator: 'required',
             relative_schema_path: '/required',
             absolute_schema_path: 'shape#/required' } ],
        passed: 1,
        data: {} });

      data = { type: null };
      report = validator(data, 'shape', { algorithm: 'best_match' });

      report.should.deep.equal({ valid: false,
        errors:
         [ { code: 'ENUM_MISMATCH',
             path: '/type',
             instance: null,
             message: 'null is not one of [ "point", "triangle", "box" ]',
             validator: 'enum',
             relative_schema_path: '/enum',
             absolute_schema_path: 'shape#/properties/type/enum' },
           { code: 'INVALID_TYPE',
             path: '/type',
             instance: null,
             message: 'Data should be of type string not null',
             validator: 'type',
             relative_schema_path: '/type',
             absolute_schema_path: 'shape#/properties/type/type' } ],
        passed: 2,
        data: { type: null } });

      data = { type: 'triangle' };
      report = validator(data, 'shape', { algorithm: 'best_match' });

      report.should.deep.equal({ valid: false,
        errors:
         [ { code: 'ONE_OF_MISSING',
             path: '',
             instance: { type: 'triangle' },
             message: 'Data is not valid under any of the given schemas',
             validator: 'oneOf',
             relative_schema_path: '/oneOf',
             absolute_schema_path: 'shape#/oneOf',
             context:
              [ { valid: false,
                  passed: 4,
                  errors:
                   [ { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '',
                       instance: { type: 'triangle' },
                       message: 'The required property \'data\' is missing',
                       validator: 'required',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'triangle#/required' } ] } ] } ],
        passed: 4,
        data: { type: 'triangle' } });

      data = { type: 'triangle', data: [] };
      report = validator(data, 'shape', { algorithm: 'best_match' });

      report.should.deep.equal({ valid: false,
        errors:
         [ { code: 'ONE_OF_MISSING',
             path: '',
             instance: { type: 'triangle', data: [] },
             message: 'Data is not valid under any of the given schemas',
             validator: 'oneOf',
             relative_schema_path: '/oneOf',
             absolute_schema_path: 'shape#/oneOf',
             context:
              [ { valid: false,
                  passed: 5,
                  errors:
                   [ { code: 'ARRAY_LENGTH_SHORT',
                       path: '/data',
                       instance: [],
                       message: 'Array is too short, minimum 3',
                       validator: 'minItems',
                       relative_schema_path: '/minItems',
                       absolute_schema_path: 'triangle#/properties/data/minItems' } ] } ] } ],
        passed: 4,
        data: { type: 'triangle', data: [] } });

      data = { type: 'triangle', data: [{ type: 'point' }, { type: 'box' }, { type: 'point' }] };
      report = validator(data, 'shape', { algorithm: 'best_match' });

      report.should.deep.equal({ valid: false,
        errors:
         [ { code: 'ONE_OF_MISSING',
             path: '',
             instance:
              { type: 'triangle',
                data:
                 [ { type: 'point' },
                   { type: 'box' },
                   { type: 'point' } ] },
             message: 'Data is not valid under any of the given schemas',
             validator: 'oneOf',
             relative_schema_path: '/oneOf',
             absolute_schema_path: 'shape#/oneOf',
             context:
              [ { valid: false,
                  errors:
                   [ { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/0',
                       instance: { type: 'point' },
                       message: 'The required property \'data\' is missing',
                       validator: 'required',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/required' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/1',
                       instance: { type: 'box' },
                       message: 'The required property \'data\' is missing',
                       validator: 'required',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/required' },
                     { code: 'ENUM_MISMATCH',
                       path: '/data/1/type',
                       instance: 'box',
                       message: '"box" is not one of [ "point" ]',
                       validator: 'enum',
                       relative_schema_path: '/enum',
                       absolute_schema_path: 'point#/properties/type/enum' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/2',
                       instance: { type: 'point' },
                       message: 'The required property \'data\' is missing',
                       validator: 'required',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/required' } ],
                  passed: 5 } ] } ],
        passed: 4,
        data:
         { type: 'triangle',
           data:
            [ { type: 'point' },
              { type: 'box' },
              { type: 'point' } ] } });

      data = { type: 'triangle', data: [{ type: 'point', data: {} }, { type: 'point', data: {} }, { type: 'point', data: {} }] };
      report = validator(data, 'shape', { algorithm: 'best_match' });

      report.should.deep.equal({ valid: false,
        errors:
         [ { code: 'ONE_OF_MISSING',
             path: '',
             instance:
              { type: 'triangle',
                data:
                 [ { type: 'point', data: {} },
                   { type: 'point', data: {} },
                   { type: 'point', data: {} } ] },
             validator: 'oneOf',
             message: 'Data is not valid under any of the given schemas',
             relative_schema_path: '/oneOf',
             absolute_schema_path: 'shape#/oneOf',
             context:
              [ { valid: false,
                  errors:
                   [ { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/0/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'x\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/0/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'y\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/1/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'x\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/1/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'y\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/2/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'x\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/2/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'y\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' } ],
                  passed: 5 } ] } ],
        passed: 4,
        data:
         { type: 'triangle',
           data:
            [ { type: 'point', data: {} },
              { type: 'point', data: {} },
              { type: 'point', data: {} } ] } });

      data = { type: 'box', data: [{ type: 'point', data: {} }, { type: 'point', data: {} }, { type: 'point', data: {} }] };

      report = validator(data, 'shape', { algorithm: 'best_match' });

      report.should.deep.equal({ valid: false,
        errors:
         [ { code: 'ONE_OF_MISSING',
             path: '',
             instance:
              { type: 'box',
                data:
                 [ { type: 'point', data: {} },
                   { type: 'point', data: {} },
                   { type: 'point', data: {} } ] },
             validator: 'oneOf',
             message: 'Data is not valid under any of the given schemas',
             relative_schema_path: '/oneOf',
             absolute_schema_path: 'shape#/oneOf',
             context:
              [ { valid: false,
                  errors:
                   [ { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/0/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'x\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/0/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'y\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/1/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'x\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/1/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'y\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/2/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'x\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' },
                     { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/2/data',
                       instance: {},
                       validator: 'required',
                       message: 'The required property \'y\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' },
                     { code: 'ARRAY_LENGTH_SHORT',
                       path: '/data',
                       instance:
                        [ { type: 'point', data: {} },
                          { type: 'point', data: {} },
                          { type: 'point', data: {} } ],
                       validator: 'minItems',
                       message: 'Array is too short, minimum 4',
                       relative_schema_path: '/minItems',
                       absolute_schema_path: 'box#/properties/data/minItems' } ],
                  passed: 5 } ] } ],
        passed: 4,
        data:
         { type: 'box',
           data:
            [ { type: 'point', data: {} },
              { type: 'point', data: {} },
              { type: 'point', data: {} } ] } });

      data = { data: [{ type: 'point', data: {} }, { type: 'point', data: {} }, { type: 'point', data: {} }] };

      report = validator(data, 'shape', { algorithm: 'best_match' });

      report.should.deep.equal({ valid: false,
        errors:
         [ { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
             path: '',
             instance:
              { data:
                 [ { type: 'point', data: {} },
                   { type: 'point', data: {} },
                   { type: 'point', data: {} } ] },
             validator: 'required',
             message: 'The required property \'type\' is missing',
             relative_schema_path: '/required',
             absolute_schema_path: 'shape#/required' } ],
        passed: 1,
        data:
         { data:
            [ { type: 'point', data: {} },
              { type: 'point', data: {} },
              { type: 'point', data: {} } ] } });

      data = { type: 'triangle', data: [{ type: 'point', data: { x: 1, y: 1} }, { type: 'point', data: { x: 1, y: 1 } }, { type: 'point', data: { x: 1} }] };

      report = validator(data, 'shape', { algorithm: 'best_match' });

      report.should.deep.equal({ valid: false,
        errors:
         [ { code: 'ONE_OF_MISSING',
             path: '',
             instance:
              { type: 'triangle',
                data:
                 [ { type: 'point',
                     data: { x: 1, y: 1 } },
                   { type: 'point',
                     data: { x: 1, y: 1 } },
                   { type: 'point', data: { x: 1 } } ] },
             validator: 'oneOf',
             message: 'Data is not valid under any of the given schemas',
             relative_schema_path: '/oneOf',
             absolute_schema_path: 'shape#/oneOf',
             context:
              [ { valid: false,
                  errors:
                   [ { code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                       path: '/data/2/data',
                       instance: { x: 1 },
                       validator: 'required',
                       message: 'The required property \'y\' is missing',
                       relative_schema_path: '/required',
                       absolute_schema_path: 'point#/properties/data/required' } ],
                  passed: 5 } ] } ],
        passed: 4,
        data:
         { type: 'triangle',
           data:
            [ { type: 'point',
                data: { x: 1, y: 1 } },
              { type: 'point',
                data: { x: 1, y: 1 } },
              { type: 'point', data: { x: 1 } } ] } });

      data = { type: 'triangle', data: [{ type: 'point', data: { x: 1, y: 1} }, { type: 'point', data: { x: 1, y: 1 } }, { type: 'point', data: { x: 1, y: 1} }] };

      report = validator(data, 'shape', { algorithm: 'best_match' });

      report.should.deep.equal({ valid: true, passed: 42, errors: [] });

    });

  });

});

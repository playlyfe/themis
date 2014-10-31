var Themis = require('../src/themis');
var util = require('util');

var schema = {
  "id": "simple_defaults",
  "type": "object",
  "required": ["required"],
  "properties": {
    "string": {
      "type": "string",
      "default": "normal"
    },
    "object": {
      "type": "object",
      "default": { x: 100, y: 200 }
    },
    "array": {
      "type": "array",
      "default": [100, 200, { x: 1 }, 'foo', null, true]
    },
    "number": {
      "type": "number",
      "default": 100
    },
    "required": {
      "type": "boolean",
      "default": false
    }
  }
};

var empty_data = {};

var filled_data = {
  string: 'foo',
  object: {},
  array: [],
  number: 0,
  required: true
};
var partial_data = {
  string: 'foo',
  object: {},
  array: [],
};

// Generate the validator
var validator = Themis.validator(schema, { enable_defaults: true });

// now validate our data against the schema
var report = validator(empty_data, 'simple_defaults');

console.log(util.inspect(report, { depth: 10, colors: true }));
// { valid: true, errors: [] }

console.log(util.inspect(empty_data, { depth: 10, colors: true }));
/*
{ required: false,
  number: 100,
  array:
   [ 100,
     200,
     { x: 1 },
     'foo',
     null,
     true ],
  object: { x: 100, y: 200 },
  string: 'normal' }
*/

report = validator(filled_data, 'simple_defaults');

console.log(util.inspect(report, { depth: 10, colors: true }));
// { valid: true, errors: [] }

console.log(util.inspect(filled_data, { depth: 10, colors: true }));
/*
{ string: 'foo',
  object: {},
  array: [],
  number: 0,
  required: true }
*/

report = validator(partial_data, 'simple_defaults');

console.log(util.inspect(report, { depth: 10, colors: true }));
// { valid: true, errors: [] }

console.log(util.inspect(partial_data, { depth: 10, colors: true }));
/*
{ string: 'foo',
  object: {},
  array: [],
  required: false,
  number: 100 }
*/

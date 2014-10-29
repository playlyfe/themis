var Themis = require('../src/themis');
var util = require('util');

var schema = {
  "id": "complex_defaults",
  "type": "object",
  "properties": {
    "allOf": {
      "default": {},
      "allOf": [
        {
          "type": "object",
          "properties": {
            "x": {
              "type": "string",
              "default": "a"
            }
          }
        },
        {
          "type": "object",
          "properties": {
            "y": {
              "type": "string",
              "default": "b"
            }
          }
        },
        {
          "type": "object",
          "properties": {
            "z" :{
              "type": "string",
              "default": "c"
            }
          }
        }
      ]
    },
    "oneOf": {
      "default": { x: true, y: false },
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "x": {
              "type": "string",
              "default": "a"
            }
          }
        },
        {
          "type": "object",
          "properties": {
            "y": {
              "type": "string",
              "default": "b"
            }
          }
        },
        {
          "type": "object",
          "properties": {
            "z" :{
              "type": "string",
              "default": "c"
            }
          }
        }
      ]
    },
    "anyOf": {
      "default": {},
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "x": {
              "type": "string",
              "default": "a"
            }
          }
        },
        {
          "type": "object",
          "properties": {
            "y": {
              "type": "string",
              "default": "b"
            }
          }
        },
        {
          "type": "object",
          "properties": {
            "z" :{
              "type": "string",
              "default": "c"
            }
          }
        }
      ]
    }
  },
  "not": {
    "type": "object",
    "required": ["not"],
    "properties": {
      "not": {
        "type": "object",
        "properties": {
          "x": {
            "type": "string",
            "default": "bar",
            "enum": ["foo"]
          }
        }
      }
    }
  }
}

// Generate the validator
var validator = Themis.validator(schema);

// now validate our data against the schema
var empty_data = {};
var report = validator(empty_data, 'complex_defaults');

console.log(util.inspect(report, { depth: 10, colors: true }));
/*
{ valid: true,
  errors: [] }
*/

console.log(util.inspect(empty_data, { depth: 10, colors: true }));
/*
{ anyOf: { x: 'a' },
  oneOf: { x: true, y: false, z: 'c' },
  allOf: { x: 'a', y: 'b', z: 'c' } }
*/

var partial_invalid_data = {
  oneOf: {}
};

report = validator(partial_invalid_data, 'complex_defaults');

console.log(util.inspect(report, { depth: 10, colors: true }));
/*
{ valid: false,
  errors: [],
  subReport:
   [ { valid: false,
       errors:
        [ { code: 'ONE_OF_MULTIPLE',
            schema: 'complex_defaults/properties/oneOf',
            subReports:
             [ { valid: true, errors: [] },
               { valid: true, errors: [] },
               { valid: true, errors: [] } ] } ] } ] }
*/

console.log(util.inspect(partial_invalid_data, { depth: 10, colors: true }));
//{ oneOf: {} }

var partial_valid_data = {
  oneOf: { y: true, z: false },
  allOf: { x: 'yes' },
  anyOf: { y: 'b' }
};

report = validator(partial_valid_data, 'complex_defaults');

console.log(util.inspect(report, { depth: 10, colors: true }));
/*
{ valid: true,
  errors: [] }
*/

console.log(util.inspect(partial_valid_data, { depth: 10, colors: true }));
/*
{ oneOf: { y: true, z: false, x: 'a' },
  allOf: { x: 'yes', y: 'b', z: 'c' },
  anyOf: { y: 'b', x: 'a' } }
*/

var invalid_data = {
  not: { x: 'foo'}
}
report = validator(invalid_data, 'complex_defaults');

console.log(util.inspect(report, { depth: 10, colors: true }));
/*
{ valid: true,
  errors: [] }
*/

console.log(util.inspect(invalid_data, { depth: 10, colors: true }));
/*
{ valid: true, errors: [] }
{ not: { x: 'foo' },
  anyOf: { x: 'a' },
  oneOf: { x: true, y: false, z: 'c' },
  allOf: { x: 'a', y: 'b', z: 'c' } }
*/

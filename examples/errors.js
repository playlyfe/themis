var Themis = require('../src/themis');
var util = require('util');

var schema = {
  "id": "errors",
  "type": "object",
  "properties": {
    "allOf": {
      "allOf": [
        {
          "type": "object",
          "required": ["x"],
          "properties": {
            "x": {
              "type": "string"
            }
          }
        },
        {
          "type": "object",
          "required": ["y"],
          "properties": {
            "y": {
              "type": "string"
            }
          }
        },
        {
          "type": "object",
          "required": ["z"],
          "properties": {
            "z" :{
              "type": "string"
            }
          }
        }
      ]
    },
    "oneOf": {
      "oneOf": [
        {
          "type": "object",
          "required": ["x"],
          "properties": {
            "x": {
              "type": "string"
            }
          }
        },
        {
          "type": "object",
          "required": ["y"],
          "properties": {
            "y": {
              "type": "string"
            }
          }
        },
        {
          "type": "object",
          "required": ["z"],
          "properties": {
            "z" :{
              "type": "string"
            }
          }
        }
      ]
    },
    "anyOf": {
      "anyOf": [
        {
          "type": "object",
          "required": ["x"],
          "properties": {
            "x": {
              "type": "string"
            }
          }
        },
        {
          "type": "object",
          "required": ["y"],
          "properties": {
            "y": {
              "type": "string"
            }
          }
        },
        {
          "type": "object",
          "required": ["z"],
          "properties": {
            "z" :{
              "type": "string"
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
        "required": ["x"],
        "properties": {
          "x": {
            "type": "string",
            "enum": ["foo"]
          }
        }
      }
    }
  }
}

var validator = Themis.validator(schema);

var invalid_data = {
  allOf: {
    x: 'a',
    z: 'c'
  },
  oneOf: {
    x: 'a'
  },
  anyOf: {
    x: 'a'
  },
  x: 'foo'
}

var report = validator(invalid_data, 'errors');

console.log(util.inspect(report, { depth: 10, colors: true }));
/*
{
  valid: false
}
*/


var Themis = require('../src/themis');
var util = require('util');

var schema = {
  "id": "simple_transformer",
  "type": "object",
  "properties": {
    "string": {
      "type": "string",
      "trim": true
    },
    "items": {
      "type": "array",
      "items": [
        {
          "type": "string",
          "trim": true
        }
      ],
    },
    "additionalItems": {
      "type": "array",
      "items": [
        {
          "type": "string",
          "pad": true
        }
      ],
      "additionalItems": {
        "type": "string",
        "trim": true
      }
    },
    "allItems": {
      "type": "array",
      "items": {
        "type": "string",
        "pad": true
      }
    }
  },
  "additionalProperties": {
    "type": "string",
    "trim": true
  }
};

var data = {
  "string": " asad asdasd  ",
  "items": [
    " foo  ",
    "bar  "
  ],
  "additionalItems": [
    "pad",
    "  trim  ",
    "trime    "
  ],
  "allItems": [
    "asd",
    "abc"
  ],
  "foo": "   asd   "
};

Themis.registerTransformer('pad', 'pre', function(data, transformer) {
  if (transformer === true) {
    return " " + data + " ";
  } else {
    return data;
  }
});

Themis.registerTransformer('trim', 'pre', function(data, transformer) {
  if (transformer === true) {
    return data.trim();
  } else {
    return data;
  }
});

var validator = Themis.validator(schema, { enable_defaults: true });

// now validate our data against the schema
var report = validator(data, 'simple_transformer');

console.log(data);

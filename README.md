#Themis

Themis is a blazing fast compiled JSON Schema v4 validator. Themis was created for use in environments where there is a large amount of data that has to be validated against the same schema multiple times. Eg: REST API Servers.

Themis (Greek: Θέμις) is an ancient Greek Titaness. She is described as "of good counsel", and is the personification of divine order, law, natural law and custom. Themis means "divine law" rather than human ordinance, literally "that which is put in place", compared with títhēmi (τίθημι), meaning "to put".

Themis was inspired by the z-schema and json-model validators and tries to provide the best of both worlds. Many thanks to [Martin Zagora](https://github.com/zaggino) for his work on z-schema 3 from which most of the validation logic was adapted.

## Installation

```
npm install themis
```

## Example

### Validating a single schema

```javascript
var Themis = require('themis');

var schema = {
    "id": "basicSchema",
    "type": "array",
    "items": {
        "title": "Product",
        "type": "object",
        "properties": {
            "id": {
                "description": "The unique identifier for a product",
                "type": "number"
            },
            "name": {
                "type": "string"
            },
            "price": {
                "type": "number",
                "minimum": 0,
                "exclusiveMinimum": true
            },
            "tags": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "minItems": 1,
                "uniqueItems": true
            },
            "dimensions": {
                "type": "object",
                "properties": {
                    "length": {"type": "number"},
                    "width": {"type": "number"},
                    "height": {"type": "number"}
                },
                "required": ["length", "width", "height"]
            },
            "warehouseLocation": {
                "description": "Coordinates of the warehouse with the product"
            }
        },
        "required": ["id", "name", "price"]
    }
}


var data = [
    {
        "id": 2,
        "name": "An ice sculpture",
        "price": 12.50,
        "tags": ["cold", "ice"],
        "dimensions": {
            "length": 7.0,
            "width": 12.0,
            "height": 9.5
        },
        "warehouseLocation": {
            "latitude": -78.75,
            "longitude": 20.4
        }
    },
    {
        "id": 3,
        "name": "a blue mouse",
        "price": 25.50,
            "dimensions": {
            "length": 3.1,
            "width": 1.0,
            "height": 1.0
        },
        "warehouselocation": {
            "latitude": 54.4,
            "longitude": -32.7
        }
    }
];

// Generate the validator
var validator = Themis.validator(schema);

// now validate our data against the schema
var report = validator(data, 'basicSchema');

console.log(require('util').inspect(report, { depth: 10, colors: true }));
// { valid: true, errors: [], subReport: [] }
```

### Validating against multiple schemas
At present themis does not support fetching remote json-schemas. You can however pre-fetch them and pass them in.

```javascript
var Themis = require('themis');

var schemas = [
    {
        id: "personDetails",
        type: "object",
        properties: {
            firstName: { type: "string" },
            lastName: { type: "string" }
        },
        required: ["firstName", "lastName"]
    },
    {
        id: "addressDetails",
        type: "object",
        properties: {
            street: { type: "string" },
            city: { type: "string" }
        },
        required: ["street", "city"]
    },
    {
        id: "personWithAddress",
        allOf: [
            { $ref: "personDetails" },
            { $ref: "addressDetails" }
        ]
    }
];

var data = {
    firstName: "Johny",
    lastName: "Jose",
    street: "24th Main, HSR Layout",
    city: "Bangalore"
};

// Generate the validator
var validator = Themis.validator(schemas);

// now validate our data against the last schema
var report = validator(data, 'personWithAddress');

console.log(require('util').inspect(report, { depth: 10, colors: true }));
// { valid: true, errors: [] }
```

### Validating with custom formats

You can register custom format validators with Themis.

```javascript
var Themis = require('../src/themis');

Themis.registerFormat('username', function (str) {
  return /^[a-zA-Z0-9_\.-]+$/.test(str);
});

Themis.registerFormat('password', function (str) {
  return /^(?=.{6,}).*$/.test(str);
});

Themis.registerFormat('identifier', function (str) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
});

var schema = {
  "id": "player",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "identifier"
    },
    "username": {
      "type": "string",
      "format": "username"
    },
    "password" :{
      "type": "string",
      "format": "password"
    }
  }
};

var valid_player = {
  "id": "frodo",
  "username": "Frodo",
  "password": "TheOneRing"
};

var invalid_player = {
  "id": "123",
  "username": "!@#",
  "password": "foo"
};

// Generate the validator
var validator = Themis.validator(schema);

var report = validator(valid_player, 'player');
console.log(require('util').inspect(report, { depth: 10, colors: true }));
// { valid: true, errors: [] }

var report = validator(invalid_player, 'player');
console.log(require('util').inspect(report, { depth: 10, colors: true }));
/*
{ valid: false,
  errors: [],
  subReport:
   [ { valid: false,
       errors:
        [ { code: 'INVALID_FORMAT',
            schema: 'player/properties/id',
            params: { actual: '123', expected: 'identifier' } } ] },
     { valid: false,
       errors:
        [ { code: 'INVALID_FORMAT',
            schema: 'player/properties/username',
            params: { actual: '!@#', expected: 'username' } } ] },
     { valid: false,
       errors:
        [ { code: 'INVALID_FORMAT',
            schema: 'player/properties/password',
            params: { actual: 'foo', expected: 'password' } } ] } ] }
*/
```

## Methods
The Themis object contains methods to create validators and register formats.

### validator(schemas)
Generate a new compiled validator from the provided schemas. The returned validator function has the can be called on a piece of `data` with a `schema_id` refering to the schema to be used for validation. The function can be reused any number of times. Check the examples above to see its usage.

### registerFormat(format, validation_func)
Register a new format and its associated validation function.

## Performance

Themis achieves its high performance by generating custom optimized validation functions for every json schema document provided to it. For most types of data Themis is atleast 5-10 times faster than Z-Schema 3 and atleast twice as fast as json-model.

```
Basic Object Validation
-----------------------
z-schema#basicObject x 15,421 ops/sec ±7.07% (56 runs sampled)
jayschema#basicObject x 205 ops/sec ±6.95% (59 runs sampled)
jjv#basicObject x 3,385 ops/sec ±5.43% (56 runs sampled)
jsonschema#basicObject x 388 ops/sec ±5.11% (59 runs sampled)
tv4#basicObject x 9,746 ops/sec ±2.81% (70 runs sampled)
json-model#basicObject x 29,009 ops/sec ±7.28% (69 runs sampled)
themis#basicObject x 96,757 ops/sec ±2.80% (55 runs sampled)
Fastest is themis#basicObject

Advanced Object Validation
--------------------------
z-schema#advancedObject x 2,704 ops/sec ±8.09% (60 runs sampled)
jayschema#advancedObject x 24.79 ops/sec ±5.88% (35 runs sampled)
jjv#advancedObject x 933 ops/sec ±6.32% (57 runs sampled)
jsonschema#advancedObject x 90.19 ops/sec ±6.21% (53 runs sampled)
tv4#advancedObject x 148 ops/sec ±8.47% (64 runs sampled)
json-model#advancedObject x 3,730 ops/sec ±2.04% (65 runs sampled)
themis#advancedObject x 10,173 ops/sec ±3.04% (65 runs sampled)
Fastest is themis#advancedObject
```

For a more detailed analysis of performance check out the benchmarks against the other popular json schema validators available today.

[Benchmark Results](rawgithub.com/playlyfe/themis/master/benchmark/results.html)

##TODO

- Support remote reference fetching.
- Support custom format validators.
- Validate json schemas before attempting validation.
- Add more benchmarks for different types of datasets.
- Better validation errors.
- Add support for browsers

Author
======
Johny Jose <[johny@playlyfe.com](mailto)>


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

##Performance

Themis achieves its high performance by generating custom optimized validation functions for every json schema document provided to it. For most types of data Themis is atleast 5-10 times faster than Z-Schema 3 and atleast twice as fast as json-model.

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


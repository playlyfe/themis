var Themis = require('../src/themis');

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

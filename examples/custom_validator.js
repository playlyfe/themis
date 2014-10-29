var Themis = require('../src/themis');

Themis.registerValidator('matches', { rank: 66, type: 'string' }, function(schema, path) {
  var code = [
    "if (!(data === parent['"+ schema.matches +"'])) {",
      "report.valid = false;",
      "report.errors = {",
        "code: 'MATCH_FAILED',",
        "schema: '"+ path +"',",
        "params: { actual: data, expected: parent['"+ schema.matches +"'] }",
      "};",
    "}"
  ];
  return code;
})

var schema = {
  "id": "registration",
  "type": "object",
  "properties": {
    "email": {
      "type": "string"
    },
    "password": {
      "type": "string"
    },
    "password_again": {
      "type": "string",
      "matches": "password"
    }
  }
};

var valid_registration = {
  email: 'johny@playlyfe.com',
  password: 'foo',
  password_again: 'foo'
};

var invalid_registration = {
  email: 'johny@playlyfe.com',
  password: 'foo',
  password_again: 'bar'
};

var validator = Themis.validator(schema);

// now validate our data against the schema
var report = validator(valid_registration, 'registration');

console.log(require('util').inspect(report, { depth: 10, colors: true }));
// { valid: true, errors: [], subReport: [] }

report = validator(invalid_registration, 'registration');

console.log(require('util').inspect(report, { depth: 10, colors: true }));
/*
{ valid: false,
  errors: [],
  subReport:
   [ { valid: false,
       errors:
        { code: 'NOT_SAME',
          schema: 'registration/properties/password_again',
          params: { actual: 'bar', expected: 'foo' } } } ] }
*/

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

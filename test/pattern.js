Themis = require('../src/themis');

describe('Issue #3: Crashing when pattern is incorrect in ref(erenced) schema', function() {

  it('should be able to dereference fragments of external schemas', function() {
    var schemas = [
      {
        "id": "types",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "definitions": {
          "uuid": {
            "type": "string",
            "pattern": "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$"
          }
        }
      },
      {
        "id": "kitchensink",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "properties": {
          "id": { "$ref": "types#/definitions/uuid" }
        }
      }
    ];

    var validator = Themis.validator(schemas);

    var invalid_item = {
      "id": "incorrect value"
    };
    var valid_item = {
      "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    }
    validator(invalid_item, 'kitchensink').valid.should.be.false;
    validator(valid_item, 'kitchensink').valid.should.be.true;
  });

});

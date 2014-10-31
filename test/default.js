Themis = require('../src/themis');

describe('The default keyword', function () {

  describe('behaviour with objects', function () {

    before(function () {
      var schema = {
        "id": "simple_defaults",
        "type": "object",
        "default": {
          string: 'empty_object',
          array: []
        },
        "required": ["required"],
        "properties": {
          "string": {
            "type": "string",
            "default": "normal"
          },
          "object": {
            "type": "object",
            "default": { x: 100, y: 200 },
            "properties": {
              "x": {
                "type": "number",
                "default": 0
              },
              "y": {
                "type": "number",
                "default": 0
              },
              "z": {
                "type": "number",
                "default": 0
              }
            }
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
      this.validator = Themis.validator(schema, { enable_defaults: true });
      return;
    });

    it('assigns a default value to the object\'s properties if they do not exist', function () {
      var data = {};
      this.validator(data, 'simple_defaults').valid.should.be.true;
      data.should.deep.equal({
        string: 'normal',
        object: { x: 100, y: 200, z: 0 },
        array: [100, 200, { x: 1 }, 'foo', null, true],
        number: 100,
        required: false
      });
    });

    it('assigns nested and partial default values', function () {
      var data = { string: 'partial', object: { x: 200 }, number: 10 };
      this.validator(data, 'simple_defaults').valid.should.be.true;
      data.should.deep.equal({
        string: 'partial',
        object: { x: 200, y: 0, z: 0 },
        array: [100, 200, { x: 1 }, 'foo', null, true],
        number: 10,
        required: false
      });
    });

    it('ensures default values which are objects or arrays are not shared references', function () {
      var data1 = {};
      var data2 = {};
      this.validator(data1, 'simple_defaults').valid.should.be.true;
      this.validator(data2, 'simple_defaults').valid.should.be.true;
      data1.object.should.not.equal(data2.object);
      data1.array.should.not.equal(data2.array);
      data1.object.should.deep.equal(data2.object);
      data1.array.should.deep.equal(data2.array);
    })

  });


  describe('behaviour with arrays', function () {

    before(function () {
      var schema = {
        "id": "array_defaults",
        "type": "object",
        "properties": {
          "dynamic": {
            "type": "array",
            "items": {
              "default": { x: 100, y: 100 },
              "type": "object",
              "properties": {
                "x": {
                  "type": "number",
                  "default": 0
                },
                "y": {
                  "type": "number",
                  "default": 0
                }
              }
            }
          },
          "static": {
            "type": "array",
            "items": [
              { "type": "number", "default": 0 },
              { "type": "number", "default": 10 },
              { "type": "number", "default": 20 }
            ],
            "additionalItems": {
              "default": 100,
              "type": "number"
            }
          }
        }
      };
      this.validator = Themis.validator(schema, { enable_defaults: true });
    });

    it('assigns default values to arrays of a specifed length', function() {
      data = {};
      data.dynamic = [];
      data.static = [];
      data.dynamic.length = 4;
      data.static.length = 6;
      this.validator(data, 'array_defaults').valid.should.be.true;

      data.should.deep.equal({
        dynamic: [{ x: 100, y: 100}, { x: 100, y: 100 }, { x: 100, y: 100}, { x: 100, y: 100 }],
        static: [0, 10, 20, 100, 100, 100]
      });
    })

    it('assigns default values to undefined items in an array', function() {
      data = {};
      data.dynamic = [];
      data.static = [];
      data.dynamic.length = 4;
      data.static.length = 6;
      data.dynamic[2] = { x: 0, y: 0 };
      data.static[1] = 30;
      data.static[4] = 40;
      this.validator(data, 'array_defaults').valid.should.be.true;

      data.should.deep.equal({
        dynamic: [{ x: 100, y: 100}, { x: 100, y: 100 }, { x: 0, y: 0}, { x: 100, y: 100 }],
        static: [0, 30, 20, 100, 40, 100]
      });
    })

  });

  describe('behaviour with oneOf', function () {

    before(function () {
      var schema = {
        "id": "oneofdefaults",
        "type": "object",
        "properties": {
          "object": {
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
          "array": {
            "default": [undefined, undefined, undefined],
            "oneOf": [
              {
                "type": "array",
                "minItems": 2,
                "maxItems": 2,
                "items": {
                  "default": { x: true }
                }
              },
              {
                "type": "array",
                "minItems": 3,
                "maxItems": 3,
                "items": {
                  "default": { y: true }
                }
              },
              {
                "type": "array",
                "minItems": 4,
                "maxItems": 4,
                "items": {
                  "default": { z: true }
                }
              }
            ]
          }
        }
      };
      this.validator = Themis.validator(schema, { enable_defaults: true });
    });

    it('applies exactly one set of defaults', function () {
      var data = {};
      this.validator(data, 'oneofdefaults').valid.should.be.true;
      data.should.deep.equal({
        array: [
          { y: true },
          { y: true },
          { y: true }
        ],
        object: { x: true, y: false, z: 'c' } });

      data = { object: { x: true, z: true }, array: [undefined, undefined] };

      this.validator(data, 'oneofdefaults').valid.should.be.true;
      data.should.deep.equal({
        object: { x: true, y: 'b', z: true },
        array: [{ x: true }, { x: true }]
      });

      data = { object: { x: true, z: true }, array: [undefined, undefined, undefined, undefined] };
      this.validator(data, 'oneofdefaults').valid.should.be.true
      data.should.deep.equal({
        object: { x: true, y: 'b', z: true },
        array: [{ z: true }, { z: true }, { z: true }, { z: true }]
      });

    });

    it('changes nothing if none or more than one schema is valid', function () {
      var invalid_data = { object: [], array: [undefined, undefined, undefined, undefined, undefined] };
      this.validator(invalid_data, 'oneofdefaults').valid.should.be.false;
      invalid_data.should.deep.equal({ object: [], array: [undefined, undefined, undefined, undefined, undefined] });

      invalid_data = { object: { x: true }, array: [{ x: true }] };
      this.validator(invalid_data, 'oneofdefaults').valid.should.be.false;
      invalid_data.should.deep.equal({ object: { x: true }, array: [{ x: true }] });
    });

  });

  describe('behaviour with anyOf', function () {

    before(function () {
      var schema = {
        "id": "anyofdefaults",
        "type": "object",
        "properties": {
          "object": {
            "default": { p1: true, p2: true },
            "anyOf": [
              {
                "type": "object",
                "required": ["x"],
                "properties": {
                  "x": {
                    "type": "string",
                    "default": 'a'
                  }
                },
                "minProperties": 4
              },
              {
                "type": "object",
                "properties": {
                  "y": {
                    "type": "string",
                    "default": "b"
                  }
                },
                "minProperties": 3
              },
              {
                "type": "object",
                "required": ["z"],
                "properties": {
                  "z" :{
                    "type": "string",
                    "default": "c"
                  }
                },
                "minProperties": 2
              }
            ]
          },
          "array": {
            "default": [undefined, undefined, undefined],
            "anyOf": [
              {
                "type": "array",
                "minItems": 4,
                "items": {
                  "default": { x: true }
                }
              },
              {
                "type": "array",
                "minItems": 3,
                "items": {
                  "default": { y: true }
                }
              },
              {
                "type": "array",
                "minItems": 2,
                "items": {
                  "default": { z: true }
                }
              }
            ]
          }
        }
      };
      this.validator = Themis.validator(schema, { enable_defaults: true });
    });

    it('applies the first set of valid defaults in order of definition', function () {
      var data = {};

      this.validator(data, 'anyofdefaults').valid.should.be.true;
      data.should.deep.equal({
        array: [ { y: true }, { y: true }, { y: true } ],
        object: { p1: true, p2: true, z: 'c' }
      });

      data = { array: [ { x: 'a' }, { x: true }, { y: true }, undefined, undefined ], object: { p1: true, p2: true, p3: true } };
      this.validator(data, 'anyofdefaults').valid.should.be.true;
      data.should.deep.equal({
        array: [ { x: 'a' }, { x: true }, { y: true }, { x: true}, { x: true } ],
        object: { p1: true, p2: true, p3: true, y: 'b' }
      });

      data = { object: { p1: true, p2: true, p3: true, p4: true }, array: [undefined, undefined] };
      this.validator(data, 'anyofdefaults').valid.should.be.true;
      data.should.deep.equal({
        array: [ { z: true }, { z: true } ],
        object: { p1: true, p2: true, p3: true, p4: true, x: 'a' }
      })

      data = { object: { x: true, y: true } };
      this.validator(data, 'anyofdefaults').valid.should.be.true;
      data.should.deep.equal({
        array: [ { y: true }, { y: true }, { y: true } ],
        object: { x: true, y: true, z: 'c' }
      })

    });

    it('changes nothing if none of the schemas are valid', function () {
      var invalid_data = { array: [undefined], object: { p1: true } };
      this.validator(data, 'anyofdefaults').valid.should.be.true;
      invalid_data.should.deep.equal({ array: [undefined], object: { p1: true } });
    });

  });

  describe('behaviour with allOf', function () {

    before(function () {
      var schema = {
        "id": "anyofdefaults",
        "type": "object",
        "properties": {
          "object": {
            "default": {},
            "allOf": [
              {
                "type": "object",
                "properties": {
                  "x": {
                    "type": "string",
                    "default": 'a'
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
          "array": {
            "default": [undefined, undefined, undefined, undefined],
            "allOf": [
              {
                "type": "array",
                "items": [
                  {
                    "type": "object",
                    "default": {},
                    "properties": {
                      "x": {
                        "default": "a"
                      }
                    }
                  }
                ],
                "additionalItems": true
              },
              {
                "type": "array",
                "items": [
                  {
                    "type": "object",
                    "default": {},
                    "properties": {
                      "y": {
                        "default": "b1"
                      }
                    }
                  },
                  {
                    "type": "object",
                    "default": {},
                    "properties": {
                      "y": {
                        "default": "b2"
                      }
                    }
                  }
                ],
                "additionalItems": true
              },
              {
                "type": "array",
                "items": [
                  {
                    "type": "object",
                    "default": {}
                  },
                  {
                    "type": "object",
                    "default": {}
                  },
                  {
                    "type": "object",
                    "default": {}
                  }
                ],
                "additionalItems": {
                  "type": 'object',
                  "default": {},
                  "properties": {
                    "z": {
                      "default": "c"
                    }
                  }
                }
              }
            ]
          }
        }
      };
      this.validator = Themis.validator(schema, { enable_defaults: true });
    });

    it('applies all sets of defaults', function () {
      var data = {};
      this.validator(data, 'anyofdefaults').valid.should.be.true;
      data.should.deep.equal({
        array: [ { x: 'a', y: 'b1' }, { y: 'b2' }, {}, { z: 'c' } ],
        object: { x: 'a', y: 'b', z: 'c' }
      });

      data = {
        object: { x: 'x' },
        array: [ { p1: true }, { p2: true }, { p3: true }, { p4: true }]
      }
      this.validator(data, 'anyofdefaults').valid.should.be.true;
      data.should.deep.equal({
        array: [ { p1: true, x: 'a', y: 'b1' }, { p2: true, y: 'b2' }, { p3: true }, { p4: true, z: 'c' } ],
        object: { x: 'x', y: 'b', z: 'c' }
      });

    });

    it('changes nothing if all schemas are not valid', function () {
      var invalid_data = {
        object: { x: true },
        array: [ { p1: true }, { p2: true }, { p3: true }, { p4: true }]
      }
      this.validator(invalid_data, 'anyofdefaults').valid.should.be.false;
      invalid_data.should.deep.equal({
        object: { x: true },
        array: [ { p1: true }, { p2: true }, { p3: true }, { p4: true }]
      });
    });

  });

  describe('behaviour with not', function() {

    before(function () {
      var schema = {
        "id": "notdefaults",
        "type": "object",
        "properties": {
          "object": {
            "default": {},
            "not": {
              "type": "object",
              "minProperties": 1,
              "properties": {
                "comments": {
                  "type": "string",
                  "default": 'too short'
                }
              }
            }
          },
          "array": {
            "default": [],
            "not": {
              "type": "array",
              "minItems": 1,
              "default": [undefined],
              "items": {
                "default": "too short"
              }
            }
          }
        }
      };
      this.validator = Themis.validator(schema, { enable_defaults: true });
    });

    it('all defaults insied not are effectively ignored regardless of validation result', function() {
      var empty_data = {};
      this.validator(empty_data, 'notdefaults').valid.should.be.true;
      empty_data.should.deep.equal({ array: [], object: {} });

      var invalid_data = { object: { x: true }, array: [true] };
      this.validator(invalid_data, 'notdefaults').valid.should.be.false;
      invalid_data.should.deep.equal({ object: { x: true }, array: [true] });
    })
  });

});

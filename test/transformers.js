'use strict';
var Themis = require('../src/themis');
var util = require('util');

describe('The pre validation data transformers', function() {

  before(function () {
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
  });

  it('can transform "properties" of objects', function() {
    var schema = {
      type: 'object',
      properties: {
        first_name: {
          type: 'string',
          trim: true
        },
        last_name: {
          type: 'string',
          pad: true
        }
      }
    };
    var data = {
      first_name: '  Johny  ',
      middle_name: ' Java ',
      last_name: 'Jose'
    };
    var report = Themis.validator(schema)(data, '0');
    data.should.deep.equal({
      first_name: 'Johny',
      middle_name: ' Java ',
      last_name: ' Jose '
    });
  });

  it('can transform "additionalProperties" of objects', function() {
    var schema = {
      type: 'object',
      additionalProperties: {
        type: 'string',
        trim: true
      }
    };

    var data = {
      first_name: ' Johny ',
      middle_name: ' Java ',
      last_name: ' Jose '
    };

    var report = Themis.validator(schema)(data, '0')
    data.should.deep.equal({
      first_name: 'Johny',
      middle_name: 'Java',
      last_name: 'Jose'
    });

  });

  it('can transform "items" of arrays', function() {
    var schema = {
      type: 'array',
      items: [
        {
          type: 'string',
          trim: true
        },
        {
          type: 'string',
          pad: true
        }
      ]
    };

    var data = [' Johny ', 'Java', 'Jose ', ' ! ' ];
    var report = Themis.validator(schema)(data, '0')
    data.should.deep.equal(['Johny', ' Java ', 'Jose ', ' ! ']);

    schema = {
      type: 'array',
      items: {
        type: 'string',
        pad: true
      }
    };

    data = [' Johny ', 'Java', 'Jose ', ' ! ' ];
    report = Themis.validator(schema)(data, '0')
    data.should.deep.equal(['  Johny  ', ' Java ', ' Jose  ', '  !  ']);

  });

  it('can transform "additionalItems" of arrays', function() {
    var schema = {
      type: 'array',
      items: [
        {
          type: 'string'
        }
      ],
      additionalItems: {
        type: 'string',
        pad: true
      }
    };

    var data = ['Johny', 'Java', 'Jose']
    var report = Themis.validator(schema)(data, '0')
    data.should.deep.equal(['Johny', ' Java ', ' Jose ']);

  });

})

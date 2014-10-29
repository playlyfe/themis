"use strict";

var UglifyJS = require("uglify-js");

var KEYWORD_META = {
  // All types
  'default': [-100, 'any'],
  '$schema': [-1, 'any'],
  '$ref': [-1, 'any'],
  'title': [-1, 'any'],
  'description': [-1, 'any'],
  'definitions': [-1, 'any'],
  'type': [0, 'any'],
  // Numeric
  'multipleOf': [10, 'number'],
  'minimum': [20, 'number'],
  'exclusiveMinimum': [25, 'number'],
  'maximum': [30, 'number'],
  'exclusiveMaximum': [35, 'number'],
  // Strings
  'minLength': [40, 'string'],
  'maxLength': [50, 'string'],
  'pattern': [60, 'string'],
  'format': [65, 'string'],
  // Arrays
  'additionalItems': [70, 'array'],
  'items': [75, 'array'],
  'minItems': [80, 'array'],
  'maxItems': [90, 'array'],
  'uniqueItems': [100, 'array'],
  // Objects
  'required': [110, 'object'],
  'additionalProperties': [120, 'object'],
  'patternProperties': [130, 'object'],
  'properties': [140, 'object'],
  'minProperties': [150, 'object'],
  'maxProperties': [160, 'object'],
  'dependencies': [170, 'object'],
  // Any Type
  'allOf': [190,'any'],
  'anyOf': [200,'any'],
  'oneOf': [210,'any'],
  'not': [220, 'any'],
  'enum': [230, 'any']
};

var Utils = {

  typeOf: function (data, _type)  {
    // We check if the raw typeof value if available before calculating it
    _type = (_type != null) ? _type : typeof data;

    switch (_type) {
      case 'object':
        if (data === null) {
          return 'null';
        } else if (Array.isArray(data)) {
          return 'array';
        } else {
          return 'object';
        }
      case 'number':
        if (Number.isFinite(data)) {
          if (data % 1 === 0) {
            return 'integer';
          } else {
            return 'number';
          }
        } else if (Number.isNaN(data)) {
          return 'not-a-number';
        } else {
          return 'unknown-number';
        }
      default:
        return _type;
    };

  },

  unicodeLength: function (string) {
    return string.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "_").length;
  },

  decodeJSONPointer: function (str) {
      // http://tools.ietf.org/html/draft-ietf-appsawg-json-pointer-07#section-3
      return decodeURIComponent(str).replace(/~[0-1]/g, function (x) {
          return x === "~1" ? "/" : "~";
      });
  },

  areEqual: function(json1, json2) {
      // http://json-schema.org/latest/json-schema-core.html#rfc.section.3.6

      // Two JSON values are said to be equal if and only if:
      // both are nulls; or
      // both are booleans, and have the same value; or
      // both are strings, and have the same value; or
      // both are numbers, and have the same mathematical value; or
      if (json1 === json2) {
          return true;
      }

      var i, len, _areEqual = Utils.areEqual, _typeOf = Utils.typeOf;

      // both are arrays, and:
      if (Array.isArray(json1) && Array.isArray(json2)) {
          // have the same number of items; and
          if (json1.length !== json2.length) {
              return false;
          }
          // items at the same index are equal according to this definition; or
          len = json1.length;
          for (i = 0; i < len; i++) {
              if (!_areEqual(json1[i], json2[i])) {
                  return false;
              }
          }
          return true;
      }

      // both are objects, and:
      if (_typeOf(json1) === "object" && _typeOf(json2) === "object") {
          // have the same set of property names; and
          var keys1 = Object.keys(json1);
          var keys2 = Object.keys(json2);
          if (!_areEqual(keys1, keys2)) {
              return false;
          }
          // values for a same property name are equal according to this definition.
          len = keys1.length;
          for (i = 0; i < len; i++) {
              if (!_areEqual(json1[keys1[i]], json2[keys1[i]])) {
                  return false;
              }
          }
          return true;
      }

      return false;
  },

  isUniqueArray: function (arr, indexes) {
    var i, j, l = arr.length, _areEqual = Utils.areEqual;
    for (i = 0; i < l; i++) {
        for (j = i + 1; j < l; j++) {
            if (_areEqual(arr[i], arr[j])) {
                if (indexes) { indexes.push(i, j); }
                return false;
            }
        }
    }
    return true;
  },

  difference: function (bigSet, subSet) {
      var arr = [],
          idx = bigSet.length;
      while (idx--) {
          if (subSet.indexOf(bigSet[idx]) === -1) {
              arr.push(bigSet[idx]);
          }
      }
      return arr;
  },
  // @TODO: improve both of these escape functions
  escapeString: function (str) {
    return str.replace(/'/g, "\\'");
  },

  escapeRegexp: function (str) {
    return str.replace(/\//g, "\\/");
  },

  format: {
    "date": function (date) {
        if (typeof date !== "string") {
            return true;
        }
        // full-date from http://tools.ietf.org/html/rfc3339#section-5.6
        var matches = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(date);
        if (matches === null) {
            return false;
        }
        // var year = matches[1];
        // var month = matches[2];
        // var day = matches[3];
        if (matches[2] < "01" || matches[2] > "12" || matches[3] < "01" || matches[3] > "31") {
            return false;
        }
        return true;
    },
    "date-time": function (dateTime) {
        if (typeof dateTime !== "string") {
            return true;
        }
        // date-time from http://tools.ietf.org/html/rfc3339#section-5.6
        var s = dateTime.toLowerCase().split("t");
        if (!Utils.format.date(s[0])) {
            return false;
        }
        var matches = /^([0-9]{2}):([0-9]{2}):([0-9]{2})(.[0-9]+)?(z|([+-][0-9]{2}:[0-9]{2}))$/.exec(s[1]);
        if (matches === null) {
            return false;
        }
        // var hour = matches[1];
        // var minute = matches[2];
        // var second = matches[3];
        // var fraction = matches[4];
        // var timezone = matches[5];
        if (matches[1] > "23" || matches[2] > "59" || matches[3] > "59") {
            return false;
        }
        return true;
    },
    "email": function (email) {
        if (typeof email !== "string") {
            return true;
        }
        // use regex from owasp: https://www.owasp.org/index.php/OWASP_Validation_Regex_Repository
        return /^[a-zA-Z0-9+&*-]+(?:\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,7}$/.test(email);
    },
    "hostname": function (hostname) {
        if (typeof hostname !== "string") {
            return true;
        }
        /*
            http://json-schema.org/latest/json-schema-validation.html#anchor114
            A string instance is valid against this attribute if it is a valid
            representation for an Internet host name, as defined by RFC 1034, section 3.1 [RFC1034].

            http://tools.ietf.org/html/rfc1034#section-3.5

            <digit> ::= any one of the ten digits 0 through 9
            var digit = /[0-9]/;

            <letter> ::= any one of the 52 alphabetic characters A through Z in upper case and a through z in lower case
            var letter = /[a-zA-Z]/;

            <let-dig> ::= <letter> | <digit>
            var letDig = /[0-9a-zA-Z]/;

            <let-dig-hyp> ::= <let-dig> | "-"
            var letDigHyp = /[-0-9a-zA-Z]/;

            <ldh-str> ::= <let-dig-hyp> | <let-dig-hyp> <ldh-str>
            var ldhStr = /[-0-9a-zA-Z]+/;

            <label> ::= <letter> [ [ <ldh-str> ] <let-dig> ]
            var label = /[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?/;

            <subdomain> ::= <label> | <subdomain> "." <label>
            var subdomain = /^[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?(\.[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?)*$/;

            <domain> ::= <subdomain> | " "
            var domain = null;
        */
        var valid = /^[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?(\.[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?)*$/.test(hostname);
        if (valid) {
            // the sum of all label octets and label lengths is limited to 255.
            if (hostname.length > 255) { return false; }
            // Each node has a label, which is zero to 63 octets in length
            var labels = hostname.split(".");
            for (var i = 0; i < labels.length; i++) { if (labels[i].length > 63) { return false; } }
        }
        return valid;
    },
    "host-name": function (hostname) {
        return Utils.format.hostname.call(this, hostname);
    },
    "ipv4": function (ipv4) {
        if (typeof ipv4 !== "string") { return true; }
        if (ipv4.indexOf(".") === -1) { return false; }
        // https://www.owasp.org/index.php/OWASP_Validation_Regex_Repository
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipv4);
    },
    "ipv6": function (ipv6) {
        // Stephen Ryan at Dartware @ http://forums.intermapper.com/viewtopic.php?t=452
        return typeof ipv6 !== "string" || /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(ipv6);
    },
    "regex": function (str) {
        try {
            RegExp(str);
            return true;
        } catch (e) {
            return false;
        }
    },
    /*
    "uri": function (uri) {
        //if (this.options.strictUris) {
        //    return FormatValidators["strict-uri"].apply(this, arguments);
        //}
        // https://github.com/zaggino/z-schema/issues/18
        // RegExp from http://tools.ietf.org/html/rfc3986#appendix-B
        return typeof uri !== "string" || RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?").test(uri);
    },*/
    "uri": function (uri) {
        // http://mathiasbynens.be/demo/url-regex
        // https://gist.github.com/dperini/729294
        return typeof uri !== "string" || RegExp(
            "^" +
                // protocol identifier
                "(?:(?:https?|ftp)://)" +
                // user:pass authentication
                "(?:\\S+(?::\\S*)?@)?" +
                "(?:" +
                    // IP address exclusion
                    // private & local networks
                    "(?!10(?:\\.\\d{1,3}){3})" +
                    "(?!127(?:\\.\\d{1,3}){3})" +
                    "(?!169\\.254(?:\\.\\d{1,3}){2})" +
                    "(?!192\\.168(?:\\.\\d{1,3}){2})" +
                    "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
                    // IP address dotted notation octets
                    // excludes loopback network 0.0.0.0
                    // excludes reserved space >= 224.0.0.0
                    // excludes network & broacast addresses
                    // (first & last IP address of each class)
                    "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
                    "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
                    "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
                "|" +
                "localhost" +
                "|" +
                    // host name
                    "(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)" +
                    // domain name
                    "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*" +
                    // TLD identifier
                    "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
                ")" +
                // port number
                "(?::\\d{2,5})?" +
                // resource path
                "(?:/[^\\s]*)?" +
            "$", "i"
        ).test(uri);
    }
  },

  validation: {

  },

  transform: {

  }

};

var ValidationGenerators = {
  'type': function (schema, path) {
    var code = [""], conditions;

    if (Utils.typeOf(schema.type) === 'array' && schema.type.length > 0) {
      if ( schema.type.length === 1 ) {
        code.push("if (type !== '" + schema.type[0] +"') {");
      } else {
        conditions = [
          "type !== '"+ schema.type[0] +"'"
        ];

        if (schema.type[0] === 'number') {
          conditions.push("type !== 'integer'");
        }

        for (var index = 1; index < schema.type.length; index++) {
          if (schema.type[index] === 'number') {
            conditions.push("type !== '"+ schema.type[index] +"' && type !== 'integer'");
          } else {
            conditions.push("type !== '"+ schema.type[index] +"'");
          }
        }

        code.push("if ("+ conditions.join(" && ") +") {");
      }
    } else {
      if (schema.type === 'number') {
        code.push("if (type !== '" + schema.type +"' && type !== 'integer') {");
      } else {
        code.push("if (type !== '" + schema.type +"') {");
      }
    }

    code.push(
      "report.valid = false;",
      "report.errors.push({ code: 'INVALID_TYPE', schema: '"+ path +"', params: { actual: type, expected: '"+ schema.type + "' } });",
      "};"
    );
    return code;
  },
  // Numeric Validations
  // http://json-schema.org/latest/json-schema-validation.html#rfc.section.5.1.1.2
  multipleOf: function (schema, path) {
    var code = [
      "if (!(_typeOf(data / "+ schema.multipleOf+") === 'integer')) {",
        "report.valid = false;",
        "report.errors.push({ code: 'MULTIPLE_OF', schema: '"+ path +"', params: { actual: data, expected: "+ schema.multipleOf +" } });",
      "}"
    ];
    return code;
  },
  minimum: function (schema, path) {
    var code = [];

    if (schema.exclusiveMinimum !== true) {
      code.push(
        "if (data < "+ schema.minimum +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'MINIMUM', schema: '"+ path +"', params: { actual: data, expected: "+ schema.minimum +" } });",
        "}"
      );
    } else {
      code.push(
        "if (data <= "+ schema.minimum +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'MINIMUM_EXCLUSIVE', schema: '"+ path +"', params: { actual: data, expected: "+ schema.minimum +" } });",
        "}"
      );
    }

    return code;
  },
  exclusiveMinimum: function (schema, path) {
    // covered in minimum
    var code = [];
    return code;
  },
  maximum: function (schema, path) {
    var code = [];

    if (schema.exclusiveMaximum !== true) {
      code.push(
        "if (data > "+ schema.maximum +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'MAXIMUM', schema: '"+ path +"', params: { actual: data, expected: "+ schema.maximum +" } });",
        "}"
      );
    } else {
      code.push(
        "if (data >= "+ schema.maximum +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'MAXIMUM_EXCLUSIVE', schema: '"+ path +"', params: { actual: data, expected: "+ schema.maximum +" } });",
        "}"
      );
    }

    return code;
  },
  exclusiveMaximum: function (schema, path) {
    // covered in maximum
    var code = [];
    return code;
  },
  // String Validations
  minLength: function (schema, path) {
    var code = [];

    code.push(
      "if ((_length = _unicodeLength(data)) < "+ schema.minLength +") {",
        "report.valid = false;",
        "report.errors.push({ code: 'MIN_LENGTH', schema: '"+ path +"', params: { actual: _length, expected: "+ schema.minLength +" } });",
      "}"
    );

    return code;
  },
  maxLength: function (schema, path) {
    var code = [];

    // We've already calculate _length so don't recalculate
    if (schema.minLength != null) {
      code.push("if (_length > "+ schema.maxLength +") {");
    } else {
      code.push("if ((_length = _unicodeLength(data)) > "+ schema.maxLength +") {");
    }

    code.push(
        "report.valid = false;",
        "report.errors.push({ code: 'MAX_LENGTH', schema: '"+ path +"', params: { actual: _length, expected: "+ schema.maxLength +" } });",
      "}"
    );

    return code;
  },
  pattern: function (schema, path) {
    var code = [];

    code.push(
      "if (!/"+ Utils.escapeRegexp(schema.pattern) +"/.test(data)) {",
        "report.valid = false;",
        "report.errors.push({ code: 'PATTERN', schema: '"+ path +"', params: { actual: data, expected: '"+ schema.pattern +"' } });",
      "}"
    );

    return code;
  },
  format: function (schema, path) {
    var code = [];

    code.push(
      "if (!_format['"+ schema.format +"'](data)) {",
        "report.valid = false;",
        "report.errors.push({ code: 'INVALID_FORMAT', schema: '"+ path +"', params: { actual: data, expected: '"+ schema.format +"' } });",
      "}"
    );

    return code;
  },
  // Array Validations
  additionalItems: function (schema, path) {
    var code = [];

    if (schema.additionalItems === false && Utils.typeOf(schema.items) === 'array') {
      code.push(
        "if (_length > "+ schema.items.length +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'ARRAY_ADDITIONAL_ITEMS', schema: '"+ path +"', params: { actual: _length, expected: "+ schema.items.length +" } });",
        "}"
      );
    }

    return code;
  },
  items: function (schema, path) {
    // covered in additionalItems
    var code = [];
    return code;
  },
  maxItems: function (schema, path) {
    var code = [];

    code.push(
      "if (_length > "+ schema.maxItems +") {",
        "report.valid = false;",
        "report.errors.push({ code: 'ARRAY_LENGTH_LONG', schema: '"+ path +"', params: { actual: _length, expected: "+ schema.maxItems +" } });",
      "}"
    );

    return code;
  },
  minItems: function (schema, path) {
    var code = [];

    code.push(
      "if (_length < "+ schema.minItems +") {",
        "report.valid = false;",
        "report.errors.push({ code: 'ARRAY_LENGTH_SHORT', schema: '"+ path +"', params: { actual: _length, expected: "+ schema.minItems +" } });",
      "}"
    );

    return code;
  },
  uniqueItems: function (schema, path) {
    var code = [];

    if (schema.uniqueItems === true) {

      code.push(
        "var matches = [];",
        "if (_isUniqueArray(data, matches) === false) {",
          "report.valid = false;",
          "report.errors.push({ code: 'ARRAY_UNIQUE', schema: '"+ path +"', params: { actual: matches, expected: [] } });",
        "}"
      );

    }

    return code;
  },
  // Object Validations

  required: function (schema, path) {
    var code = [];
    return code;
  },
  additionalProperties: function (schema, path) {
    var code = [];

    // Handled in properties validation
    if (schema.properties === undefined && schema.patternProperties === undefined ) {
      code = code.concat(ValidationGenerators.properties(schema, path));
    }

    return code;
  },
  patternProperties: function (schema, path) {
    var code = [];

    // Handled in properties validation
    if (schema.properties === undefined) {
      code = code.concat(ValidationGenerators.properties(schema, path));
    }

    return code;
  },
  properties: function (schema, path) {
    var code = [];
    return code;
  },
  minProperties: function (schema, path) {
    var code = [];
    return code;
  },
  maxProperties: function (schema, path) {
    var code = [];
    return code;
  },

  dependencies: function (schema, path) {
    var code = [];
    return code;
  },

  // Any type validations
  default:  function (schema, path) {
    var code = []
    return code;
  },
  enum: function (schema, path) {
    var code = [];
    var default_case = [];
    var index;
    var flag = false;
    code.push(
      "var match = false;",
      "switch (data) {"
    );
    // filter out simple types
    for (index = 0; index < schema.enum.length; index++) {
      var val = schema.enum[index];
      if (['number', 'integer', 'boolean', 'null'].indexOf(Utils.typeOf(val)) >= 0) {
        flag = true;
        code.push(
          "case "+val+":"
        );
      } else if (Utils.typeOf(val) === 'string') {
        flag = true;
        code.push(
          "case '"+ Utils.escapeString(val) +"':"
        )

      } else {
        default_case.push(
          "if (_areEqual(data, "+JSON.stringify(val)+")) { match = true; }"
        );
      }
    }

    if (flag) {
      code.push(
        "match = true;",
        "break;"
      );
    }

    if (default_case.length > 0) {
      code.push(
        "default:"
      );
      code = code.concat(default_case);
      code.push(
        "break;"
      );
    }
    //
    code.push(
      "}",
      "if (!match) {",
        "report.valid = false;",
        "report.errors.push({ code: 'ENUM_MISMATCH', schema: '"+ path +"', params: { actual: data, expected: "+ JSON.stringify(schema.enum) +" } });",
      "}"
    );

    return code;
  },
  allOf: function (schema, path) {
    var code = [];
    var index;

    code.push(
      "var failed = false, subReports = [];"
    );

    for (index = 0; index < schema.allOf.length; index++) {
      code.push(
        "result = validators['"+ path +"/allOf/"+ index +"'](data, parent, root, Utils);",
        "if (!result.valid) {",
          "report.valid = false;",
          "failed = true;",
          "subReports.push(result);",
        "}"
      );
    }

    code.push(
      "if (failed) {",
        "report.valid = false;",
        "report.errors.push({ code: 'ALL_OF_FAILED', schema: '"+ path +"', subReports: subReports });",
      "}"
    );

    return code;
  },
  anyOf: function (schema, path) {
    var code = [];
    var index;

    code.push(
      "var passed = false, subReports = [];"
    );

    for (index = 0; index < schema.anyOf.length; index++) {
      if (index === 0) {
        code.push(
          "result = validators['"+ path +"/anyOf/"+ index +"'](data, parent, root, Utils);",
          "if (result.valid) {",
            "passed = true;",
          "} else {",
            "subReports.push(result);",
          "}"
        );
      } else {
        code.push(
          "if (!passed) {",
            "result = validators['"+ path + "/anyOf/"+ index +"'](data, parent, root, Utils);",
            "if (result.valid) {",
              "passed = true;",
            "} else {",
              "subReports.push(result);",
            "}",
          "}"
        );
      }
    };

    code.push(
      "if (!passed) {",
        "report.valid = false;",
        "report.errors.push({ code: 'ANY_OF_MISSING', schema: '"+ path +"', subReports: subReports });",
      "}"
    );

    return code;
  },
  oneOf: function (schema, path) {
    var code = [];
    var index;
    code.push(
      "var pass_count = 0, subReports = [];"
    );

    for (index = 0; index < schema.oneOf.length; index++) {
      code.push(
        "result = validators['"+ path +"/oneOf/"+ index +"'](data, parent, root, Utils);",
        "subReports.push(result);",
        "if (result.valid) {",
          "pass_count++;",
        "}"
      );
    }

    code.push(
      "if (pass_count === 0) {",
        "report.valid = false;",
        "report.errors.push({ code: 'ONE_OF_MISSING', schema: '"+ path +"', subReports: subReports });",
        // rollback all changes
        "var _len = subReports.length;",
        "while (_len--) {",
          "if (subReports[_len].rollback !== undefined) {",
            "subReports[_len].rollback();",
            "delete subReports[_len].rollback;",
          "}",
        "}",
      "} else if (pass_count > 1) {",
        "report.valid = false;",
        "report.errors.push({ code: 'ONE_OF_MULTIPLE', schema: '"+ path +"', subReports: subReports });",
        // rollback all changes
        "var _len = subReports.length;",
        "while (_len--) {",
          "if (subReports[_len].rollback !== undefined) {",
            "subReports[_len].rollback();",
            "delete subReports[_len].rollback;",
          "}",
        "}",
      "}"
    );

    return code;
  },
  not: function (schema, path) {
    var code = [];
    code.push(
      "result = validators['"+ path +"/not'](data, parent, root, Utils);",
      "if (result.valid) {",
        "report.valid = false;",
        "if (result.rollback !== undefined) { result.rollback(); }",
        "report.errors.push({ code: 'NOT_PASSED', schema: '"+ path +"', subReport: result });",
      "}"
    );
    return code;
  },
  definitions: function (schema, path) {}

}

var TransformGenerators = {};

var ArrayGenerator = function (code, schema, path) {
  if (Array.isArray(schema.items)) {
    code.push(
      "while (_length--) {",
        "if (_length < "+ schema.items.length +") {",
          // TODO: insert pre validation transformers
          "result = validators['"+ path + "/items/' + _length" +"](data[_length], data, root, Utils);",
          // TODO: insert post validation transformers
          "if (!result.valid) {",
            "report.valid = false;",
            "subReport.push(result);",
          "}"
    )
    if (Utils.typeOf(schema.additionalItems) === "object") {
      code.push(
        "} else {",
          // TODO: insert pre validation transformers
          "result = validators['"+ path + "/additionalItems'](data[_length], data, root, Utils);",
          // TODO: insert post validation transformers
          "if (!result.valid) {",
            "report.valid = false;",
            "subReport.push(result);",
          "}",
        "}",
      "}"
      );
    } else {
      code.push(
        "}",
      "}"
      );
    }
  } else if (typeof schema.items === "object") {
    // If items is a schema, then the child instance must be valid against this schema,
    // regardless of its index, and regardless of the value of "additionalItems".
    code.push(
      "if (_length > 0) report.subReport = [];",
      "while (_length--) {",
        // TODO: insert pre validation transformers
        "result = validators['"+ path +"/items'](data[_length], data, root, Utils);",
        // TODO: insert post validation transformers
        "if (!result.valid) {",
          "report.valid = false;",
          "subReport.push(result);",
        "}",
      "}"
    );
  }
  code.push(
    "if (subReport.length > 0) { report.subReport = subReport; }"
  );
};

var ObjectGenerator = function (code, schema, path) {
  if (Utils.typeOf(schema.properties) === 'object' || Utils.typeOf(schema.patternProperties) === 'object' || Utils.typeOf(schema.additionalProperties === 'object')) {
    var additionalProperties = schema.additionalProperties;
    var index, index2, key, required_keys = [], defaults = {};
    var properties = [];
    var patternProperties = [];

    if (Utils.typeOf(schema.required) === 'array') {
      for (index = 0; index < schema.required.length; index++) {
        required_keys.push(schema.required[index]);
      }
    }

    if (Utils.typeOf(schema.properties) === 'object') {
      for (key in schema.properties) {
        properties.push(key);
        if (schema.properties[key].default !== undefined) {
          defaults[key] = schema.properties[key].default;
          required_keys.push(key);
        }
      }
    }

    if (Utils.typeOf(schema.patternProperties) === 'object') {
      for (key in schema.patternProperties) {
        patternProperties.push(key);
        if (schema.patternProperties[key].default !== undefined) {
          defaults[key] = schema.properties[key].default;
          required_keys.push(key);
        }
      }
    }

    // Should defaults in additionalProperties be respected ??
    if (additionalProperties === true || additionalProperties === undefined) {
        additionalProperties = {};
    }

    code.push(
      "var _matches = {}, _additionalKeys = [], defaults = "+ JSON.stringify(defaults) +" ;"
    );

    if (required_keys.length > 0) {
      code.push("var required_keys = "+ JSON.stringify(required_keys) +", _rindex = "+ (required_keys.length) +" ;");
    }

    // Iterate through keys once
    code.push(
      "for (var key in data) {",
        "_length++;"
    );

    // Check if any properties or dependencies have been defined
    if (properties.length > 0 || (Utils.typeOf(schema.dependencies) === 'object' && Object.keys(schema.dependencies).length > 0 )) {
      code.push(
        "switch (key) {"
      );
      var prop_index = {};
      // Iterate over properties
      for (index = 0; index < properties.length; index++) {
        var rpos;
        key = properties[index];
        prop_index[key] = true;
        code.push(
          "case '"+ Utils.escapeString(key) +"':",
            // TODO: insert pre validation transformers
            "result = validators['"+ path +"/properties/"+ Utils.escapeString(key) +"'](data['"+ Utils.escapeString(key) +"'], data, root, Utils);",
            // TODO: insert post validation transformers
            "_matches['"+ Utils.escapeString(key) +"'] = true;"
        );

        if (Utils.typeOf(schema.required) === 'array' && schema.required.length > 0 && (rpos = schema.required.indexOf(key)) >= 0) {
          code.push(
            "required_keys["+ rpos +"] = null;"
          );
        }

        code.push (
            "if (!result.valid) {",
              "report.valid = false;",
              "subReport.push(result);",
            "}"
        );

        // Validate against dependant schema if present
        if (Utils.typeOf(schema.dependencies) === 'object' && key in schema.dependencies) {
          if (Utils.typeOf(schema.dependencies[key]) === 'object') {
            code.push(
              // TODO: insert pre validation transformers
              "result = validators['"+ path +"/dependencies/"+ Utils.escapeString(key) +"'](data, parent, root, Utils);",
              // TODO: insert post validation transformers
              "if (!result.valid) {",
                "report.valid = false;",
                "subReport.push(result);",
              "}"
            );
          } else {
            // Ensure all keys are present
            var conditions = []
            var required_values = schema.dependencies[key];
            for (index2 = 0; index2 < required_values.length; index2++) {
              conditions.push("'"+ Utils.escapeString(required_values[index2]) +"' in data");
            }
            code.push(
              "if (!("+ conditions.join(' && ') +")) {",
                "report.valid = false;",
                "report.errors.push({ code: 'OBJECT_DEPENDENCY_KEY', schema: '"+ path +"', params: { actual: null, expected: "+ JSON.stringify(required_values) +" } });",
              "}"
            )
          }
        }
        code.push(
            "break;"
        );
      }
      // @TODO - Optimize dependency validation
      // Add switch cases for dependency keys as well
      for (key in schema.dependencies) {
        if (prop_index[key] === undefined) {
          code.push(
            "case '"+ Utils.escapeString(key) +"':"
          );
          if (Utils.typeOf(schema.dependencies[key]) === 'object') {
            code.push(
              // TODO: insert pre validation transformers
              "result = validators['"+ path +"/dependencies/"+ Utils.escapeString(key) +"'](data, parent, root, Utils);",
              // TODO: insert post validation transformers
              "if (!result.valid) {",
                "report.valid = false;",
                "subReport.push(result);",
              "}"
            );
          } else {
            // Ensure all keys are present
            var conditions = []
            var required_values = schema.dependencies[key];
            for (index2 = 0; index2 < required_values.length; index2++) {
              conditions.push("'"+ Utils.escapeString(required_values[index2]) +"' in data");
            }
            code.push(
              "if (!("+ conditions.join(' && ') +")) {",
                "report.valid = false;",
                "report.errors.push({ code: 'OBJECT_DEPENDENCY_KEY', schema: '"+ path +"', params: { actual: null, expected: "+ JSON.stringify(required_values) +" } });",
              "}"
            )
          }
          code.push(
            "break;"
          );
        }
      }


      code.push("}");
    }
    // Iterate over patternProperties for each key
    if (patternProperties.length > 0) {

      for (index = 0; index < patternProperties.length; index++) {
        code.push(
          "if (/"+ Utils.escapeRegexp(patternProperties[index]) +"/.test(key)) {",
            // TODO: insert pre validation transformers
            "result = validators['"+ path +"/patternProperties/"+ Utils.escapeRegexp(patternProperties[index]) +"'](data[key], data, root, Utils);",
            // TODO: insert post validation transformers
            "_matches[key] = true;",
            "if (!result.valid) {",
              "report.valid = false;",
              "subReport.push(result);",
            "}",
          "}"
        );
      }
    }

    // If additional properties is a schema check against it
    if (Utils.typeOf(schema.additionalProperties) === 'object') {
      code.push(
        "if (!_matches[key]) {",
          // TODO: insert pre validation transformers
          "result = validators['"+path+"/additionalProperties'](data[key], data, root, Utils);",
          // TODO: insert post validation transformers
          "if (!result.valid) {",
            "report.valid = false;",
            "subReport.push(result);",
          "}",
        "}"
      );
    } else if (additionalProperties === false) {
      code.push(
        "if (_matches[key] === undefined) {",
          "_additionalKeys.push(key);",
        "}"
      );
    }

    // End of key iteration loop
    code.push("}");

    // Check if all required keys were found
    if (required_keys.length > 0) {
      code.push(
        "while (_rindex--) {",
          "var val = required_keys[_rindex];",
          // Apply default values
          "if (_rindex >= "+ (Utils.typeOf(schema.required) === 'array' ? schema.required.length : 0 ) +" && !(val in _matches)) {",
            "_matches[val] = true;",
            "data[val] = defaults[val];",
            // Validate default value
            "result = validators['"+ path +"/properties/' + val](data[val], data, root, Utils);",
            "if (!result.valid) {",
              "report.valid = false;",
              "subReport.push(result);",
            "}",
            // Store rollback function
            "rollbacks.push((function (data, key) {",
              "return function() {",
                "delete data[key];",
              "}",
            "})(data, val));",
          "} else {",
            "if (val !== null && !(val in _matches)) {",
              "report.valid = false;",
              "report.errors.push({ code: 'OBJECT_MISSING_REQUIRED_PROPERTY', schema: '"+ path +"', params: { actual: null, expected: val } });",
            "}",
          "}",
        "}"
      );
    }

    // Check if any additional properties were found
    if (additionalProperties === false) {
      code.push(
        "if (_additionalKeys.length > 0) {",
          "report.valid = false;",
          "report.errors.push({ code: 'OBJECT_ADDITIONAL_PROPERTIES', schema: '"+ path +"', params: { actual: _additionalKeys } });",
        "}"
      );
    }

    // Check if minProperties and maxProperties were satisfied
    if (Utils.typeOf(schema.minProperties) === 'integer') {
      code.push(
        "if (_length < "+ schema.minProperties +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'OBJECT_PROPERTIES_MINIMUM', schema: '"+ path +"', params: { actual: _length, expected: "+ schema.minProperties +" } });",
        "}"
      );
    }

    if (Utils.typeOf(schema.maxProperties) === 'integer') {
      code.push(
        "if (_length > "+ schema.maxProperties +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'OBJECT_PROPERTIES_MAXIMUM', schema: '"+ path +"', params: { actual: _length, expected: "+ schema.maxProperties +" } });",
        "}"
      );
    }

    code.push(
      "if (!report.valid) {",
        "var rb_index, sr_index;",
        "if ((rb_index = rollbacks.length) > 0) {",
          "while (rb_index--) {",
            "rollbacks[rb_index]();",
          "}",
        "}",
        "if ((sr_index = subReport.length) > 0) {",
          "while (sr_index--) {",
            "if (subReport[sr_index].rollback !== undefined) {",
              "subReport.rollback()",
            "}",
          "}",
        "}",
        "report.subReport = subReport;",
      "} else if (rollbacks.length > 0) {",
        "report.rollback = function () {",
          "var rb_index = rollbacks.length;",
          "while (rb_index--) {",
            "rollbacks[rb_index]();",
          "}",
        "}",
      "}"
    );
  }
};

var SchemaGenerator = function (schema, path, schema_id, cache) {

  var block_type, keyword_rank, keywords = [], blocks = {
    any: { start: null, end: null },
    number: { start: null, end: null },
    string: { start: null, end: null },
    array: { start: null, end: null },
    object: { start: null, end: null }
  }, code = [
    "validators['"+ path +"'] = function (data, parent, root, Utils) {",
      "var report = { valid: true, schema: '"+ path +"', errors: [] }, result, subReport = [], rollbacks = [];",
      "var _areEqual = Utils.areEqual;",
      "var _typeOf = Utils.typeOf;",
      "var _unicodeLength = Utils.unicodeLength;",
      "var _isUniqueArray = Utils.isUniqueArray;",
      "var _format = Utils.format;",
      "var _type = typeof data;",
      "var type = _typeOf(data, _type);",
      "var _length = 0;"
  ];

  for (key in schema) {
    // Calculate start and end validation for each type of block
    if (KEYWORD_META[key] === undefined) {
      // We assume the keyword is a json schema defined to be referenced by a json pointer
      if (cache[path + '/' + key] === undefined) {
        cache[path + '/' + key] = (function (key, schema, path) {
          return function() {
            var schema_code = SchemaGenerator(schema[key], path + "/" + key, schema_id, cache);
            code = Array.prototype.splice.apply(code, [10, 0].concat(schema_code));
            cache[path + '/' + key] = true;
          };
        })(key, schema, path);
      }
      continue;
    }
    keywords.push(key);
    block_type = blocks[KEYWORD_META[key][1]];
    keyword_rank = KEYWORD_META[key][0];
    if (block_type.start === null || block_type.start > keyword_rank ) {
      block_type.start = keyword_rank;
    }
    if (block_type.end === null || block_type.end < keyword_rank ) {
      block_type.end = keyword_rank;
    }
  }

  keywords.sort(function (a, b) {
    if (KEYWORD_META[a] === undefined || KEYWORD_META[b] === undefined) {
      return 10000;
    }
    return KEYWORD_META[a][0] - KEYWORD_META[b][0];
  });

  for (var index = 0; index < keywords.length; index++) {
    var generator, keyword = keywords[index];

    if ((generator = ValidationGenerators[keyword]) != null) {
      var keyword_type = KEYWORD_META[keyword][1];

      // Open type check block
      if (blocks[keyword_type].start === KEYWORD_META[keyword][0]) {
        blocks[keyword_type].start = null;
        switch (keyword_type) {
          case 'string':
          case 'number':
            code.push("if (_type === '"+ keyword_type +"') {");
            break;
          case 'array':
            code.push(
              "if (type === 'array') {",
                "_length = data.length;"
            );
            break;
          case 'object':
            code.push(
              "if (type === 'object') {",
                "var _keys = [];"
            );
            break;
        }
      }

      code = code.concat(generator(schema, path));

      // Close type check block
      if (blocks[keyword_type].end === KEYWORD_META[keyword][0]) {
        blocks[keyword_type].end = null;
        switch (keyword_type) {
          case 'string':
          case 'number':
            code.push("}");
            break;
          case 'array':
            ArrayGenerator(code, schema, path);
            code.push("}");
            break;
          case 'object':
            ObjectGenerator(code, schema, path);
            code.push("}");
            break;
        }
      }
    }

  }

  if (Utils.typeOf(schema.$ref) === 'string') {
    if (schema.$ref[0] === '#') {
      if (code.length === 10) {
        code = [
          "validators['"+ path +"'] = function (data, parent, root, Utils) {",
            "return validators['"+ schema_id + Utils.decodeJSONPointer(schema.$ref.slice(1)) +"'](data, parent, root, Utils);",
          "}"
        ];
      } else {
        code.push(
          "return validators['"+ schema_id + Utils.decodeJSONPointer(schema.$ref.slice(1)) +"'](data, parent, root, Utils);",
          "}"
        );
      }
      if (typeof cache[schema_id + Utils.decodeJSONPointer(schema.$ref.slice(1))] === 'function') {
        cache[schema_id + Utils.decodeJSONPointer(schema.$ref.slice(1))]();
      }
    } else {
      if (code.length === 10) {
        code = [
          "validators['"+ path +"'] = function (data, parent, root, Utils) {",
            "return validators['"+ Utils.decodeJSONPointer(schema.$ref) +"'](data, parent, root, Utils);",
          "}"
        ];
      } else {
        code.push(
          "return validators['"+ Utils.decodeJSONPointer(schema.$ref) +"'](data, parent, root, Utils);",
          "}"
        );
      }
      if (typeof cache[Utils.decodeJSONPointer(schema.$ref)] === 'function') {
        cache[Utils.decodeJSONPointer(schema.$ref)]();
      }
    }

  } else {
    code.push(
        "return report;",
      "};"
    );
  }

  if (code.length === 12) {
    code = [
      "validators['"+ path +"'] = function (data, parent, root, Utils) { return { valid: true, errors: [] }; }"
    ];
  }

  // Generate validators for arrays
  if (Array.isArray(schema.items)) {
    var index;
    for (index = 0; index < schema.items.length; index++) {
      code = code.concat(SchemaGenerator(schema.items[index], path + "/items/" + index, schema_id, cache));
    }
    if (Utils.typeOf(schema.additionalItems) === "object") {
      code = code.concat(SchemaGenerator(schema.additionalItems, path + "/additionalItems", schema_id, cache));
    }
  } else if (typeof schema.items === "object") {
    code = code.concat(SchemaGenerator(schema.items, path + "/items", schema_id, cache));
  }
  // Generate validators for objects
  var key, value;
  if (Utils.typeOf(schema.properties) == 'object') {
    for (key in schema.properties) {
      value = schema.properties[key];
      code = code.concat(SchemaGenerator(value, path + "/properties/" + key, schema_id, cache));
    }
  }
  if (Utils.typeOf(schema.patternProperties) == 'object') {
    for (key in schema.patternProperties) {
      value = schema.patternProperties[key];
      code = code.concat(SchemaGenerator(value, path + "/patternProperties/" + key, schema_id, cache));
    }
  }
  if (Utils.typeOf(schema.additionalProperties) == 'object') {
    code = code.concat(SchemaGenerator(schema.additionalProperties, path + "/additionalProperties", schema_id, cache));
  }
  if (Utils.typeOf(schema.dependencies) === 'object') {
    for (key in schema.dependencies) {
      value = schema.dependencies[key];
      if (Utils.typeOf(value) === 'object') {
        code = code.concat(SchemaGenerator(value, path + "/dependencies/" + key, schema_id, cache));
      }
    }
  }
  if (Utils.typeOf(schema.allOf) === 'array' && schema.allOf.length > 0) {
    for (index in schema.allOf) {
      value = schema.allOf[index];
      code = code.concat(SchemaGenerator(value, path + "/allOf/" + index, schema_id, cache));
    }
  }
  if (Utils.typeOf(schema.anyOf) === 'array' && schema.anyOf.length > 0) {
    for (index in schema.anyOf) {
      value = schema.anyOf[index];
      code = code.concat(SchemaGenerator(value, path + "/anyOf/" + index, schema_id, cache));
    }
  }
  if (Utils.typeOf(schema.oneOf) === 'array' && schema.oneOf.length > 0) {
    for (index in schema.oneOf) {
      value = schema.oneOf[index];
      code = code.concat(SchemaGenerator(value, path + "/oneOf/" + index, schema_id, cache));
    }
  }
  if (Utils.typeOf(schema.not) === 'object') {
    code = code.concat(SchemaGenerator(schema.not, path + "/not", schema_id, cache));
  }

  if (Utils.typeOf(schema.definitions) === 'object') {
    for (index in schema.definitions) {
      value = schema.definitions[index];
      if (!cache[path + "/definitions/" + index]) {
        code = code.concat(SchemaGenerator(value, path + "/definitions/" + index, schema_id, cache));
        cache[path + "/definitions/" + index] = true;
      }
    }
  }

  return code;
}

module.exports = {

  registerFormat: function (format, validation_func) {
    if (Utils.format[format] === undefined) {
      Utils.format[format] = validation_func;
    } else {
      throw new Error("The format '"+ format +"' has already been registered");
    }
  },

  registerValidator: function (keyword, meta, validation_func) {
    KEYWORD_META[keyword] = [meta.rank, meta.type];
    ValidationGenerators[keyword] = validation_func;
  },

  registerTransformer: function (keyword, order, transform_gen_func) {
    if (Utils.transform === undefined) {
      Utils.transform[keyword] = {
        order: order,
        func: transform_func
      }
    } else {
      throw new Error("The transformer '' has already been registered");
    }
  },

  validator: function (schemas, options) {
    var body, index, generate, validator, schema, SCHEMA_ID, code;
    options = (options == null) ? {} : options;
    options.beautify = (options.beautify == null) ? true : options.beautify;

    // TODO: Validate Schemas
    if (Utils.typeOf(schemas) === 'object') {
      schemas = [schemas];
    }

    body = [
      "var validators = {};"
    ];

    // Generate validators for each schema provided
    for (index = 0; index < schemas.length; index++) {
      schema = schemas[index];
      SCHEMA_ID = (schema.id != null) ? schema.id : index;
      body = body.concat(SchemaGenerator(schema, SCHEMA_ID, SCHEMA_ID, {}));
    }

    body.push(
      // Validation Function
      "return function (data, schema, Utils) {",
        "return validators[schema](data, null, data, Utils);",
      "}"
    );

    if (options.beautify) {
      // Generate readable code
      var ast = UglifyJS.parse("generate = function () {"+body.join("\n")+"}");
      ast.figure_out_scope();
      var stream = UglifyJS.OutputStream({ beautify: true });
      ast.print(stream);
      code = stream.toString();
    } else {
      // Generate compressed code
      var ast = UglifyJS.parse("generate = function () {"+body.join("\n")+"}");
      ast.figure_out_scope();
      var compressor = UglifyJS.Compressor({ warnings: false });
      var compressed_ast = ast.transform(compressor);
      compressed_ast.figure_out_scope();
      compressed_ast.compute_char_frequency();
      compressed_ast.mangle_names();
      var stream = UglifyJS.OutputStream({ beautify: true });
      compressed_ast.print(stream);
      code = stream.toString();
    }
    console.log(code);
    eval(code);

    validator = generate();

    return function (data, schema) {
      if (!schema) throw Error('Please specify a schema');
      var report = validator(data, schema, Utils);
      delete report.rollback;
      return report
    };
  }

}

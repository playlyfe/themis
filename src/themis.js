var KEYWORD_META = {
  // All types
  '$schema': [-1, 'any'],
  'title': [-1, 'any'],
  'description': [-1, 'any'],
  'default': [-1, 'any'],
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
  'allOf': [180,'any'],
  'anyOf': [190,'any'],
  'oneOf': [200,'any'],
  'not': [210, 'any'],
  'enum': [220, 'any'],
  'definitions': [230, 'any'],
  'format': [240, 'any']
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
    return str;
  }

};

var ValidationGenerators = {
  'type': function (schema, path, blocks) {
    var code = [""];

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
      "report.errors.push({ code: 'INVALID_TYPE', params: { actual: type, expected: '"+ schema.type + "' } });",
      "};"
    );
    return code;
  },
  // Numeric Validations
  // http://json-schema.org/latest/json-schema-validation.html#rfc.section.5.1.1.2
  multipleOf: function (schema, path, blocks) {},
  minimum: function (schema, path, blocks) {
    var code = [];

    if (blocks['number'].start === KEYWORD_META['minimum'][0]) {
      blocks['number'].start = null;
      code.push("if (_type === 'number') {");
    }

    if (schema.exclusiveMinimum !== true) {
      code.push(
        "if (data < "+ schema.minimum +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'MINIMUM', params: { actual: data, expected: "+ schema.minimum +" } });",
        "}"
      );
    } else {
      code.push(
        "if (data <= "+ schema.minimum +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'MINIMUM_EXCLUSIVE', params: { actual: data, expected: "+ schema.minimum +" } });",
        "}"
      );
    }

    if (blocks['number'].end === KEYWORD_META['minimum'][0]) {
      blocks['number'].end = null;
      code.push("}");
    }

    return code;
  },
  exclusiveMinimum: function (schema, path, blocks) {
    // covered in minimum
    var code = [];

    if (blocks['number'].start === KEYWORD_META['exclusiveMinimum'][0]) {
      blocks['number'].start = null;
      code.push("if (_type === 'number') {");
    }

    if (blocks['number'].end === KEYWORD_META['exclusiveMinimum'][0]) {
      blocks['number'].end = null;
      code.push("}");
    }

    return code;
  },
  maximum: function (schema, path, blocks) {
    var code = [];

    if (blocks['number'].start === KEYWORD_META['maximum'][0]) {
      blocks['number'].start = null;
      code.push("if (_type === 'number') {");
    }

    if (schema.exclusiveMaximum !== true) {
      code.push(
        "if (data > "+ schema.maximum +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'MAXIMUM', params: { actual: data, expected: "+ schema.maximum +" } });",
        "}"
      );
    } else {
      code.push(
        "if (data >= "+ schema.maximum +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'MAXIMUM_EXCLUSIVE', params: { actual: data, expected: "+ schema.maximum +" } });",
        "}"
      );
    }

    if (blocks['number'].end === KEYWORD_META['maximum'][0]) {
      blocks['number'].end = null;
      code.push("}");
    }

    return code;
  },
  exclusiveMaximum: function (schema, path, blocks) {
    // covered in maximum
    var code = [];

    if (blocks['number'].start === KEYWORD_META['exclusiveMaximum'][0]) {
      blocks['number'].start = null;
      code.push("if (_type === 'number') {");
    }

    if (blocks['number'].end === KEYWORD_META['exclusiveMaximum'][0]) {
      blocks['number'].end = null;
      code.push("}");
    }

    return code;
  },
  // String Validations
  minLength: function (schema, path, blocks) {
    var code = [];

    if (blocks['string'].start === KEYWORD_META['minLength'][0]) {
      blocks['string'].start = null;
      code.push("if (_type === 'string') {");
    }

    code.push(
      "if ((_length = _unicodeLength(data)) < "+ schema.minLength +") {",
        "report.valid = false;",
        "report.errors.push({ code: 'MIN_LENGTH', params: { actual: _length, expected: "+ schema.minLength +" } });",
      "}"
    );

    if (blocks['string'].end === KEYWORD_META['minLength'][0]) {
      blocks['string'].end = null;
      code.push("}");
    }

    return code;
  },
  maxLength: function (schema, path, blocks) {
    var code = [];

    if (blocks['string'].start === KEYWORD_META['maxLength'][0]) {
      blocks['string'].start = null;
      code.push("if (_type === 'string') {");
    }

    // We've already calculate _length so don't recalculate
    if (schema.minLength != null) {
      code.push("if (_length > "+ schema.maxLength +") {");
    } else {
      code.push("if ((_length = _unicodeLength(data)) > "+ schema.maxLength +") {");
    }

    code.push(
        "report.valid = false;",
        "report.errors.push({ code: 'MAX_LENGTH', params: { actual: _length, expected: "+ schema.maxLength +" } });",
      "}"
    );

    if (blocks['string'].end === KEYWORD_META['maxLength'][0]) {
      blocks['string'].end = null;
      code.push("}");
    }

    return code;
  },
  pattern: function (schema, path, blocks) {
    var code = [];

    if (blocks['string'].start === KEYWORD_META['pattern'][0]) {
      blocks['string'].start = null;
      code.push("if (_type === 'string') {");
    }

    code.push(
      "if (!/"+ schema.pattern +"/.test(data)) {",
        "report.valid = false;",
        "report.errors.push({ code: 'PATTERN', params: { actual: data, expected: '"+ schema.pattern +"' } });",
      "}"
    );

    if (blocks['string'].end === KEYWORD_META['pattern'][0]) {
      blocks['string'].end = null;
      code.push("}");
    }

    return code;
  },

  // Array Validations
  additionalItems: function (schema, path, blocks) {
    var code = [];

    if (blocks['array'].start === KEYWORD_META['additionalItems'][0]) {
      blocks['array'].start = null;
      code.push(
        "if (type === 'array') {",
          "_length = data.length;"
      );
    }

    if (schema.additionalItems === false && Utils.typeOf(schema.items) === 'array') {
      code.push(
        "if (_length > "+ schema.items.length +") {",
          "report.valid = false;",
          "report.errors.push({ code: 'ARRAY_ADDITIONAL_ITEMS', params: { actual: _length, expected: "+ schema.items.length +" } });",
        "}"
      );
    }

    if (blocks['array'].end === KEYWORD_META['additionalItems'][0]) {
      blocks['array'].end = null;
      ArrayGenerator(code, schema, path);
      code.push(
        "}"
      );
    }

    return code;
  },
  items: function (schema, path, blocks) {
    // covered in additionalItems
    var code = [];

    if (blocks['array'].start === KEYWORD_META['items'][0]) {
      blocks['array'].start = null;
      code.push(
        "if (type === 'array') {",
          "_length = data.length;"
      );
    }

    if (blocks['array'].end === KEYWORD_META['items'][0]) {
      blocks['array'].end = null;
      ArrayGenerator(code, schema, path);
      code.push("}");
    }

    return code;
  },
  maxItems: function (schema, path, blocks) {
    var code = [];

    if (blocks['array'].start === KEYWORD_META['maxItems'][0]) {
      blocks['array'].start = null;
      code.push(
        "if (type === 'array') {",
          "_length = data.length;"
      );
    }

    code.push(
      "if (_length > "+ schema.maxItems +") {",
        "report.valid = false;",
        "report.errors.push({ code: 'ARRAY_LENGTH_LONG', params: { actual: _length, expected: "+ schema.maxItems +" } });",
      "}"
    );

    if (blocks['array'].end === KEYWORD_META['maxItems'][0]) {
      blocks['array'].end = null;
      ArrayGenerator(code, schema, path);
      code.push("}");
    }

    return code;
  },
  minItems: function (schema, path, blocks) {
    var code = [];

    if (blocks['array'].start === KEYWORD_META['minItems'][0]) {
      blocks['array'].start = null;
      code.push(
        "if (type === 'array') {",
          "_length = data.length;"
      );
    }

    code.push(
      "if (_length < "+ schema.minItems +") {",
        "report.valid = false;",
        "report.errors.push({ code: 'ARRAY_LENGTH_SHORT', params: { actual: _length, expected: "+ schema.minItems +" } });",
      "}"
    );

    if (blocks['array'].end === KEYWORD_META['minItems'][0]) {
      blocks['array'].end = null;
      ArrayGenerator(code, schema, path);
      code.push("}");
    }

    return code;
  },
  uniqueItems: function (schema, path, blocks) {
    var code = [];

    if (blocks['array'].start === KEYWORD_META['uniqueItems'][0]) {
      blocks['array'].start = null;
      code.push(
        "if (type === 'array') {",
          "_length = data.length;"
      );
    }

    if (schema.uniqueItems === true) {

      code.push(
        "var matches = [];",
        "if (_isUniqueArray(data, matches) === false) {",
          "report.valid = false;",
          "report.errors.push({ code: 'ARRAY_UNIQUE', params: { actual: matches, expected: [] } });",
        "}"
      );

    }

    if (blocks['array'].end === KEYWORD_META['uniqueItems'][0]) {
      blocks['array'].end = null;
      ArrayGenerator(code, schema, path);
      code.push("}");
    }

    return code;
  },
  // Object Validations

  required: function (schema, path, blocks) {
    var code = [];

    if (blocks['object'].start === KEYWORD_META['required'][0]) {
      blocks['object'].start = null;
      code.push(
        "if (type === 'object') {",
          "var _keys = [];"
      );

    }

    if (blocks['object'].end === KEYWORD_META['required'][0]) {
      blocks['object'].end = null;
      ObjectGenerator(code, schema, path);
      code.push("}");
    }

    return code;
  },
  additionalProperties: function (schema, path, blocks) {
    var code = [];

    if (blocks['object'].start === KEYWORD_META['additionalProperties'][0]) {
      blocks['object'].start = null;
      code.push(
        "if (type === 'object') {",
          "var _keys = [];"
      );
    }

    // Handled in properties validation
    if (schema.properties === undefined && schema.patternProperties === undefined ) {
      code = code.concat(ValidationGenerators.properties(schema, path, blocks));
    }

    if (blocks['object'].end === KEYWORD_META['additionalProperties'][0]) {
      blocks['object'].end = null;
      ObjectGenerator(code, schema, path);
      code.push("}");
    }

    return code;
  },
  patternProperties: function (schema, path, blocks) {
    var code = [];

    if (blocks['object'].start === KEYWORD_META['patternProperties'][0]) {
      blocks['object'].start = null;
      code.push(
        "if (type === 'object') {",
          "var _keys = [];"
      );
    }

    // Handled in properties validation
    if (schema.properties === undefined) {
      //console.log("asdsaaaaaaaaaaaaaaaaa");
      code = code.concat(ValidationGenerators.properties(schema, path, blocks));
    }

    if (blocks['object'].end === KEYWORD_META['patternProperties'][0]) {
      blocks['object'].end = null;
      ObjectGenerator(code, schema, path);
      code.push("}");
    }

    return code;
  },
  properties: function (schema, path, blocks) {
    var code = [];

    if (blocks['object'].start === KEYWORD_META['properties'][0]) {
      blocks['object'].start = null;
      code.push(
        "if (type === 'object') {",
          "var _keys = [];"
      );
    }

    if (blocks['object'].end === KEYWORD_META['properties'][0]) {
      blocks['object'].end = null;
      ObjectGenerator(code, schema, path);
      code.push("}");
    }
    //console.log ("CODEE", code);
    return code;
  },
  minProperties: function (schema, path, blocks) {
    var code = [];

    if (blocks['object'].start === KEYWORD_META['minProperties'][0]) {
      blocks['object'].start = null;
      code.push(
        "if (type === 'object') {",
          "var _keys = [];"
      );
    }

    if (blocks['object'].end === KEYWORD_META['minProperties'][0]) {
      blocks['object'].end = null;
      ObjectGenerator(code, schema, path);
      code.push("}");
    }

    return code;
  },
  maxProperties: function (schema, path, blocks) {
    var code = [];

    if (blocks['object'].start === KEYWORD_META['maxProperties'][0]) {
      blocks['object'].start = null;
      code.push(
        "if (type === 'object') {",
          "var _keys = [];"
      );
    }

    if (blocks['object'].end === KEYWORD_META['maxProperties'][0]) {
      blocks['object'].end = null;
      ObjectGenerator(code, schema, path);
      code.push("}");
    }

    return code;
  },

  dependencies: function (schema, path, blocks) {
    var code = [];
    var properties = schema.properties !== undefined ? schema.properties : {};
    var patternProperties = schema.patternProperties !== undefined ? schema.patternProperties : {};

    if (blocks['object'].start === KEYWORD_META['dependencies'][0]) {
      blocks['object'].start = null;
      code.push(
        "if (type === 'object') {",
          "var _keys = [];"
      );
    }

    if (blocks['object'].end === KEYWORD_META['dependencies'][0]) {
      blocks['object'].end = null;
      ObjectGenerator(code, schema, path);
      code.push("}");
    }

    return code;
  },

  // Any type validations
  enum: function (schema, path, blocks) {},
  allOf: function (schema, path, blocks) {},
  anyOf: function (schema, path, blocks) {},
  oneOf: function (schema, path, blocks) {},
  not: function (schema, path, blocks) {},
  definitions: function (schema, path, blocks) {},
  format: function (schema, path, blocks) {}
}

var ArrayGenerator = function (code, schema, path) {
  code.push(
    "var result;",
    "var subReport = [];"
  );
  if (Array.isArray(schema.items)) {
    code.push(
      "while (_length--) {",
        "if (_length < "+ schema.items.length +") {",
          "result = validators['"+ path + "/items/' + _length" +"](data[_length], Utils);",
          "if (!result.valid) {",
            "report.valid = false;",
            "subReport.push(result);",
          "}"
    )
    if (Utils.typeOf(schema.additionalItems) === "object") {
      code.push(
        "} else {",
          "result = validators['"+ path + "/additionalItems'](data[_length], Utils);",
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
        "result = validators['"+ path +"/items'](data[_length], Utils);",
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
    var properties = schema.properties !== undefined ? Object.keys(schema.properties) : [];
    var patternProperties = schema.patternProperties !== undefined ? Object.keys(schema.patternProperties) : [];
    var additionalProperties = schema.additionalProperties;
    var index;

    if (additionalProperties === true || additionalProperties === undefined) {
        additionalProperties = {};
    }

    code.push(
      "var result, _error = false, _matches = {}, _additionalKeys = [], subReport = [];"
    );

    if (Utils.typeOf(schema.required) === 'array' && schema.required.length > 0) {
      code.push("var required_keys = "+ JSON.stringify(schema.required) +", _rindex = "+ schema.required.length +" ;");
    }
    // Iterate through keys once
    code.push(
      "for (key in data) {",
        "_length++;"
    );

    // Check if any properties have been defined
    if (properties.length > 0) {
      code.push(
        "switch (key) {"
      );

      // Iterate over properties
      for (index = 0; index < properties.length; index++) {
        var key = properties[index], rpos;
        code.push(
          "case '"+ Utils.escapeString(key) +"':",
            "result = validators['"+ path +"/properties/"+ Utils.escapeString(key) +"'](data['"+ Utils.escapeString(key) +"'], Utils);",
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
              "_error = true;",
              "subReport.push(result);",
            "}",
            "break;"
        );
      }

      code.push("}");
    }
      /*
        conditions.push("key === '"+ key +"'");
        code.push(
          "if ('"+ key +"' in data) {",
            "result = validators['"+ path +"/properties/"+ key +"'](data['"+key+"'], Utils);",
            "_matches['"+ key +"'] = true;",
            "if (!result.valid) {",
              "report.valid = false;",
              "_error = true;",
              "subReport.push(result);",
            "}"
        );
        if (Utils.typeOf(schema.required) === 'array' && schema.required.indexOf(key) >= 0) {
          code.push(
            "} else {",
              "report.valid = false;",
              "_error = true;",
              "report.errors.push({ code: 'OBJECT_MISSING_REQUIRED_PROPERTY', params: { actual: null, expected: '"+ key +"' } });",
            "}"
          );
        } else {
          code.push(
            "}"
          );
        }
      }*/

    // Iterate over patternProperties for each key
    if (patternProperties.length > 0) {

      for (index = 0; index < patternProperties.length; index++) {
        code.push(
          "if (/"+ Utils.escapeRegexp(patternProperties[index]) +"/.test(key)) {",
            "result = validators['"+ path +"/patternProperties/"+ Utils.escapeRegexp(patternProperties[index]) +"'](data[key], Utils);",
            "_matches[key] = true;",
            "if (!result.valid) {",
              "report.valid = false;",
              "_error = true;",
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
          "result = validators['"+path+"/additionalProperties'](data[key], Utils);",
          "if (!result.valid) {",
            "report.valid = false;",
            "_error = true;",
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
    if (Utils.typeOf(schema.required) === 'array' && schema.required.length > 0) {
      code.push(
        "while (_rindex--) {",
          "var val = required_keys[_rindex];",
          "if (val !== null && _matches[val] === undefined) {",
            "report.valid = false;",
            "_error = true;",
            "report.errors.push({ code: 'OBJECT_MISSING_REQUIRED_PROPERTY', params: { actual: null, expected: val } });",
          "}",
        "}"
      );
    }

    // Check if any additional properties were found
    if (additionalProperties === false) {
      code.push(
        "if (_additionalKeys.length > 0) {",
          "report.valid = false;",
          "_error = true;",
          "report.errors.push({ code: 'OBJECT_ADDITIONAL_PROPERTIES', params: { actual: _additionalKeys } });",
        "}"
      );
    }

    // Check if minProperties and maxProperties were satisfied
    if (Utils.typeOf(schema.minProperties) === 'integer') {
      code.push(
        "if (_length < "+ schema.minProperties +") {",
          "report.valid = false;",
          "_error = true;",
          "report.errors.push({ code: 'OBJECT_PROPERTIES_MINIMUM', params: { actual: _length, expected: "+ schema.minProperties +" } });",
        "}"
      );
    }

    if (Utils.typeOf(schema.maxProperties) === 'integer') {
      code.push(
        "if (_length > "+ schema.maxProperties +") {",
          "report.valid = false;",
          "_error = true;",
          "report.errors.push({ code: 'OBJECT_PROPERTIES_MAXIMUM', params: { actual: _length, expected: "+ schema.maxProperties +" } });",
        "}"
      );
    }

    code.push(
      "if (_error) { report.subReport = subReport; }"
    );
  }
};

var SchemaGenerator = function (schema, path) {
  var code = [
    "validators['"+ path +"'] = function (data, Utils) {",
      "var report = { valid: true, errors: [] };",
      "var _typeOf = Utils.typeOf;",
      "var _unicodeLength = Utils.unicodeLength;",
      "var _isUniqueArray = Utils.isUniqueArray;",
      "var _type = typeof data;",
      "var type = _typeOf(data, _type);",
      "var _length = 0;"
  ];

  // @TODO: Sort keys and generate validators in a specific order for additional optimizations
  var keywords = [];
  var blocks = {
    any: { start: null, end: null },
    number: { start: null, end: null },
    string: { start: null, end: null },
    array: { start: null, end: null },
    object: { start: null, end: null }
  };

  var block_type;

  for (key in schema) {
    keywords.push(key);
    // Calculate start and end validation for each type of block
    //console.log(key);
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
    return KEYWORD_META[a][0] - KEYWORD_META[b][0];
  });

  //console.log(keywords);

  for (var index = 0; index < keywords.length; index++) {
    if ((generator = ValidationGenerators[keywords[index]]) != null) {
      var frag = generator(schema, path, blocks)
      code = code.concat(frag);
      //console.log("REC", code, "FRAG", frag );
    }
  }

  code.push(
      //"if (report.valid) { delete report.errors; }",
      "return report;",
    "};"
  );

  if (code.length === 10) {
    code = [
      "validators['"+ path +"'] = function (data, Utils) { return { valid: true, errors: [] }; }"
    ];
  }

  // Generate validators for arrays
  if (Array.isArray(schema.items)) {
    var index;
    for (index = 0; index < schema.items.length; index++) {
      code = code.concat(SchemaGenerator(schema.items[index], path + "/items/" + index));
    }
    if (Utils.typeOf(schema.additionalItems) === "object") {
      code = code.concat(SchemaGenerator(schema.additionalItems, path + "/additionalItems"));
    }
  } else if (typeof schema.items === "object") {
    code = code.concat(SchemaGenerator(schema.items, path + "/items"));
  }
  // Generate validators for objects
  var key, value;
  if (Utils.typeOf(schema.properties) == 'object') {
    for (key in schema.properties) {
      value = schema.properties[key];
      code = code.concat(SchemaGenerator(value, path + "/properties/" + key));
    }
  }
  if (Utils.typeOf(schema.patternProperties) == 'object') {
    for (key in schema.patternProperties) {
      value = schema.patternProperties[key];
      code = code.concat(SchemaGenerator(value, path + "/patternProperties/" + key));
    }
  }
  if (Utils.typeOf(schema.additionalProperties) == 'object') {
    code = code.concat(SchemaGenerator(schema.additionalProperties, path + "/additionalProperties"));
  }

  return code;
}

module.exports = {

  validator: function (schema) {
    var SCHEMA_ID = (schema.id != null) ? schema.id : '';
    var body = [
      "var SCHEMA_ID = '"+ SCHEMA_ID +"';",
      // Schemas
      "var validators = {};"
    ];


    body = body.concat(SchemaGenerator(schema, SCHEMA_ID));

    body.push(
      // Validation Function
      "return function (data, Utils) {",
        "return validators[SCHEMA_ID](data, Utils);",
      "}"
    );

    //console.log("FN\n",body.join("\n"));
    //console.log("SC\n",schema);
    validate = new Function(body.join("\n"))();
    return function (data) {
      return validate(data, Utils);
    };
  }

}

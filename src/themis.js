/*jshint node: true, strict: true, unused: false, evil: true, loopfunc: true*/

"use strict";

var UglifyJS = require("uglify-js");
var fs = require("fs");

var KEYWORD_META = {
  // All types
  "default": [-10000, "any"],
  "$schema": [-150, "any"],
  "$ref": [-140, "any"],
  "title": [-130, "any"],
  "description": [-120, "any"],
  "definitions": [-110, "any"],
  "type": [0, "any"],
  // Numeric
  "multipleOf": [1000, "number"],
  "minimum": [2000, "number"],
  "exclusiveMinimum": [2500, "number"],
  "maximum": [3000, "number"],
  "exclusiveMaximum": [3500, "number"],
  // Strings
  "minLength": [4000, "string"],
  "maxLength": [5000, "string"],
  "pattern": [6000, "string"],
  "format": [6500, "string"],
  // Arrays
  "additionalItems": [7000, "array"],
  "items": [7500, "array"],
  "minItems": [8000, "array"],
  "maxItems": [9000, "array"],
  "uniqueItems": [10000, "array"],
  // Objects
  "required": [11000, "object"],
  "additionalProperties": [12000, "object"],
  "patternProperties": [13000, "object"],
  "properties": [14000, "object"],
  "minProperties": [15000, "object"],
  "maxProperties": [16000, "object"],
  "dependencies": [17000, "object"],
  // Any Type
  "allOf": [19000, "any"],
  "anyOf": [20000, "any"],
  "oneOf": [21000, "any"],
  "not": [22000, "any"],
  "enum": [23000, "any"]
};

var ERROR_MESSAGES = {
  INVALID_TYPE:                           "'Data should be of type ' + _schema.type + ' not ' + type",
  INVALID_FORMAT:                         "_stringify(data) + ' should match format ' + _schema.format",
  ENUM_MISMATCH:                          "_stringify(data) + ' is not one of ' + _stringify(_schema.enum)",
  ALL_OF_FAILED:                          "'Data is not valid under all of the given schemas'",
  ANY_OF_MISSING:                         "'Data is not valid under any of the given schemas'",
  ONE_OF_MISSING:                         "'Data is not valid under any of the given schemas'",
  ONE_OF_MULTIPLE:                        "'Data is valid under each of the given schemas, but should be valid under only one of them'",
  NOT_PASSED:                             "'Data should not match the given schema'",

  // Array errors
  ARRAY_LENGTH_SHORT:                     "'Array is too short, minimum ' + _schema.minItems",
  ARRAY_LENGTH_LONG:                      "'Array is too long, maximum ' + _schema.maxItems",
  ARRAY_UNIQUE:                           "'Array has non unique elements'",
  ARRAY_ADDITIONAL_ITEMS:                 "'Additional items not allowed, ' + _stringify(data.slice(_schema.items.length)) + ' is unexpected'",

  // Numeric errors
  MULTIPLE_OF:                            "_stringify(data) + ' is not a multiple of ' + _schema.multipleOf",
  MINIMUM:                                "_stringify(data) + ' is less than the minimum of ' + _schema.minimum",
  MINIMUM_EXCLUSIVE:                      "_stringify(data) + ' is less than or equal to the minimum of ' + _schema.minimum",
  MAXIMUM:                                "_stringify(data) + ' is greater than the maximum of ' + _schema.maximum",
  MAXIMUM_EXCLUSIVE:                      "_stringify(data) + ' is greater than or equal to the maximum of ' + _schema.maximum",

  // Object errors
  OBJECT_PROPERTIES_MINIMUM:              "'Object has less than the minimum of ' + _schema.minProperties + ' properties'",
  OBJECT_PROPERTIES_MAXIMUM:              "'Object has more than the maximum of ' + _schema.maxProperties + ' properties'",
  OBJECT_MISSING_REQUIRED_PROPERTY:       "'The required property \\\'' + val + '\\\' is missing'",
  OBJECT_ADDITIONAL_PROPERTIES:           "'Additional properties not allowed, ' + _stringify(_additionalKeys) + ' is unexpected'",
  OBJECT_DEPENDENCY_KEY:                  "'The keys ' + _stringify(_schema.dependencies[key]) + ' must exist due to key \"' + key + '\"'",

  // String errors
  MIN_LENGTH:                             "_stringify(data) + ' is too short, minimum ' + _schema.minLength",
  MAX_LENGTH:                             "_stringify(data) + ' is too long, maximum ' + _schema.maxLength",
  PATTERN:                                "_stringify(data) + ' should match the pattern ' + _schema.pattern",
};

var Utils = {

  rollback: function () { return; },

  dereferencePath: function (path, schema_id, schemas) {
    var hash_index, index, ref, parts;
    if (schemas[path]) {
      return schemas[path];
    } else {
      hash_index = path.indexOf("#");
      if (hash_index === 0) {
        if (path === "#") { return schemas[schema_id]; }
        ref = schemas[schema_id];
        parts = path.slice(2).split("/").map(function (part) { return Utils.decodeJSONPointer(part); });
        for (index = 0; index < parts.length; index++) {
          ref = ref[parts[index]];
        }
        return ref;
      } else if (hash_index > 0) {
        ref = schemas[path.slice(0, hash_index)];
        parts = path.slice(hash_index + 2).split("/").map(function (part) { return Utils.decodeJSONPointer(part); });
        for (index = 0; index < parts.length; index++) {
          ref = ref[parts[index]];
        }
        return ref;
      } else {
        throw Error("invalid ref: " + path + ' in ' + schema_id);
      }
    }
  },

  defaults: function (obj) {
    var i, length, source, prop;
    if (Utils.typeOf(obj) !== "object") { return obj; }
    for (i = 1, length = arguments.length; i < length; i++) {
      source = arguments[i];
      for (prop in source) {
        if (obj[prop] === undefined) { obj[prop] = source[prop]; }
      }
    }
    return obj;
  },

  typeOf: function (data, _type) {
    // We check if the raw typeof value is available before calculating it
    _type = (_type !== undefined) ? _type : typeof data;
    switch (_type) {
    case "object":
      if (data === null) {
        return "null";
      }
      if (Array.isArray(data)) {
        return "array";
      }
      return "object";
    case "number":
      if (Number.isFinite(data)) {
        if (data % 1 === 0) {
          return "integer";
        }
        return "number";
      }
      if (Number.isNaN(data)) {
        return "not-a-number";
      }
      return "unknown-number";
    default:
      return _type;
    }
  },

  unicodeLength: function (string) {
    return string.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "_").length;
  },

  decodeJSONPointer: function (str) {
    // http://tools.ietf.org/html/draft-ietf-appsawg-json-pointer-07#section-3
    if (str === "#") {
      return "";
    } else {
      return decodeURIComponent(str).replace(/~[0-1]/g, function (x) {
        return x === "~1" ? "/" : "~";
      });
    }
  },

  encodeJSONPointer: function (str) {
    return str.replace(/~|\//g, function (x) {
      return x === "~" ? "~0" : "~1";
    });
  },

  stringify: function (data) {
    var value = [], index, flag = false;
    var _stringify = Utils.stringify;
    switch (Utils.typeOf(data)) {
    case "object":
      value = ["{"];
      for (index in data) {
        if (!data.hasOwnProperty(index))  continue;
        if (!flag) {
          flag = true;
          value.push(" \"" + index + "\": " + _stringify(data[index]));
        } else {
          value.push(", \"" + index + "\": " + _stringify(data[index]));
        }
      }
      if (flag) {
        value.push(" }");
      } else {
        value.push("}");
      }
      break;
    case "array":
      value = ["["];
      for (index in data) {
        if (!data.hasOwnProperty(index))  continue;
        if (!flag) {
          flag = true;
          value.push(" " + _stringify(data[index]));
        } else {
          value.push(", " + _stringify(data[index]));
        }
      }
      if (flag) {
        value.push(" ]");
      } else {
        value.push("]");
      }
      break;
    case "undefined":
      value = ["undefined"];
      break;
    case "string":
      value = ["\"" + data + "\""];
      break;
    case "null":
      value = ["null"];
      break;
    case "not-a-number":
      value = ["NaN"];
      break;
    default:
      value = [data];
      break;
    }
    return value.join("");
  },

  areEqual: function (json1, json2) {
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
    var l = arr.length;
    var i = l, j = l, _areEqual = Utils.areEqual;
    /*jslint evil: true*/
    for (;i--;) {
      for (j = i; j--;) {
        if (_areEqual(arr[i], arr[j])) {
          if (indexes) { indexes.push(i, j); }
          return false;
        }
      }
    }
    /*jslint evil: false*/
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

  filterErrors: function(errors, algorithm) {
    var _filterReports = Utils.filterReports;
    switch (algorithm) {
      case "none":
      case "relevance":
        return [errors, 0];
      case "best_match":
        var index = errors.length;
        var best_match = null;
        var best_score = -1;
        var weak = ["anyOf", "oneOf"];
        var allow_weak = true;

        while (index--) {
          var error = errors[index];
          var score, result;

          if (weak.indexOf(error.validator) >= 0) {
            if (allow_weak) {
              result = _filterReports(error.context, algorithm);
              score = result[1];
              if (best_match === null || best_score < score) {
                best_score = score;
                best_match = [];
                error.context = result[0];
                best_match = best_match.concat(error);
              } else if (best_score === score) {
                error.context = result[0];
                best_match = best_match.concat(error);
              }
            }
          } else {
            if (allow_weak) {
              allow_weak = false;
              best_score = -1;
              best_match = null;
            }
            score = error.relative_schema_path.split("/").length;
            if (best_match === null || best_score > score) {
              best_score = score;
              best_match = [];
              best_match.push(error);
            } else if (best_score === score) {
              best_match.push(error);
            }
          }
        }

        if (allow_weak && best_match !== null) {
          best_score *= -1;
        }

        return [best_match, best_score];
    }
  },

  filterReports: function (reports, algorithm) {
    var _filterErrors = Utils.filterErrors;

    switch (algorithm) {
      case "none":
      case "relevance":
        return [reports, 0];
      case "best_match":
        var index = reports.length;
        var best_match = null;
        var best_score = -1;
        var best_error_score = -1;
        var best_reports = null;
        var best_report_score = -1;
        var report, result, score;

        // Find the reports with the highest passed validations
        while (index--) {
          report = reports[index];
          score = report.passed;
          if (best_reports === null || score > best_report_score) {
            best_report_score = score;
            best_reports = [];
            best_reports.push(report);
          } else if ( score === best_report_score ) {
            best_reports.push(report);
          }
        }

        // Find the report with the least errors
        index = best_reports.length;
        while (index--) {
          report = best_reports[index];
          if (report.valid) continue;
          result = _filterErrors(report.errors, algorithm);
          score = report.errors.length;
          report.errors = result[0];
          if (best_match === null || best_score > score)  {
            best_score = score;
            best_match = [];
            best_match.push(report);
            if (best_error_score > result[1]) {
              best_error_score = result[1];
            }
          } else if (best_score === score) {
            best_match.push(report);
            if (best_error_score > result[1]) {
              best_error_score = result[1];
            }
          }
        }

        if (best_match === null) {
          return [reports, 0];
        } else {
          return [best_match, best_error_score];
        }
        break;
    }
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
        // http://emailregex.com/
        return /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i.test(email);
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
            new RegExp(str);
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
        return typeof uri !== "string" || new RegExp(
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

  pre_transform: {

  }

};

var buildError = function (error_code, schema, schema_path, relative_schema_path, validator, validator_value, params, options, build_context) {
  var code = [
    "report.errors.push({",
      "code: '"+ error_code +"',",
      "path: path,",
      "instance: data,",
      "validator: '"+ validator +"'"
  ];

  if (options.errors.messages) {
    if (options.errors.schema) {
      code.push(
        ", message: "+ ERROR_MESSAGES[error_code].replace(/\{([^\}]+)\}/g, function(match, index) { return params[index]; })
      );
    } else {
      code.push(
        ", message: "+ ERROR_MESSAGES[error_code].replace(/_schema\.([a-zA-Z0-9_]+)/g, function(match, index) { return Utils.stringify(schema[index]); })
      );
    }
  }

  if (validator_value !== null && options.errors.validator_value) {
    code.push(
      ", validator_value: " + Utils.stringify(validator_value)
    );
  }

  if (schema.description !== undefined) {
    code.push(
      ", description: '"+ schema.description + "'"
    );
  }

  if (options.errors.schema) {
    code.push(
      ", schema: _schema "
    );
  }

  code.push(
    ", relative_schema_path: '"+ relative_schema_path + "'",
    ", absolute_schema_path: '"+ schema_path + ((validator_value === null) ? "" : relative_schema_path) + "'"
  );

  if (build_context) {
    code.push(
      ", context: context"
    );
  }

  code.push(
    "});"
  );

  return code.join("");
};

var ValidationGenerators = {
  "type": function (schema, schema_path, schema_id, options) {
    var code = [""], conditions;

    if (Utils.typeOf(schema.type) === "array" && schema.type.length > 0) {
      if ( schema.type.length === 1 ) {
        code.push("if (type !== '" + schema.type[0] +"') {");
      } else {
        conditions = [
          "type !== '"+ schema.type[0] +"'"
        ];

        if (schema.type[0] === "number") {
          conditions.push("type !== 'integer'");
        }

        for (var index = 1; index < schema.type.length; index++) {
          if (schema.type[index] === "number") {
            conditions.push("type !== '"+ schema.type[index] +"' && type !== 'integer'");
          } else {
            conditions.push("type !== '"+ schema.type[index] +"'");
          }
        }

        code.push("if ("+ conditions.join(" && ") +") {");
      }
    } else {
      if (schema.type === "number") {
        code.push("if (type !== '" + schema.type +"' && type !== 'integer') {");
      } else {
        code.push("if (type !== '" + schema.type +"') {");
      }
    }

    code.push(
      "report.valid = false;",
      buildError("INVALID_TYPE", schema, schema_path, "/type", "type", schema.type, [schema.type, "type"], options),
      "} else { validations_passed++; }"
    );
    return code;
  },
  // Numeric Validations
  // http://json-schema.org/latest/json-schema-validation.html#rfc.section.5.1.1.2
  multipleOf: function (schema, schema_path, schema_id, options) {
    var code = [
      "if (!(_typeOf(data / "+ schema.multipleOf+") === 'integer')) {",
        "report.valid = false;",
        buildError("MULTIPLE_OF", schema, schema_path, "/multipleOf", "multipleOf", schema.multipleOf, {}, options),
      "} else { validations_passed++; }"
    ];
    return code;
  },
  minimum: function (schema, schema_path, schema_id, options) {
    var code = [];

    if (schema.exclusiveMinimum !== true) {
      code.push(
        "if (data < "+ schema.minimum +") {",
          "report.valid = false;",
          buildError("MINIMUM", schema, schema_path, "/minimum", "minimum", schema.minimum, {}, options),
        "} else { validations_passed++; }"
      );
    } else {
      code.push(
        "if (data <= "+ schema.minimum +") {",
          "report.valid = false;",
          buildError("MINIMUM_EXCLUSIVE", schema, schema_path, "/exclusiveMinimum", "exclusiveMinimum", schema.exclusiveMinimum, {}, options),
        "} else { validations_passed++; }"
      );
    }

    return code;
  },
  exclusiveMinimum: function (schema, schema_path, schema_id, options) {
    // covered in minimum
    var code = [];
    return code;
  },
  maximum: function (schema, schema_path, schema_id, options) {
    var code = [];

    if (schema.exclusiveMaximum !== true) {
      code.push(
        "if (data > "+ schema.maximum +") {",
          "report.valid = false;",
          buildError("MAXIMUM", schema, schema_path, "/maximum", "maximum", schema.maximum, {}, options),
        "} else { validations_passed++; }"
      );
    } else {
      code.push(
        "if (data >= "+ schema.maximum +") {",
          "report.valid = false;",
          buildError("MAXIMUM_EXCLUSIVE", schema, schema_path, "/exclusiveMaximum", "exclusiveMaximum", schema.exclusiveMaximum, {}, options),
        "} else { validations_passed++; }"
      );
    }

    return code;
  },
  exclusiveMaximum: function (schema, schema_path, schema_id, options) {
    // covered in maximum
    var code = [];
    return code;
  },
  // String Validations
  minLength: function (schema, schema_path, schema_id, options) {
    var code = [];

    code.push(
      "if ((_length = _unicodeLength(data)) < "+ schema.minLength +") {",
        "report.valid = false;",
        buildError("MIN_LENGTH", schema, schema_path, "/minLength", "minLength", schema.minLength, {}, options),
      "} else { validations_passed++; }"
    );

    return code;
  },
  maxLength: function (schema, schema_path, schema_id, options) {
    var code = [];

    // We've already calculate _length so don't recalculate
    if (schema.minLength !== undefined) {
      code.push("if (_length > "+ schema.maxLength +") {");
    } else {
      code.push("if ((_length = _unicodeLength(data)) > "+ schema.maxLength +") {");
    }

    code.push(
        "report.valid = false;",
        buildError("MAX_LENGTH", schema, schema_path, "/maxLength", "maxLength", schema.maxLength, {}, options),
      "} else { validations_passed++; }"
    );

    return code;
  },
  pattern: function (schema, schema_path, schema_id, options) {
    var code = [];

    code.push(
      "if (!/"+ Utils.escapeRegexp(schema.pattern) +"/.test(data)) {",
        "report.valid = false;",
        buildError("PATTERN", schema, schema_path, "/pattern", "pattern", schema.pattern, {}, options),
      "} else { validations_passed++; }"
    );

    return code;
  },
  format: function (schema, schema_path, schema_id, options) {
    var code = [];

    code.push(
      "if (!_format['"+ schema.format +"'](data)) {",
        "report.valid = false;",
        buildError("INVALID_FORMAT", schema, schema_path, "/format", "format", schema.format, [schema.format], options),
      "} else { validations_passed++; }"
    );

    return code;
  },
  // Array Validations
  additionalItems: function (schema, schema_path, schema_id, options) {
    var code = [];

    if (schema.additionalItems === false && Utils.typeOf(schema.items) === "array") {
      code.push(
        "if (_length > "+ schema.items.length +") {",
          "report.valid = false;",
          buildError("ARRAY_ADDITIONAL_ITEMS", schema, schema_path, "/additionalItems", "additionalItems", schema.additionalItems, {}, options),
        "} else { validations_passed++; }"
      );
    }

    return code;
  },
  items: function (schema, schema_path, schema_id, options) {
    // covered in additionalItems
    var code = [];
    return code;
  },
  maxItems: function (schema, schema_path, schema_id, options) {
    var code = [];

    code.push(
      "if (_length > "+ schema.maxItems +") {",
        "report.valid = false;",
        buildError("ARRAY_LENGTH_LONG", schema, schema_path, "/maxItems", "maxItems", schema.maxItems, {}, options),
      "} else { validations_passed++; }"
    );

    return code;
  },
  minItems: function (schema, schema_path, schema_id, options) {
    var code = [];

    code.push(
      "if (_length < "+ schema.minItems +") {",
        "report.valid = false;",
        buildError("ARRAY_LENGTH_SHORT", schema, schema_path, "/minItems", "minItems", schema.minItems, {}, options),
      "} else { validations_passed++; }"
    );

    return code;
  },
  uniqueItems: function (schema, schema_path, schema_id, options) {
    var code = [];

    if (schema.uniqueItems === true) {

      code.push(
        "var matches = [];",
        "if (_isUniqueArray(data, matches) === false) {",
          "report.valid = false;",
          buildError("ARRAY_UNIQUE", schema, schema_path, "/uniqueItems", "uniqueItems", schema.uniqueItems, {}, options),
        "} else { validations_passed++; }"
      );

    }

    return code;
  },
  // Object Validations

  required: function (schema, schema_path, schema_id, options) {
    var code = [];
    return code;
  },
  additionalProperties: function (schema, schema_path, schema_id, options) {
    var code = [];

    // Handled in properties validation
    if (schema.properties === undefined && schema.patternProperties === undefined ) {
      code = code.concat(ValidationGenerators.properties(schema, schema_path, schema_id, options));
    }

    return code;
  },
  patternProperties: function (schema, schema_path, schema_id, options) {
    var code = [];

    // Handled in properties validation
    if (schema.properties === undefined) {
      code = code.concat(ValidationGenerators.properties(schema, schema_path, schema_id, options));
    }

    return code;
  },
  properties: function (schema, schema_path, schema_id, options) {
    var code = [];
    return code;
  },
  minProperties: function (schema, schema_path, schema_id, options) {
    var code = [];
    return code;
  },
  maxProperties: function (schema, schema_path, schema_id, options) {
    var code = [];
    return code;
  },

  dependencies: function (schema, schema_path, schema_id, options) {
    var code = [];
    return code;
  },

  // Any type validations
  default:  function (schema, schema_path, schema_id, options) {
    var code = [];
    return code;
  },
  enum: function (schema, schema_path, schema_id, options) {
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
      if (["number", "integer", "boolean", "null"].indexOf(Utils.typeOf(val)) >= 0) {
        flag = true;
        code.push(
          "case "+val+":"
        );
      } else if (Utils.typeOf(val) === "string") {
        flag = true;
        code.push(
          "case '"+ Utils.escapeString(val) +"':"
        );

      } else {
        default_case.push(
          "if (_areEqual(data, "+ Utils.stringify(val)+")) { match = true; }"
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
        buildError("ENUM_MISMATCH", schema, schema_path, "/enum", "enum", schema.enum, [Utils.escapeString(Utils.stringify(schema.enum))], options),
      "} else { validations_passed++; }"
    );

    return code;
  },
  allOf: function (schema, schema_path, schema_id, options) {
    var code = [];
    var index;

    code.push(
      "var failed = false, context = [], context_validations_passed = 0;"
    );

    for (index = 0; index < schema.allOf.length; index++) {
      code.push(
        "result = validators['"+ schema_path +"/allOf/"+ index +"'](data,"+ ((options.errors.schema) ? " _schema.allOf["+ index +"],": " null,") +" parent, root, path, Utils);"
      );

      if (options.enable_defaults) {
        code.push("if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }");
      }

      code.push(
        "if (!result.valid) {",
          "report.valid = false;",
          "context.push(result);",
        "} else { context_validations_passed += result.passed; }"
      );
    }

    code.push(
      "if (!report.valid) {",
        buildError("ALL_OF_FAILED", schema, schema_path, "/allOf", "allOf", schema.allOf, [], options, true),
      "} else { validations_passed += context_validations_passed; }"
    );

    return code;
  },
  anyOf: function (schema, schema_path, schema_id, options) {
    var code = [];
    var index;

    code.push(
      "var passed = false, context = [], context_validations_passed = 0;"
    );

    for (index = 0; index < schema.anyOf.length; index++) {
      if (index === 0) {
        code.push(
          "result = validators['"+ schema_path +"/anyOf/"+ index +"'](data,"+ ((options.errors.schema) ? " _schema.anyOf["+ index +"],": " null,") +" parent, root, path, Utils);"
        );

        if (options.enable_defaults) {
          code.push("if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }");
        }

        code.push(
          "if (result.valid) {",
            "passed = true;",
            "context_validations_passed = result.passed;",
          "} else {",
            "context.push(result);",
          "}"
        );
      } else {
        code.push(
          "if (!passed) {",
            "result = validators['"+ schema_path + "/anyOf/"+ index +"'](data,"+ ((options.errors.schema) ? " _schema.anyOf["+ index +"],": " null,") +" parent, root, path, Utils);"
        );
        if (options.enable_defaults) {
          code.push("if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }");
        }
        code.push(
            "if (result.valid) {",
              "passed = true;",
              "context_validations_passed = result.passed;",
            "} else {",
              "context.push(result);",
            "}",
          "}"
        );
      }
    }

    code.push(
      "if (!passed) {",
        "report.valid = false;",
        buildError("ANY_OF_MISSING", schema, schema_path, "/anyOf", "anyOf", schema.anyOf, {}, options, true),
      "} else { validations_passed += context_validations_passed; }"
    );

    return code;
  },
  oneOf: function (schema, schema_path, schema_id, options) {
    var code = [];
    var index;
    code.push(
      "var pass_count = 0, pass_context = [], fail_context = [], context, context_validations_passed = 0; "
    );

    for (index = 0; index < schema.oneOf.length; index++) {

      code.push(
        "result = validators['"+ schema_path +"/oneOf/"+ index +"'](data,"+ ((options.errors.schema) ? " _schema.oneOf["+ index +"],": " null,") +" parent, root, path, Utils);"
      );

      if (options.enable_defaults) {
        code.push("if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }");
      }
      code.push(
        "if (result.valid) {",
          "pass_count++;",
          "pass_context.push({",
            "valid: true,",
            "schema: "+ Utils.stringify(schema.oneOf[index]) +",",
          "});",
          "context_validations_passed = result.passed;",
        "} else {",
          "fail_context.push(result);",
        "}"
      );
    }

    code.push(
      "if (pass_count === 0) {",
        "report.valid = false;",
        "context = fail_context;",
        buildError("ONE_OF_MISSING", schema, schema_path, "/oneOf", "oneOf", schema.oneOf, {}, options, true),
      "} else if (pass_count > 1) {",
        "report.valid = false;",
        "context = pass_context;",
        buildError("ONE_OF_MULTIPLE", schema, schema_path, "/oneOf", "oneOf", schema.oneOf, {}, options, true),
      "} else { validations_passed += context_validations_passed; }"
    );

    return code;
  },
  not: function (schema, schema_path, schema_id, options) {
    var code = [];

    code.push(
      "result = validators['"+ schema_path +"/not'](data,"+ ((options.errors.schema) ? " _schema.not,": " null,") +" parent, root, path, Utils);"
    );

    if (options.enable_defaults) {
      code.push("if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }");
    }

    code.push(
      "if (result.valid) {",
        "report.valid = false;",
        buildError("NOT_PASSED", schema.not, schema_path, "/not", "not", schema.not, {}, options),
      "} else { validations_passed += result.passed; }"
    );
    return code;
  },
  definitions: function (schema, schema_path, schema_id, options) {}

};

var generateArrayValidator = function (code, schema, schema_path, schema_id, options) {
  // TODO: Optimize using loop unrolling
  var key;
  if (Array.isArray(schema.items)) {
    var index, defaults = [], defaults_present = false, pre_validation_transformers = ["switch (_length) {"];
    defaults.length = schema.items.length;

    for (index = 0; index < schema.items.length; index++) {
      if (schema.items[index].default !== undefined) {
        defaults_present = true;
        defaults[index] = schema.items[index].default;
      }
      for (key in Utils.pre_transform) {
        if (schema.items[index][key] !== undefined) {
          pre_validation_transformers.push(
            "case " + index + ":",
              "data["+ index +"] = Utils.pre_transform['"+ key +"'](data[" + index + "], " + Utils.stringify(schema.items[index][key]) + ");",
              "break;"
          );
        }
      }
    }

    if (defaults_present) {
      code.push(
        "var defaults = "+ Utils.stringify(defaults) +";"
      );
    }

    code.push(
      "while (_length--) {",
        "if (_length < "+ schema.items.length +") {"
    );

    // Apply default values
    if (defaults_present && options.enable_defaults) {
      code.push(
        "if (data[_length] === undefined) {",
          "data[_length] = defaults[_length];",
          "rollbacks.push((function(array, index) { return function() { array[index] = undefined; } })(data, _length));",
        "}"
      );
    }

    // insert pre validation transformers
    if (pre_validation_transformers.length > 1) {
      pre_validation_transformers.push("}");
      Array.prototype.push.apply(code, pre_validation_transformers);
    }

    code.push(
          "result = validators['"+ schema_path + "/items/' + _length" +"](data[_length],"+ ((options.errors.schema) ? " _schema.items[_length],": " null,") +" data, root, path + '/' + _length, Utils);"
    );
    if (options.enable_defaults) {
      code.push(
          "if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }"
      );
    }
    code.push(
          // TODO: insert post validation transformers
          "if (!result.valid) {",
            "report.valid = false;",
            "report.errors = report.errors.concat(result.errors);",
          "} else { validations_passed += result.passed; }"
    );

    if (Utils.typeOf(schema.additionalItems) === "object") {

      code.push(
        "} else {"
      );

      if ("default" in schema.additionalItems && options.enable_defaults) {
        code.push(
          "if (data[_length] === undefined) {",
            "data[_length] = "+ Utils.stringify(schema.additionalItems.default) +";",
            "rollbacks.push((function(array, index) { return function() { array[index] = undefined; } })(data, _length));",
          "}"
        );
      }

      // insert pre validation transformers
      for (key in Utils.pre_transform) {
        if (schema.additionalItems[key] !== undefined) {
          code.push(
            "data[_length] = Utils.pre_transform['"+ key +"'](data[_length], " + Utils.stringify(schema.additionalItems[key]) + ")"
          );
        }
      }

      code.push(
          "result = validators['"+ schema_path + "/additionalItems'](data[_length],"+ ((options.errors.schema) ? " _schema.additionalItems,": " null,") +" data, root, path + '/' + _length, Utils);"
      );
      if (options.enable_defaults) {
        code.push("if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }");
      }
      code.push(
          // TODO: insert post validation transformers
          "if (!result.valid) {",
            "report.valid = false;",
            "report.errors = report.errors.concat(result.errors);",
          "} else { validations_passed += result.passed; }",
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
      //"if (_length > 0) { report.subReport = []; }",
      "while (_length--) {"
    );

    if ("default" in schema.items && options.enable_defaults) {
      code.push(
        "if (data[_length] === undefined) {",
          "data[_length] = "+ Utils.stringify(schema.items.default) +";",
          "rollbacks.push((function(array, index) { return function() { array[index] = undefined; } })(data, _length));",
        "}"
      );
    }

    // insert pre validation transformers
    for (key in Utils.pre_transform) {
      if (schema.items[key] !== undefined) {
        code.push(
          "data[_length] = Utils.pre_transform['"+ key +"'](data[_length], " + Utils.stringify(schema.items[key]) + ");"
        );
      }
    }

    code.push(
        "result = validators['"+ schema_path +"/items'](data[_length],"+ ((options.errors.schema) ? " _schema.items,": " null,") +" data, root, path + '/' + _length, Utils);"
    );
    if (options.enable_defaults) {
      code.push(
        "if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }"
      );
    }
    code.push(
        // TODO: insert post validation transformers
        "if (!result.valid) {",
          "report.valid = false;",
          "report.errors = report.errors.concat(result.errors);",
        "} else { validations_passed += result.passed; }",
      "}"
    );
  }
};

var generateObjectValidator = function (code, schema, schema_path, schema_id, options) {
  if (Utils.typeOf(schema.properties) === "object" || Utils.typeOf(schema.patternProperties) === "object" || Utils.typeOf(schema.additionalProperties === "object")) {
    var additionalProperties = schema.additionalProperties;
    var index, index2, key, tkey, required_keys = [], defaults = {}, required_values, conditions;
    var properties = [];
    var patternProperties = [];

    if (Utils.typeOf(schema.required) === "array") {
      for (index = 0; index < schema.required.length; index++) {
        required_keys.push(schema.required[index]);
      }
    }

    if (Utils.typeOf(schema.properties) === "object") {
      for (key in schema.properties) {
        properties.push(key);
        if (schema.properties[key].default !== undefined && options.enable_defaults) {
          defaults[key] = schema.properties[key].default;
          required_keys.push(key);
        }
      }
    }

    if (Utils.typeOf(schema.patternProperties) === "object") {
      for (key in schema.patternProperties) {
        patternProperties.push(key);
        if (schema.patternProperties[key].default !== undefined && options.enable_defaults) {
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
      "var _matches = {}, _additionalKeys = [];"
    );

    if (options.enable_defaults) {
      code.push("var defaults = "+ Utils.stringify(defaults) +";");
    }

    if (required_keys.length > 0) {
      code.push("var required_keys = "+ Utils.stringify(required_keys) +", _rindex = "+ (required_keys.length) +" ;");
    }

    // Iterate through keys once
    code.push(
      "for (var key in data) {",
        "_length++;"
    );

    // Check if any properties or dependencies have been defined
    if (properties.length > 0 || (Utils.typeOf(schema.dependencies) === "object" && Object.keys(schema.dependencies).length > 0 )) {
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
          "case '"+ Utils.escapeString(key) +"':"
        );

        // insert pre validation transformers
        for (tkey in Utils.pre_transform) {
          if (schema.properties[key][tkey] !== undefined) {
            code.push("data['"+ Utils.escapeString(key) +"'] = Utils.pre_transform['" + tkey + "'](data['"+ Utils.escapeString(key) +"'], "+ Utils.stringify(schema.properties[key][tkey]) +");");
          }
        }

        code.push(
            "result = validators['"+ schema_path +"/properties/"+ Utils.escapeString(key) +"'](data['"+ Utils.escapeString(key) +"'],"+ ((options.errors.schema) ? " _schema.properties[\"" + Utils.escapeString(key) + "\"],": " null,") +" data, root, path + '/"+ Utils.escapeString(Utils.encodeJSONPointer(key)) +"', Utils);"
        );

        if (options.enable_defaults) {
          code.push(
            "if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }"
          );
        }

        code.push(
            // TODO: insert post validation transformers
            "_matches['"+ Utils.escapeString(key) +"'] = true;"
        );

        if (Utils.typeOf(schema.required) === "array" && schema.required.length > 0 && (rpos = schema.required.indexOf(key)) >= 0) {
          code.push(
            "required_keys["+ rpos +"] = null;"
          );
        }

        code.push (
            "if (!result.valid) {",
              "report.valid = false;",
              "report.errors = report.errors.concat(result.errors);",
            "} else { validations_passed += result.passed; }"
        );

        // Validate against dependant schema if present
        if (Utils.typeOf(schema.dependencies) === "object" && key in schema.dependencies) {
          if (Utils.typeOf(schema.dependencies[key]) === "object") {
            code.push(
              // TODO: insert pre validation transformers
              "result = validators['"+ schema_path +"/dependencies/"+ Utils.escapeString(key) +"'](data,"+ ((options.errors.schema) ? " _schema.dependencies[\""+ Utils.escapeString(key) +"\"],": " null,") +" parent, root, path, Utils);"
            );
            if (options.enable_defaults) {
              code.push(
                "if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }"
              );
            }
            code.push(
              // TODO: insert post validation transformers
              "if (!result.valid) {",
                "report.valid = false;",
                "report.errors = report.errors.concat(result.errors);",
              "} else { validations_passed += result.passed; }"
            );
          } else {
            // Ensure all keys are present
            conditions = [];
            required_values = schema.dependencies[key];
            for (index2 = 0; index2 < required_values.length; index2++) {
              conditions.push("'"+ Utils.escapeString(required_values[index2]) +"' in data");
            }
            code.push(
              "if (!("+ conditions.join(" && ") +")) {",
                "report.valid = false;",
                buildError("OBJECT_DEPENDENCY_KEY", schema, schema_path, "/dependencies" , "dependencies", schema.dependencies, {}, options),
              "}"
            );
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
          if (Utils.typeOf(schema.dependencies[key]) === "object") {
            code.push(
              // TODO: insert pre validation transformers
              "result = validators['"+ schema_path +"/dependencies/"+ Utils.escapeString(key) +"'](data,"+ ((options.errors.schema) ? " _schema.dependencies[\""+ Utils.escapeString(key) +"\"],": " null,") +" parent, root, path, Utils);"
            );
            if (options.enable_defaults) {
              code.push(
                "if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }"
              );
            }
            code.push(
              // TODO: insert post validation transformers
              "if (!result.valid) {",
                "report.valid = false;",
                "report.errors = report.errors.concat(result.errors);",
              "} else { validations_passed += result.passed; }"
            );
          } else {
            // Ensure all keys are present
            conditions = [];
            required_values = schema.dependencies[key];
            for (index2 = 0; index2 < required_values.length; index2++) {
              conditions.push("'"+ Utils.escapeString(required_values[index2]) +"' in data");
            }
            code.push(
              "if (!("+ conditions.join(" && ") +")) {",
                "report.valid = false;",
                buildError("OBJECT_DEPENDENCY_KEY", schema, schema_path, "/dependencies", "dependencies", schema.dependencies, {}, options),
              "} else { validations_passed++; }"
            );
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
          "if (/"+ Utils.escapeRegexp(patternProperties[index]) +"/.test(key)) {"
        );

        // insert pre validation transformers
        for (tkey in Utils.pre_transform) {
          if (schema.patternProperties[patternProperties[index]][tkey] !== undefined) {
            code.push("data[key] = Utils.pre_transform['" + tkey + "'](data[key], "+ Utils.stringify(schema.patternProperties[patternProperties[index]][tkey]) +");");
          }
        }

        code.push(
            "result = validators['"+ schema_path +"/patternProperties/"+ Utils.escapeRegexp(patternProperties[index]) +"'](data[key],"+ ((options.errors.schema) ? " _schema.patternProperties[\""+ Utils.escapeRegexp(patternProperties[index]) +"\"] ,": " null,") +" data, root, path + '/' + _encodeJSONPointer(key), Utils);"
        );

        if (options.enable_defaults) {
          code.push(
            "if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }"
          );
        }

        code.push(
            // TODO: insert post validation transformers
            "_matches[key] = true;",
            "if (!result.valid) {",
              "report.valid = false;",
              "report.errors = report.errors.concat(result.errors);",
            "} else { validations_passed += result.passed; }",
          "}"
        );
      }
    }

    // If additional properties is a schema check against it
    if (Utils.typeOf(schema.additionalProperties) === "object") {

      code.push(
        "if (!_matches[key]) {"
      );

      // insert pre validation transformers
      for (tkey in Utils.pre_transform) {
        if (schema.additionalProperties[tkey] !== undefined) {
          code.push("data[key] = Utils.pre_transform['" + tkey + "'](data[key], "+ Utils.stringify(schema.additionalProperties[tkey]) +");");
        }
      }

      code.push(
          "result = validators['"+schema_path+"/additionalProperties'](data[key],"+ ((options.errors.schema) ? " _schema.additionalProperties,": " null,") +" data, root, path + '/' + _encodeJSONPointer(key), Utils);"
      );
      if (options.enable_defaults) {
        code.push(
          "if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }"
        );
      }
      code.push(
          // TODO: insert post validation transformers
          "if (!result.valid) {",
            "report.valid = false;",
            "report.errors = report.errors.concat(result.errors);",
          "} else { validations_passed += result.passed; }",
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
      if (options.enable_defaults) {
        code.push(
          "for (;_rindex--;) {",
            "var val = required_keys[_rindex];",
            // Apply default values
            "if (_rindex >= "+ (Utils.typeOf(schema.required) === "array" ? schema.required.length : 0 ) +" && !(val in _matches)) {",
              "_matches[val] = true;",
              "data[val] = defaults[val];",
              // Validate default value
              "result = validators['"+ schema_path +"/properties/' + val](data[val],"+ ((options.errors.schema) ? " _schema.properties[val],": " null,") +" data, root, path + '/' + _encodeJSONPointer(val), Utils);",
              "if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }",
              "if (!result.valid) {",
                "report.valid = false;",
                "report.errors = report.errors.concat(result.errors);",
              "} else { validations_passed += result.passed; }",
              // Store rollback function
              "rollbacks.push((function (data, key) {",
                "return function() {",
                  "delete data[key];",
                "}",
              "})(data, val));",
            "} else {",
              "if (val !== null && !(val in _matches)) {",
                "report.valid = false;",
                buildError("OBJECT_MISSING_REQUIRED_PROPERTY", schema, schema_path, "/required", "required", schema.required, {}, options),
              "} else { validations_passed++; }",
            "}",
          "}"
        );
      } else {
        code.push(
          "for (;_rindex--;) {",
            "var val = required_keys[_rindex];",
            "if (val !== null && !(val in _matches)) {",
              "report.valid = false;",
              buildError("OBJECT_MISSING_REQUIRED_PROPERTY", schema, schema_path, "/required", "required", schema.required, {}, options),
            "} else { validations_passed++; }",
          "}"
        );
      }

    }

    // Check if any additional properties were found
    if (additionalProperties === false) {
      code.push(
        "if (_additionalKeys.length > 0) {",
          "report.valid = false;",
          buildError("OBJECT_ADDITIONAL_PROPERTIES", schema, schema_path, "/additionalProperties", "additionalProperties", schema.additionalProperties, {}, options),
        "} else { validations_passed++; }"
      );
    }

    // Check if minProperties and maxProperties were satisfied
    if (Utils.typeOf(schema.minProperties) === "integer") {
      code.push(
        "if (_length < "+ schema.minProperties +") {",
          "report.valid = false;",
          buildError("OBJECT_PROPERTIES_MINIMUM", schema, schema_path, "/minProperties", "minProperties", schema.minProperties, {}, options),
        "} else { validations_passed++; }"
      );
    }

    if (Utils.typeOf(schema.maxProperties) === "integer") {
      code.push(
        "if (_length > "+ schema.maxProperties +") {",
          "report.valid = false;",
          buildError("OBJECT_PROPERTIES_MAXIMUM", schema, schema_path, "/maxProperties", "maxProperties", schema.maxProperties, {}, options),
        "} else { validations_passed++; }"
      );
    }
  }
};

var generateSchema = function (schema, schema_path, schema_id, cache, options) {
  // Trim the trailing #
  var validator_path;
  if (schema_path.slice(-1) === "#") {
    validator_path = schema_path.slice(0, -1);
  } else {
    validator_path = schema_path;
  }
  var key, value, index, block_type, keyword_rank, keywords = [], blocks = {
    any: { start: null, end: null },
    number: { start: null, end: null },
    string: { start: null, end: null },
    array: { start: null, end: null },
    object: { start: null, end: null }
  }, code = [
    "validators['"+ validator_path +"'] = function (data, _schema, parent, root, path, Utils) {",
      "var result, validations_passed = 0;",
      "var _areEqual = Utils.areEqual, _stringify = Utils.stringify;",
      "var _typeOf = Utils.typeOf;",
      "var _unicodeLength = Utils.unicodeLength, _encodeJSONPointer = Utils.encodeJSONPointer;",
      "var _isUniqueArray = Utils.isUniqueArray;",
      "var _format = Utils.format;",
      "var _type = typeof data, type = _typeOf(data, _type);",
      "var _length = 0;"
  ];

  if (options.enable_defaults) {
    code.push("var _rollback = Utils.rollback, report = { valid: true, errors: [], rollback: _rollback, passed: 0 }, rollbacks = [];");
  } else {
    code.push("var report = { valid: true, errors: [], passed: 0 };");
  }

  for (key in schema) {
    // Calculate start and end validation for each type of block
    if (KEYWORD_META[key] === undefined) {
      // We assume the keyword is a json schema defined to be referenced by a json pointer
      if (cache[schema_path + "/" + key] === undefined) {
        cache[schema_path + "/" + key] = (function (key, schema, schema_path) {
          return function() {
            var schema_code = generateSchema(schema[key], schema_path + "/" + key, schema_id, cache, options);
            code = Array.prototype.splice.apply(code, [10, 0].concat(schema_code));
            cache[schema_path + "/" + key] = true;
          };
        })(key, schema, schema_path);
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

  for (index = 0; index < keywords.length; index++) {
    var generator, keyword = keywords[index];

    if ((generator = ValidationGenerators[keyword])) {
      var keyword_type = KEYWORD_META[keyword][1];

      // Open type check block
      if (blocks[keyword_type].start === KEYWORD_META[keyword][0]) {
        blocks[keyword_type].start = null;
        switch (keyword_type) {
          case "string":
          case "number":
            code.push("if (_type === '"+ keyword_type +"') {");
            break;
          case "array":
            code.push(
              "if (type === 'array') {",
                "_length = data.length;"
            );
            break;
          case "object":
            code.push(
              "if (type === 'object') {",
                "var _keys = [];"
            );
            break;
        }
      }

      code = code.concat(generator(schema, schema_path, schema_id, options));

      // Close type check block
      if (blocks[keyword_type].end === KEYWORD_META[keyword][0]) {
        blocks[keyword_type].end = null;
        switch (keyword_type) {
          case "string":
          case "number":
            code.push("}");
            break;
          case "array":
            generateArrayValidator(code, schema, schema_path, schema_id, options);
            code.push("}");
            break;
          case "object":
            generateObjectValidator(code, schema, schema_path, schema_id, options);
            code.push("}");
            break;
        }
      }
    }

  }

  if (Utils.typeOf(schema.$ref) === "string") {
    if (schema.$ref === "#" || schema.$ref.indexOf("#/") === 0) {
      if (code.length === 10) {
        code = [
          "validators['"+ validator_path +"'] = function (data, _schema, parent, root, path, Utils) {",
            "return validators['"+ schema_id + Utils.decodeJSONPointer(schema.$ref) +"'](data, _schema, parent, root, path, Utils);",
          "}"
        ];
      } else {
        code.push(
            "result = validators['"+ schema_id + Utils.decodeJSONPointer(schema.$ref) +"'](data, _schema, parent, root, path, Utils);",
            "if (!result.valid) report.valid = false;",
            "report.errors = report.errors.concat(result.errors);"
        );
        if (options.enable_defaults) {
          code.push(
            "if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }"
          );
        }
      }
      if (typeof cache[schema_id + Utils.decodeJSONPointer(schema.$ref)] === "function") {
        cache[schema_id + Utils.decodeJSONPointer(schema.$ref)]();
      }
    } else {
      if (code.length === 10) {
        code = [
          "validators['"+ validator_path +"'] = function (data, _schema, parent, root, path, Utils) {",
            "return validators['"+ Utils.decodeJSONPointer(schema.$ref) +"'](data, _schema, parent, root, path, Utils);",
          "}"
        ];
      } else {
        code.push(
            "result = validators['"+ Utils.decodeJSONPointer(schema.$ref) +"'](data, _schema, parent, root, path, Utils);",
            "if (!result.valid) report.valid = false;",
            "report.errors = report.errors.concat(result.errors);"
        );
        if (options.enable_defaults) {
            code.push(
            "if (result.rollback !== _rollback) { rollbacks.push(result.rollback); }"
            );
        }
      }
      if (typeof cache[Utils.decodeJSONPointer(schema.$ref)] === "function") {
        cache[Utils.decodeJSONPointer(schema.$ref)]();
      }
    }
  }

  if (code.length > 3) {
    if (options.enable_defaults) {
      code.push(
          "var rb_index = rollbacks.length;",
          "if (!report.valid && rb_index > 0) {",
            "while (rb_index--) {",
              "rollbacks[rb_index]();",
            "}",
          "} else if (rb_index > 0) {",
            "report.rollback = function () {",
              "while (rb_index--) {",
                "rollbacks[rb_index]();",
              "}",
            "}",
          "}",
          "report.passed = validations_passed;",
          "return report;",
        "};"
      );
    } else {
      code.push(
          "report.passed = validations_passed;",
          "return report;",
        "};"
      );
    }
  }


  if (code.length === 12) {
    code = [
      "validators['"+ validator_path +"'] = _stub;"
    ];
  }

  // Add id references
  if (Utils.typeOf(schema.id) === "string") {
    code.push(
      "validators['" + schema.id + "'] = validators['"+ validator_path +"']"
    );
  }

  // Generate validators for arrays
  if (Array.isArray(schema.items)) {
    for (index = 0; index < schema.items.length; index++) {
      code = code.concat(generateSchema(schema.items[index], schema_path + "/items/" + index, schema_id, cache, options));
    }
    if (Utils.typeOf(schema.additionalItems) === "object") {
      code = code.concat(generateSchema(schema.additionalItems, schema_path + "/additionalItems", schema_id, cache, options));
    }
  } else if (typeof schema.items === "object") {
    code = code.concat(generateSchema(schema.items, schema_path + "/items", schema_id, cache, options));
  }
  // Generate validators for objects
  if (Utils.typeOf(schema.properties) == "object") {
    for (key in schema.properties) {
      value = schema.properties[key];
      code = code.concat(generateSchema(value, schema_path + "/properties/" + key, schema_id, cache, options));
    }
  }
  if (Utils.typeOf(schema.patternProperties) == "object") {
    for (key in schema.patternProperties) {
      value = schema.patternProperties[key];
      code = code.concat(generateSchema(value, schema_path + "/patternProperties/" + key, schema_id, cache, options));
    }
  }
  if (Utils.typeOf(schema.additionalProperties) == "object") {
    code = code.concat(generateSchema(schema.additionalProperties, schema_path + "/additionalProperties", schema_id, cache, options));
  }
  if (Utils.typeOf(schema.dependencies) === "object") {
    for (key in schema.dependencies) {
      value = schema.dependencies[key];
      if (Utils.typeOf(value) === "object") {
        code = code.concat(generateSchema(value, schema_path + "/dependencies/" + key, schema_id, cache, options));
      }
    }
  }
  if (Utils.typeOf(schema.allOf) === "array" && schema.allOf.length > 0) {
    for (index in schema.allOf) {
      value = schema.allOf[index];
      code = code.concat(generateSchema(value, schema_path + "/allOf/" + index, schema_id, cache, options));
    }
  }
  if (Utils.typeOf(schema.anyOf) === "array" && schema.anyOf.length > 0) {
    for (index in schema.anyOf) {
      value = schema.anyOf[index];
      code = code.concat(generateSchema(value, schema_path + "/anyOf/" + index, schema_id, cache, options));
    }
  }
  if (Utils.typeOf(schema.oneOf) === "array" && schema.oneOf.length > 0) {
    for (index in schema.oneOf) {
      value = schema.oneOf[index];
      code = code.concat(generateSchema(value, schema_path + "/oneOf/" + index, schema_id, cache, options));
    }
  }
  if (Utils.typeOf(schema.not) === "object") {
    code = code.concat(generateSchema(schema.not, schema_path + "/not", schema_id, cache, options));
  }

  if (Utils.typeOf(schema.definitions) === "object") {
    for (index in schema.definitions) {
      value = schema.definitions[index];
      if (!cache[schema_path + "/definitions/" + index]) {
        code = code.concat(generateSchema(value, schema_path + "/definitions/" + index, schema_id, cache, options));
        cache[schema_path + "/definitions/" + index] = true;
      }
    }
  }

  return code;
};

var schema_validator = null, $schema = null;

var buildValidator = function (schemas, options) {
  var body, index, validator, schema, SCHEMA_ID, code, ast, stream, compressed_ast, compressor;

  Utils.defaults(options.errors, {
    schema: true,
    validator_value: true,
    messages: true
  });

  body = [
    "var validators = {};"
  ];

  if (options.enable_defaults) {
    body.push(
    "var _stub = function (data, _schema, parent, root, path, Utils) { return { valid: true, errors: [], rollback: Utils.rollback, passed: 0 }; }"
    );
  } else {
    body.push(
    "var _stub = function (data, _schema, parent, root, path, Utils) { return { valid: true, errors: [], passed: 0 }; }"
    );
  }

  // Generate validators for each schema provided
  for (index = 0; index < schemas.length; index++) {
    schema = schemas[index];
    SCHEMA_ID = (schema.id !== undefined) ? schema.id : index;
    body = body.concat(generateSchema(schema, SCHEMA_ID + "#", SCHEMA_ID, {}, options));
  }

  if (options.file) {
    body.push(
      "module.exports = {",
        "schemas: " + Utils.stringify(schemas) + ",",
        "validator: function(data, schema_id, _schema, Utils) {",
          "return validators[schema_id](data, _schema, null, data, '', Utils);",
        "}",
      "}"
    );
    body = body.join("\n");
  } else {
    body.push(
      // Validation Function
      "return function (data, schema_id, _schema, Utils) {",
        "return validators[schema_id](data, _schema, null, data, '', Utils);",
      "}"
    );
    body = "generate = function () {" + body.join("\n") + "}";
  }

  if (options.beautify) {
    // Generate readable code
    ast = UglifyJS.parse(body);
    ast.figure_out_scope();
    stream = UglifyJS.OutputStream({ beautify: true });
    ast.print(stream);
    code = stream.toString();
  } else {
    // Generate compressed code
    ast = UglifyJS.parse(body);
    ast.figure_out_scope();
    compressor = UglifyJS.Compressor({ warnings: false });
    compressed_ast = ast.transform(compressor);
    compressed_ast.figure_out_scope();
    compressed_ast.compute_char_frequency();
    compressed_ast.mangle_names();
    stream = UglifyJS.OutputStream({ beautify: true });
    compressed_ast.print(stream);
    code = stream.toString();
  }
  return code;
};

var buildSchemas = function (schema_data, options) {
  var schema, schemas, schema_id, key, _key, index, _schemas = {}, buffer = [];
  // Create a deep clone of schemas
  eval("schemas = "+ Utils.stringify(schema_data) +";");
  // Index all schemas
  for (index = 0; index < schemas.length;  index++) {
    schema = schemas[index];
    if (schema.id !== undefined) {
      schema_id = schema.id;
      _schemas[schema_id] = schema;
      buffer[index] = [schema, schema_id];
    } else {
      schema_id = index;
      _schemas[schema_id] = schema;
      if (index < schema_data.length) {
        buffer[index] = [schema, schema_id];
      }
    }
    for (key in schema) {
      switch (key) {
        case "not":
        case "additionalItems":
        case "additionalProperties":
          if (Utils.typeOf(schema[key].$ref) !== "string") {
            schemas.push(schema[key]);
          }
          break;
        case "items":
        case "oneOf":
        case "allOf":
        case "anyOf":
          if (Utils.typeOf(schema[key]) === "array") {
            for (_key in schema[key]) {
              if (Utils.typeOf(schema[key][_key].$ref) !== "string") {
                schemas.push(schema[key][_key]);
              }
            }
          } else if (Utils.typeOf(schema[key]) === "object") {
            if (Utils.typeOf(schema[key].$ref) !== "string") {
              schemas.push(schema[key]);
            }
          }
          break;
        case "definitions":
        case "properties":
        case "patternProperties":
          for (_key in schema[key]) {
            if (Utils.typeOf(schema[key][_key].$ref) !== "string") {
              schemas.push(schema[key][_key]);
            }
          }
          break;
      }
    }
  }

  // Build refs
  index = buffer.length;
  while (buffer.length > 0) {
    schema_data = buffer.shift();
    schema = schema_data[0];
    schema_id = schema_data[1];
    for (key in schema) {
      switch (key) {
        case "not":
        case "additionalItems":
        case "additionalProperties":
          if (Utils.typeOf(schema[key].$ref) === "string") {
            schema[key] = Utils.dereferencePath(schema[key].$ref, schema_id, _schemas);
          } else {
            buffer.push([schema[key], schema_id]);
          }
          break;
        case "items":
        case "oneOf":
        case "allOf":
        case "anyOf":
          if (Utils.typeOf(schema[key]) === "array") {
            for (_key in schema[key]) {
              if (Utils.typeOf(schema[key][_key].$ref) === "string") {
                schema[key][_key] = Utils.dereferencePath(schema[key][_key].$ref, schema_id, _schemas);
              } else {
                buffer.push([schema[key][_key], schema_id]);
              }
            }
          } else if (Utils.typeOf(schema[key]) === "object") {
            if (Utils.typeOf(schema[key].$ref) === "string") {
              schema[key] = Utils.dereferencePath(schema[key].$ref, schema_id, _schemas);
            } else {
              buffer.push([schema[key], schema_id]);
            }
          }
          break;
        case "definitions":
        case "properties":
        case "patternProperties":
          for (_key in schema[key]) {
            if (Utils.typeOf(schema[key][_key].$ref) === "string") {
              schema[key][_key] = Utils.dereferencePath(schema[key][_key].$ref, schema_id, _schemas);
            } else {
              buffer.push([schema[key][_key], schema_id]);
            }
          }
          break;
      }
    }
  }
  return _schemas;
};

module.exports = {

  registerFormat: function (format, validation_func) {
    if (Utils.format[format] === undefined) {
      Utils.format[format] = validation_func;
    } else {
      throw new Error("The format '"+ format +"' has already been registered");
    }
  },

  registerValidator: function (keyword, meta, validation_func) {
    var rank;
    if (meta.order[0] == "after") {
      rank = KEYWORD_META[meta.order[1]][0] + 1;
    } else if (meta.order[0] == "before") {
      rank = KEYWORD_META[meta.order[1]][0] - 1;
    }
    KEYWORD_META[keyword] = [rank, meta.type];
    ValidationGenerators[keyword] = validation_func;
  },

  registerTransformer: function (keyword, order, transform_func) {
    if (order === "pre") {
      if (Utils.pre_transform[keyword] === undefined) {
        Utils.pre_transform[keyword] = transform_func;
      } else {
        throw new Error("The transformer 'keyword' has already been registered");
      }
    }
  },

  writeToFile: function(schemas, options, filename) {
    options = (options === undefined ? {} : options);
    options.file = true;

    Utils.defaults(options, {
      beautify: false,
      enable_defaults: false,
      validate_schemas: false,
      force_additional: true,
      force_items: false,
      force_max_length: false,
      force_properties: false,
      no_extra_keywords: false,
      no_typeless: false,
      no_empty_strings: false,
      no_empty_arrays: false,
      simple_ids: true,
      errors: {}
    });

    if (Utils.typeOf(schemas) === "object") {
      schemas = [schemas];
    }

    // Validate Schemas
    if (options.validate_schemas) {

      if (schema_validator === null) {
        $schema = require("./draftv4/schema.json");

        if (options.simple_ids) {
          delete $schema.allOf[0].properties.id.format;
        }

        if (options.force_additional) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                required: ["additionalProperties"],
                properties: {
                  type: {
                    enum: ["object"]
                  },
                }
              },
              {
                type: "object",
                required: ["additionalItems"],
                properties: {
                  type: {
                    enum: ["array"]
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["boolean", "integer", "null", "number", "string"]
                  }
                }
              }
            ]
          });
        }

        if (options.force_items) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                required: ["items"],
                properties: {
                  type: {
                    enum: ["array"]
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["object", "boolean", "integer", "null", "number", "string"]
                  }
                }
              }
            ]
          });
        }

        if (options.force_max_length) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                required: ["maxLength"],
                properties: {
                  type: {
                    enum: ["string"]
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["array", "object", "boolean", "integer", "null", "number"]
                  }
                }
              }
            ]
          });
        }

        if (options.force_properties) {
          $schema.allOf.push({
            anyOf: [
              {
                type: "object",
                required: ["properties"],
                properties: {
                  type: {
                    enum: ["object"]
                  }
                }
              },
              {
                type: "object",
                required: ["patternProperties"],
                properties: {
                  type: {
                    enum: ["object"]
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["array", "boolean", "integer", "null", "number", "string"]
                  }
                }
              }
            ]
          });
        }

        if (options.no_extra_keywords) {
          $schema.allOf[0].additionalProperties = false;
        }

        if (options.no_typeless) {
          $schema.allOf.push({
            type: "object",
            required: ["type"]
          });
        }

        if (options.no_empty_strings) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["string"]
                  },
                  minLength: {
                    default: 1
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["array", "object", "boolean", "integer", "null", "number"]
                  }
                }
              }
            ]
          });
        }

        if (options.no_empty_arrays) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["array"]
                  },
                  minItems: {
                    default: 1
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["string", "object", "boolean", "integer", "null", "number"]
                  }
                }
              }
            ]
          });
        }

        if (options.assume_additional !== undefined) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["object"]
                  },
                  additionalProperties: {
                    default: options.assume_additional
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["array", "string", "boolean", "integer", "null", "number"]
                  }
                }
              }
            ]
          });
        }
        schema_validator = this.validator($schema, { enable_defaults: true, validate_schemas: false, errors: { messages: false, schema: false, validator_value: true } });
      }

      for (var index = 0; index < schemas.length; index++) {
        var report = schema_validator(schemas[index], "http://json-schema.org/draft-04/schema#", { algorithm: "best_match" });
        report.schema_id = schemas[index].id;
        if (!report.valid) {
          return report;
        }
      }
    }

    var generate;
    var code = buildValidator(schemas, options);

    fs.writeFileSync(filename, code);
  },

  loadFromFile: function(filename) {
    var data = require(filename);
    var _schemas = buildSchemas(data.schemas);
    var validator = data.validator;
    return function (data, schema_id, options) {
      if (!schema_id) throw Error("Please specify a schema");
      options = (options === undefined) ? {} : options;
      options.algorithm = (options.algorithm === undefined) ? "none": options.algorithm;
      var _schema = _schemas[schema_id];
      var report = validator(data, schema_id, _schema, Utils);
      delete report.rollback;
      if (!report.valid) {
        if(options.algorithm !== "none") { report = Utils.filterReports([report], options.algorithm)[0][0]; }
        report.data = data;
      }
      return report;
    };
  },

  validator: function (schemas, options) {
    options = (options === undefined ? {} : options);

    Utils.defaults(options, {
      file: false,
      beautify: true,
      enable_defaults: false,
      validate_schemas: false,
      force_additional: true,
      force_items: false,
      force_max_length: false,
      force_properties: false,
      no_extra_keywords: false,
      no_typeless: false,
      no_empty_strings: false,
      no_empty_arrays: false,
      simple_ids: true,
      errors: {}
    });

    if (Utils.typeOf(schemas) === "object") {
      schemas = [schemas];
    }

    // Validate Schemas
    if (options.validate_schemas) {

      if (schema_validator === null) {
        $schema = require("./draftv4/schema.json");

        if (options.simple_ids) {
          delete $schema.allOf[0].properties.id.format;
        }

        if (options.force_additional) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                required: ["additionalProperties"],
                properties: {
                  type: {
                    enum: ["object"]
                  },
                }
              },
              {
                type: "object",
                required: ["additionalItems"],
                properties: {
                  type: {
                    enum: ["array"]
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["boolean", "integer", "null", "number", "string"]
                  }
                }
              }
            ]
          });
        }

        if (options.force_items) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                required: ["items"],
                properties: {
                  type: {
                    enum: ["array"]
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["object", "boolean", "integer", "null", "number", "string"]
                  }
                }
              }
            ]
          });
        }

        if (options.force_max_length) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                required: ["maxLength"],
                properties: {
                  type: {
                    enum: ["string"]
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["array", "object", "boolean", "integer", "null", "number"]
                  }
                }
              }
            ]
          });
        }

        if (options.force_properties) {
          $schema.allOf.push({
            anyOf: [
              {
                type: "object",
                required: ["properties"],
                properties: {
                  type: {
                    enum: ["object"]
                  }
                }
              },
              {
                type: "object",
                required: ["patternProperties"],
                properties: {
                  type: {
                    enum: ["object"]
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["array", "boolean", "integer", "null", "number", "string"]
                  }
                }
              }
            ]
          });
        }

        if (options.no_extra_keywords) {
          $schema.allOf[0].additionalProperties = false;
        }

        if (options.no_typeless) {
          $schema.allOf.push({
            type: "object",
            required: ["type"]
          });
        }

        if (options.no_empty_strings) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["string"]
                  },
                  minLength: {
                    default: 1
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["array", "object", "boolean", "integer", "null", "number"]
                  }
                }
              }
            ]
          });
        }

        if (options.no_empty_arrays) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["array"]
                  },
                  minItems: {
                    default: 1
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["string", "object", "boolean", "integer", "null", "number"]
                  }
                }
              }
            ]
          });
        }

        if (options.assume_additional !== undefined) {
          $schema.allOf.push({
            oneOf: [
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["object"]
                  },
                  additionalProperties: {
                    default: options.assume_additional
                  }
                }
              },
              {
                type: "object",
                properties: {
                  type: {
                    enum: ["array", "string", "boolean", "integer", "null", "number"]
                  }
                }
              }
            ]
          });
        }
        schema_validator = this.validator($schema, { enable_defaults: true, validate_schemas: false, errors: { messages: false, schema: false, validator_value: true } });
      }

      for (var index = 0; index < schemas.length; index++) {
        var report = schema_validator(schemas[index], "http://json-schema.org/draft-04/schema#", { algorithm: "best_match" });
        report.schema_id = schemas[index].id;
        if (!report.valid) {
          return report;
        }
      }
    }

    var generate;
    var _schemas = buildSchemas(schemas, options);
    var code = buildValidator(schemas, options);
    eval(code);
    var validator = generate();

    if (options.enable_defaults) {
      return function (data, schema_id, options) {
        if (!schema_id) throw Error("Please specify a schema");
        options = (options === undefined) ? {} : options;
        options.algorithm = (options.algorithm === undefined) ? "none": options.algorithm;
        var _schema = _schemas[schema_id];
        var report = validator(data, schema_id, _schema, Utils);
        delete report.rollback;
        if (!report.valid) {
          if(options.algorithm !== "none") { report = Utils.filterReports([report], options.algorithm)[0][0]; }
          report.data = data;
        }
        return report;
      };
    } else {
      return function (data, schema_id, options) {
        if (!schema_id) throw Error("Please specify a schema");
        options = (options === undefined) ? {} : options;
        options.algorithm = (options.algorithm === undefined) ? "none": options.algorithm;
        var _schema = _schemas[schema_id];
        var report = validator(data, schema_id, _schema, Utils);
        if (!report.valid) {
          if(options.algorithm !== "none") { report = Utils.filterReports([report], options.algorithm)[0][0]; }
          report.data = data;
        }
        return report;
      };
    }
  }
};

"use strict";

var Tester = require("./tester");

var ZSchema = require("z-schema");
var JaySchema = require("jayschema");
var jjv = require("jjv");
var JsonSchema = require("jsonschema");
var tv4 = require("tv4");
var JsonModel = require('json-model');
var Themis = require('../src/themis');

Tester.registerValidator({
    name: "z-schema",
    setup: function () {
        return new ZSchema({
            ignoreUnresolvableReferences: true
        });
    },
    test: function (instance, json, schema) {
        return instance.validate(json, schema);
    }
});

Tester.registerValidator({
    name: "jayschema",
    setup: function () {
        return new JaySchema();
    },
    test: function (instance, json, schema) {
        return instance.validate(json, schema).length === 0;
    }
});

Tester.registerValidator({
    name: "jjv",
    setup: function () {
        return jjv();
    },
    test: function (instance, json, schema) {
        return instance.validate(schema, json) === null;
    }
});

Tester.registerValidator({
    name: "jsonschema",
    setup: function () {
        return new JsonSchema.Validator();
    },
    test: function (instance, json, schema) {
        return instance.validate(json, schema).errors.length === 0;
    }
});

Tester.registerValidator({
    name: "tv4",
    setup: function () {
        return tv4;
    },
    test: function (instance, json, schema) {
        return instance.validateResult(json, schema).valid === true;
    }
});


Tester.registerValidator({
    name: "json-model",
    setup: function (schema) {
        return JsonModel.validator(schema);
    },
    test: function (instance, json, schema) {
        // If we're repeatedly testing the same schema, use the existing validator
        return instance(json).valid === true;
    }
});

Tester.registerValidator({
    name: "themis",
    setup: function (schema) {
        return Themis.validator(schema);
    },
    test: function (instance, json, schema) {
        //console.log("RES", JSON.stringify(instance(json), 2, 2), JSON.stringify(json,2,2));
        //console.log(instance.toString());
        return instance(json, '0').valid === true;
    }
});


var basicObject = require("./basic_object.json");
var basicSchema = require("./basic_schema_v4.json");
Tester.runOne("basicObject", basicObject, basicSchema, true);
var advancedObject = require("./advanced_object.json");
var advancedSchema = require("./advanced_schema_v4.json");
Tester.runOne("advancedObject", advancedObject, advancedSchema, true);
Tester.runDirectory(__dirname + "/../test/jsonSchemaTestSuite/tests/draft4/", {
    excludeFiles: [],
    excludeTests: [
        "valid definition, valid definition schema",
        "invalid definition, invalid definition schema",
        "remote ref, containing refs itself, remote ref valid",
        "remote ref, containing refs itself, remote ref invalid",
        "remote ref, remote ref valid",
        "remote ref, remote ref invalid",
        "fragment within remote ref, remote fragment valid",
        "fragment within remote ref, remote fragment invalid",
        "ref within remote ref, ref within ref valid",
        "ref within remote ref, ref within ref invalid",
        "change resolution scope, changed scope ref valid",
        "change resolution scope, changed scope ref invalid"
    ]
});

Tester.saveResults("results.html", "results.template");


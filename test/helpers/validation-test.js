'use strict';

const chai = require('chai');
const Joi = require('@hapi/joi');

const Schema = require('../../lib/schema');
const gstoreErrors = require('../../lib/errors');
const { validation } = require('../../lib/helpers');

const ds = require('../mocks/datastore')({
    namespace: 'com.mydomain',
});

const { expect, assert } = chai;
const { errorCodes } = gstoreErrors;

const customValidationFunction = (obj, validator, min, max) => {
    if ('embeddedEntity' in obj) {
        const { value } = obj.embeddedEntity;
        return validator.isNumeric(value.toString()) && (value >= min) && (value <= max);
    }

    return false;
};

/**
 * These are the new Types for the Schemas
 * To be backward compatible, the old types ('int', 'string') are still supported.
 * Once they will be deprecated we can delete the Validation (old Types) below.
 */
describe('Validation', () => {
    let schema;

    const validate = entityData => (
        validation.validate(entityData, schema, 'MyEntityKind', ds)
    );

    beforeEach(() => {
        schema = new Schema({
            name: { type: String },
            lastname: { type: String },
            age: { type: Number },
            birthday: { type: Date },
            street: {},
            website: { validate: 'isURL' },
            email: { validate: 'isEmail' },
            ip: { validate: { rule: 'isIP', args: [4] } },
            ip2: { validate: { rule: 'isIP' } }, // no args passed
            modified: { type: Boolean },
            tags: { type: Array },
            prefs: { type: Object },
            price: { type: Schema.Types.Double },
            icon: { type: Buffer },
            location: { type: Schema.Types.GeoPoint },
            color: { validate: 'isHexColor' },
            type: { values: ['image', 'video'] },
            customFieldWithEmbeddedEntity: {
                type: Object,
                validate: {
                    rule: customValidationFunction,
                    args: [4, 10],
                },
            },
            company: { type: Schema.Types.Key },
            address: { type: Schema.Types.Key, ref: 'Address' },
        });

        schema.virtual('fullname').get(() => { });
    });

    it('should return an object with an "error" and "value" properties', () => {
        const entityData = { name: 'John' };

        const { error, value } = validate(entityData);

        assert.isDefined(error);
        expect(value).equal(entityData);
    });

    it('should return a Promise and resolve with the entityData', () => {
        const entityData = { name: 'John' };

        return validate(entityData).then(value => {
            expect(value).equal(entityData);
            return Promise.resolve('test');
        })
            .catch(() => { })
            .then(response => {
                expect(response).equal('test');
            });
    });

    it('should return a Promise and reject with the error', () => {
        const entityData = { name: 123 };

        return validate(entityData).then(() => {
        }, error => {
            expect(error.name).equal('ValidationError');
            expect(error.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        });
    });

    it('should return a Promise catch with the error', () => {
        const entityData = { name: 123 };

        return validate(entityData).catch(error => {
            expect(error.name).equal('ValidationError');
            expect(error.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
            return Promise.resolve('test');
        }).then(response => {
            // Just to make sure we can chain Promises
            expect(response).equal('test');
        });
    });

    it('properties passed ok', () => {
        const { error } = validate({ name: 'John', lastname: 'Snow' });

        expect(error).equal(null);
    });

    it('properties passed ko', () => {
        const { error } = validate({ unknown: 123 });

        expect(error.errors[0].code).equal(gstoreErrors.errorCodes.ERR_PROP_NOT_ALLOWED);
    });

    it('should remove virtuals before validating', () => {
        const { error } = validate({ fullname: 'John Snow' });

        expect(error).equal(null);
    });

    it('accept unkwown properties when "explicityOnly" set to false', () => {
        schema = new Schema({ name: { type: 'string' } }, { explicitOnly: false });

        const { error } = validate({ unknown: 123 });

        expect(error).equal(null);
    });

    it('required property', () => {
        schema = new Schema({
            name: { type: 'string' },
            email: { type: 'string', required: true },
        });

        const { error } = validate({ name: 'John Snow', email: '' });
        const { error: error2 } = validate({ name: 'John Snow', email: '   ' });
        const { error: error3 } = validate({ name: 'John Snow', email: null });

        expect(error.errors[0].code).equal(gstoreErrors.errorCodes.ERR_PROP_REQUIRED);
        expect(error2.errors[0].code).equal(gstoreErrors.errorCodes.ERR_PROP_REQUIRED);
        expect(error3.errors[0].code).equal(gstoreErrors.errorCodes.ERR_PROP_REQUIRED);
    });

    it('don\'t validate empty value', () => {
        const { error } = validate({ email: undefined });
        const { error: error2 } = validate({ email: null });
        const { error: error3 } = validate({ email: '' });

        expect(error).equal(null);
        expect(error2).equal(null);
        expect(error3).equal(null);
    });

    it('no type validation', () => {
        const { error } = validate({ street: 123 });
        const { error: error2 } = validate({ street: '123' });
        const { error: error3 } = validate({ street: true });

        expect(error).equal(null);
        expect(error2).equal(null);
        expect(error3).equal(null);
    });

    it('--> Datstore Key ok', () => {
        const company = ds.key(['EntityKind', 123]);
        const { error } = validate({ company });

        expect(error).equal(null);
    });

    it('--> Datstore Key ko', () => {
        const { error } = validate({ company: 123 });

        expect(error.errors[0].code).equal(gstoreErrors.errorCodes.ERR_PROP_TYPE);
        expect(error.errors[0].ref).equal('key.base');
    });

    it('--> Datstore Key ko', () => {
        const address = ds.key(['WrongReference', 123]);
        const { error } = validate({ address });

        expect(error.errors[0].code).equal(gstoreErrors.errorCodes.ERR_PROP_TYPE);
        expect(error.errors[0].ref).equal('key.entityKind');
    });

    it('--> string', () => {
        const { error } = validate({ name: 123 });

        expect(error).not.equal(null);
        expect(error.errors[0].code).equal(gstoreErrors.errorCodes.ERR_PROP_TYPE);
    });

    it('--> number', () => {
        const { error } = validate({ age: 'string' });

        expect(error.errors[0].code).equal(gstoreErrors.errorCodes.ERR_PROP_TYPE);
    });

    it('--> int', () => {
        const { error } = validate({ age: ds.int('7') });
        const { error: error2 } = validate({ age: ds.int(7) });
        const { error: error3 } = validate({ age: 7 });
        const { error: error4 } = validate({ age: ds.int('string') });
        const { error: error5 } = validate({ age: 'string' });
        const { error: error6 } = validate({ age: '7' });

        expect(error).equal(null);
        expect(error2).equal(null);
        expect(error3).equal(null);
        expect(error4.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error5.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error6.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
    });

    it('--> double', () => {
        const { error } = validate({ price: ds.double('1.2') });
        const { error: error2 } = validate({ price: ds.double(7.0) });
        const { error: error3 } = validate({ price: 7 });
        const { error: error4 } = validate({ price: 7.59 });
        const { error: error5 } = validate({ price: ds.double('str') });
        const { error: error6 } = validate({ price: 'string' });
        const { error: error7 } = validate({ price: '7' });

        expect(error).equal(null);
        expect(error2).equal(null);
        expect(error3).equal(null);
        expect(error4).equal(null);
        expect(error5.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error6.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error7.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
    });

    it('--> buffer', () => {
        const { error } = validate({ icon: Buffer.from('\uD83C\uDF69') });
        const { error: error2 } = validate({ icon: 'string' });

        expect(error).equal(null);
        expect(error2.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
    });

    it('--> boolean', () => {
        const { error } = validate({ modified: true });
        const { error: error2 } = validate({ modified: 'string' });

        expect(error).equal(null);
        expect(error2.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
    });

    it('--> object', () => {
        const { error } = validate({ prefs: { check: true } });
        const { error: error2 } = validate({ prefs: 'string' });
        const { error: error3 } = validate({ prefs: [123] });

        expect(error).equal(null);
        expect(error2.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error3.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
    });

    it('--> geoPoint', () => {
        // datastore geoPoint
        const { error } = validate({
            location: ds.geoPoint({
                latitude: 40.6894,
                longitude: -74.0447,
            }),
        });

        // valid geo object
        const { error: error2 } = validate({
            location: {
                latitude: 40.68942342541,
                longitude: -74.044743654572,
            },
        });

        const { error: error3 } = validate({ location: 'string' });
        const { error: error4 } = validate({ location: true });
        const { error: error5 } = validate({ location: { longitude: 999, latitude: 'abc' } });
        const { error: error6 } = validate({ location: { longitude: 40.6895 } });
        const { error: error7 } = validate({ location: { longitude: '120.123', latitude: '40.12345678' } });

        expect(error).equal(null);
        expect(error2).equal(null);
        expect(error3.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error4.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error5.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error6.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error7.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
    });

    it('--> array ok', () => {
        const { error } = validate({ tags: [] });

        expect(error).equal(null);
    });

    it('--> array ko', () => {
        const { error } = validate({ tags: {} });
        const { error: error2 } = validate({ tags: 'string' });
        const { error: error3 } = validate({ tags: 123 });

        expect(error.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error2.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error3.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
    });

    it('--> date ok', () => {
        const { error } = validate({ birthday: '2015-01-01' });
        const { error: error2 } = validate({ birthday: new Date() });

        expect(error).equal(null);
        expect(error2).equal(null);
    });

    it('--> date ko', () => {
        const { error } = validate({ birthday: '01-2015-01' });
        const { error: error2 } = validate({ birthday: '01-01-2015' });
        const { error: error3 } = validate({ birthday: '2015/01/01' });
        const { error: error4 } = validate({ birthday: '01/01/2015' });
        const { error: error5 } = validate({ birthday: 12345 }); // No number allowed
        const { error: error6 } = validate({ birthday: 'string' });

        expect(error.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error2.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error3.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error4.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error5.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
        expect(error6.errors[0].code).equal(errorCodes.ERR_PROP_TYPE);
    });

    it('--> isURL ok', () => {
        const { error } = validate({ website: 'http://google.com' });
        const { error: error2 } = validate({ website: 'google.com' });

        expect(error).equal(null);
        expect(error2).equal(null);
    });

    it('--> isURL ko', () => {
        const { error } = validate({ website: 'domain.k' });
        const { error: error2 } = validate({ website: 123 });

        expect(error.errors[0].code).equal(errorCodes.ERR_PROP_VALUE);
        expect(error2.errors[0].code).equal(errorCodes.ERR_PROP_VALUE);
    });

    it('--> isEmail ok', () => {
        const { error } = validate({ email: 'john@snow.com' });

        expect(error).equal(null);
    });

    it('--> isEmail ko', () => {
        const { error } = validate({ email: 'john@snow' });
        const { error: error2 } = validate({ email: 'john@snow.' });
        const { error: error3 } = validate({ email: 'john@snow.k' });
        const { error: error4 } = validate({ email: 'johnsnow.com' });

        expect(error.errors[0].code).equal(errorCodes.ERR_PROP_VALUE);
        expect(error2.errors[0].code).equal(errorCodes.ERR_PROP_VALUE);
        expect(error3.errors[0].code).equal(errorCodes.ERR_PROP_VALUE);
        expect(error4.errors[0].code).equal(errorCodes.ERR_PROP_VALUE);
    });

    it('--> is IP ok', () => {
        const { error } = validate({ ip: '127.0.0.1' });
        const { error: error2 } = validate({ ip2: '127.0.0.1' });

        expect(error).equal(null);
        expect(error2).equal(null);
    });

    it('--> is IP ko', () => {
        const { error } = validate({ ip: 'fe80::1c2e:f014:10d8:50f5' });
        const { error: error2 } = validate({ ip: '1.1.1' });

        expect(error.errors[0].code).equal(errorCodes.ERR_PROP_VALUE);
        expect(error2.errors[0].code).equal(errorCodes.ERR_PROP_VALUE);
    });

    it('--> is HexColor', () => {
        const { error } = validate({ color: '#fff' });
        const { error: error2 } = validate({ color: 'white' });

        expect(error).equal(null);
        expect(error2.errors[0].code).equal(errorCodes.ERR_PROP_VALUE);
    });

    it('--> is customFieldWithEmbeddedEntity ok', () => {
        const { error } = validate({
            customFieldWithEmbeddedEntity: {
                embeddedEntity: {
                    value: 6,
                },
            },
        });

        expect(error).equal(null);
    });

    it('--> is customFieldWithEmbeddedEntity ko', () => {
        const { error } = validate({
            customFieldWithEmbeddedEntity: {
                embeddedEntity: {
                    value: 2,
                },
            },
        });

        expect(error.errors[0].code).equal(errorCodes.ERR_PROP_VALUE);
    });

    it('--> is custom function (array containing objectsj)', () => {
        const validateFn = obj => {
            if (!Array.isArray(obj)) {
                return false;
            }

            return obj.every(item => (
                item !== null && typeof item === 'object'
            ));
        };

        schema = new Schema({
            arrOfObjs: {
                type: 'array',
                validate: {
                    rule: validateFn,
                },
            },
        });

        const error1 = validate({ arrOfObjs: [{ name: 'foo' }, { name: 'bar' }] }).error;
        const error2 = validate({ arrOfObjs: 'string' }).error;
        const error3 = validate({ arrOfObjs: ['string'] }).error;
        const error4 = validate({ arrOfObjs: [{ name: 'foo' }, 'string'] }).error;

        expect(error1).equal(null);
        expect(error2.code).equal(gstoreErrors.errorCodes.ERR_VALIDATION);
        expect(error3.code).equal(gstoreErrors.errorCodes.ERR_VALIDATION);
        expect(error4.code).equal(gstoreErrors.errorCodes.ERR_VALIDATION);
    });

    it('--> only accept value in range of values', () => {
        const { error } = validate({ type: 'other' });

        expect(error.errors[0].code).equal(errorCodes.ERR_PROP_IN_RANGE);
    });
});

describe('Joi Validation', () => {
    let schema;

    const validate = entityData => validation.validate(entityData, schema, 'MyEntityKind');

    beforeEach(() => {
        schema = new Schema({
            name: { joi: Joi.string().required() },
            color: { joi: Joi.valid('a', 'b') },
            birthyear: { joi: Joi.number().integer().min(1900).max(2013) },
            email: { joi: Joi.string().email() },
        }, {
            joi: { options: { stripUnknown: false } },
        });
    });

    it('should validate with Joi', () => {
        const { error } = validate({ name: 123 });
        const { error: error2 } = validate({ name: 'John', color: 'c' });
        const { error: error3 } = validate({ name: 'John', birthyear: 1877 });
        const { error: error4 } = validate({ name: 'John', email: 'abc' });
        const { error: error5 } = validate({ name: 'John', unknownProp: 'abc' });

        expect(error).not.equal(null);
        expect(error2.details[0].type).equal('any.allowOnly');
        expect(error3.details[0].type).equal('number.min');
        expect(error4.details[0].type).equal('string.email');
        expect(error5.details[0].type).equal('object.allowUnknown');
    });

    it('should accept extra validation on top of the schema', () => {
        schema = new Schema({
            name: { joi: Joi.string() },
            lastname: { joi: Joi.string() },
        }, {
            joi: {
                extra: {
                    with: ['name', 'lastname'],
                    unknownMethod: 'shouldBeIgnored',
                },
            },
        });

        const { error } = validate({ name: 'John' });

        expect(error.details[0].type).equal('object.with');
    });

    it('should accept an "option" object', () => {
        schema = new Schema({
            name: { joi: Joi.string().required() },
        }, {
            joi: {
                options: {
                    allowUnknown: true,
                },
            },
        });

        const { error } = validate({ name: 'John', unknownProp: 'abc' });

        expect(error).equal(null);
    });

    it('should set "stripUnknown" according to "explicitOnly" setting', () => {
        schema = new Schema({ name: { joi: Joi.string() } }, { explicitOnly: false });
        const schema2 = new Schema({ name: { joi: Joi.string() } });

        const { error, value } = validate({ name: 'John', unknownProp: 'abc' });
        const { error: error2, value: value2 } = validation.validate({ name: 'John', unknownProp: 'abc' }, schema2, '');

        expect(error).equal(null);
        expect(value.unknownProp).equal('abc');
        expect(error2).not.equal(null);
        expect(value2.unknownProp).equal('abc');
    });
});

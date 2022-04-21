'use strict';

const assert = require('assert').strict;
const validator = require('validator');
const personnummer = require('swedish-personal-identity-number-validator');

/**
 * A class with validation methods. This class contains validation methods
 * that are specifically tailored to suit the needs of other classes
 * in the project.
 */
class Validators {

    /**
     * Checks if the personal number for the person is formatted correctly,
     * valid personal number example (YYYYMMDD-XXXX), 13 characters to be specific.
     * The personal number will be also checked if it is valid.
     * @param {any} value The value to be validated.
     * @param {String} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
    static isPersonalNumberFormat(value, varName) {
        const result = this.isPersonalNumber(value);
        assert(
            result,
            `${varName} should be formatted correctly, example (YYYYMMDD-XXXX).`,
        );
    }

    /**
     * Checks if the personal number for the person is formatted correctly,
     * valid personal number example (YYYYMMDD-XXXX), 13 characters to be specific.
     * The personal number will be also checked if it is valid.
     * @param {any} value The value to be validated.
     * @return {boolean} indicates whether the personal number is valid or not.
     */
    static isPersonalNumber(value) {
        let result = validator.matches(value.toString(),
            '^[0-9]{8}-[0-9]{4}$');
        if (result === true) {
            result = personnummer.isValid(value.toString());
        }

        return result;
    }

    /**
     * Check if the value is a number that is whole no decimals, and is bigger than zero (positive number).
     * @param {any} value The value to be validated.
     * @param {String} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
    static isPositiveWholeNumber(value, varName) {
        const result = validator.isInt(value.toString(), { min: 1 });
        assert(
            result,
            `${varName} should be a positive whole number.`,
        );
    }

    /**
     * Checks if the Date is formatted correctly, valid date example (YYYY-MM-DD).
     * The date will be also validated if it is actual.
     * @param {any} value The value to be validated.
     * @param {String} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
    static isDateFormat(value, varName) {
        const result = validator.isDate(value.toString(), {
            format: 'YYYY-MM-DD', strictMode: true,
            delimiters: ['-'],
        });
        assert(
            result,
            `${varName} should be formatted correctly, example (YYYY-MM-DD).`,
        );
    }

}

module.exports = Validators;

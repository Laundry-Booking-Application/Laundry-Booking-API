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

    /**
     * Checks if the email is formatted correctly, valid email example (xx.xx@xx.xx.xx).
     * @param {any} value The value to be validated.
     * @param {String} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
     static isEmailFormat(value, varName) {
        const result = validator.isEmail(value.toString());
        assert(
            result,
            `${varName} should be formatted correctly, example (xx.xx@xx.xx.xx).`,
        );
    }

    /**
     * Checks if the specified values only consists of letters no more.
     * @param {any} value The value to be validated.
     * @param {String} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
     static isAlphaString(value, varName) {
        const result = validator.isAlpha(value.toString(), ['sv-SE'], {ignore: '\''});
        assert(
            result,
            `${varName} must consist of letters.`,
        );
    }

    /**
     * Checks that the specified value is an alphanumeric string.
     *
     * @param {any} value The value to be validated.
     * @param {string} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
     static isAlphanumericString(value, varName) {
        const result = validator.isAlphanumeric(value.toString());
        assert(
            result,
            `${varName} must consist of letters and numbers only.`,
        );
    }

    /**
     * Checks that the provided value is an integer that bigger or equal to lowerLimit,
     * and is smaller or equal to upperLimit.
     *
     * @param {any} value The value to be validated.
     * @param {number} lowerLimit The lower allowed limit, inclusive.
     * @param {number} upperLimit The upper allowed limit, inclusive.
     * @param {string} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
     static isIntegerBetween(value, lowerLimit, upperLimit, varName) {
        const result = validator.isInt(value.toString(), {min: lowerLimit, max: upperLimit});

        assert(
            result,
            `${varName} is not an integer between ${lowerLimit} and ${upperLimit}.`,
        );
    }

    /**
     * Check if the value is a non negative number that could be a zero.
     * @param {any} value The value to be validated.
     * @param {String} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
     static isNonNegativeNumber(value, varName) {
        let result = false;

        if (value >= 0) {
            result = true;
        }

        assert(
            result,
            `${varName} should be a non negative number.`,
        );
    }

    /**
     * Check if the password fulfills the minimum and maximum count of characters. (8 min, 32 max)
     * @param {any} value The value to be validated.
     * @param {String} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
     static isPassword(value, varName) {
        const minCount = 8;
        const maxCount = 32;

        let characterCount = value.toString().length;
        let result = false;

        if (characterCount >= minCount && characterCount <= maxCount) {
            result = true;
        }

        assert(
            result,
            `${varName} must be at least ${minCount} characters and a maximum of ${maxCount} characters.`,
        );
    }

    /**
     * Check if pass range follows the right format [XX-XX].
     * @param {any} value The value to be validated.
     * @param {String} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
     static isPassRange(value, varName) {
        let result = validator.matches(value.toString(), '^[0-9]{2}-[0-9]{2}$');

        assert(
            result,
            `${varName} must follow the set format [XX-XX].`,
        );
    }

    /**
     * Check if person details has the necessary information with the right formats.
     * The person details are as the following {firstName, lastName, personalNumber, username}.
     * @param {any} value The value to be validated.
     * @param {String} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
     static isPersonInfo(value, varName) {
        this.isAlphaString(value.firstName.toString(), `${varName} - First name`);
        this.isAlphaString(value.lastName.toString(), `${varName} - Last name`);
        this.isPersonalNumberFormat(value.personalNumber.toString(), `${varName} - Personal Number`);
        this.isAlphanumericString(value.username.toString(), `${varName} - username`);
    }

    /**
     * Check if slot status in one of the status that the pass can have. 
     * The slot status can be found in the slotStatusEnum.js file. They are as the following (Available, Taken and SelfBooking).
     * @param {any} value The value to be validated.
     * @param {String} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
     static isSlotStatus(value, varName) {
        const statusEnum = ['Available', 'Taken', 'SelfBooking'];
        let result = false;

        for (let i = 0; i < statusEnum.length; i++) {
            if (statusEnum[i] === value.toString()) {
                result = true;
                break;
            }
        }

        assert(
            result,
            `${varName} must be one of the following Available, Taken or SelfBooking.`,
        );
    }

    /**
     * Check if pass slot has the necessary information with the right formats.
     * The pass slot details are as the following {range, status, username}.
     * @param {any} value The value to be validated.
     * @param {String} varName The variable name to be included in the assertion error message
     *                         in case that the validation fails.
     * @throws {AssertionError} If validation fails.
     */
     static isPassSlot(value, varName) {
        this.isPassRange(value.range.toString(), `${varName} - Range`);
        this.isSlotStatus(value.status.toString(), `${varName} - Status`);
        this.isAlphanumericString(value.username.toString(), `${varName} - username`);
    }
}

module.exports = Validators;

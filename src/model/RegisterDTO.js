'use strict';

// const Validators = require('../util/Validators');
/**
 * Representing the new user information.
 */
class RegisterDTO {
    /**
   * Create an instance to hold the information about the new user.
   * @param {string} firstName The name of the new user.
   * @param {string} lastName The surname of new user .
   * @param {string} personalNumber The personal number related to the person.
   *                                It should follow the following format YYYYMMDD-XXXX.
   * @param {string} email The email address of the new user .
   * @param {string} username The username that the new user chose for login.
   * @param {string} password The password that the new user chose for login.
   */
    constructor(firstName, lastName, personalNumber, email, username, password) {
        // Validators.isAlphaString(firstName, 'First name');
        // Validators.isAlphaString(lastName, 'Last name');
        // Validators.isPersonalNumberFormat(personalNumber, 'Personal number');
        // Validators.isEmailFormat(email, 'Email');
        // Validators.isAlphanumericString(username, 'Username');
        this.firstName = firstName;
        this.lastName = lastName;
        this.personalNumber = personalNumber;
        this.email = email;
        this.username = username;
        this.password = password;
    }
}

module.exports = RegisterDTO;
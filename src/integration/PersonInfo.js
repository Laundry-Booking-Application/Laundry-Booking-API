'use strict';

/**
 * Holds the information about the registered person.
 */
class PersonInfo {
    /**
     * Create an instance of the information about the registered person.
     * @param {int} accountID The id related to the login info of the person.
     * @param {int} personID The id related to personal info of the person.
     * @param {string} email The email of the person.
     * @param {int} privilegeID The id related to privilege that the person have,
     *                          the privilege can be found in privilegeEnum.js.
     */
    constructor(accountID, personID, email, privilegeID) {
        this.accountID = accountID;
        this.personID = personID;
        this.email = email;
        this.privilegeID = privilegeID;
    }
}

module.exports = PersonInfo;

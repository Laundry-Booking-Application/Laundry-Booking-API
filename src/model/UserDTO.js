'use strict';

// const Validators = require('../util/Validators');

/**
 * Representing logged-in user data transfer object.
 */
class UserDTO {
    /**
     * Create an instance of logged in status for the user.
     * @param {string} username The username of the user.
     * @param {int} privilegeID The privilege that the user have to access stuff,
     *                          which can be found in the privilegeEnum.js. 
     * @param {int} statusCode The code that represent the status of the information,
     *                         which can be found in the userStatusCodes.js. 
     */
    constructor(username, privilegeID, statusCode) {
        // Validators.isAlphanumericString(username, 'username');
        // Validators.isIntegerBetween(roleID, 0, 2, 'privilegeID');
        this.username = username;
        this.privilegeID = privilegeID;
        this.statusCode = statusCode;
    }
}

module.exports = UserDTO;

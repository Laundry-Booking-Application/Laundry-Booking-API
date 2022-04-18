'use strict';

// const Validators = require('../util/Validators');
/**
 * Represent the information about the person.
 */
class UserInfoDTO {
    /**
   * Create an instance to hold the information about the person.
   * @param {[{firstName, lastName, personalNumber, username}]} personInfo 
   * firstName The name of the user.
   * lastName The surname of user .
   * personalNumber The personal number related to the person.
   *  username The username that is related to the person.
   * @param {int} statusCode The code that represent the status of the information,
                              which can be found in the userInfoStatusCodes.js.
   */
    constructor(personInfo, statusCode) {
        this.personInfo = personInfo;
        this.statusCode = statusCode;
    }
}

module.exports = UserInfoDTO;
'use strict';

const {Client, types} = require('pg');
const bcrypt = require('bcrypt');

/**
 * Responsible for the database management.
 * Calls ranging from executing, updating and inserting.
 */
class LaundryDAO {

    constructor() {
		
    }

    async _generatePasswordHash(plainPassword) {
        const saltRounds = parseInt(process.env.SALT_ROUNDS, 10);
        const salt = await bcrypt.genSalt(saltRounds);
        const passwordHash = await bcrypt.hash(plainPassword, salt);
        return passwordHash;
    }

    async _verifyPasswordHash(plainPassword, passwordHash) {
        const result = await bcrypt.compare(plainPassword, passwordHash);
        return result;
    }

  
}

module.exports = LaundryDAO;

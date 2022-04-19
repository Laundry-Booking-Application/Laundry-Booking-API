'use strict';

const {Client, types} = require('pg');
const bcrypt = require('bcrypt');
let dayjs = require('dayjs');
let weekOfYear = require('dayjs/plugin/weekOfYear');
const Logger = require('../util/Logger');
const UserDTO = require('../model/UserDTO');
const RegisterDTO = require('../model/RegisterDTO');
const UserInfoDTO = require('../model/UserInfoDTO');
const privilegeEnum = require('../util/privilegeEnum');
const userStatusCodes = require('../util/userStatusCodes');
const userInfoStatusCodes = require('../util/userInfoStatusCodes');
const PersonInfo = require('./PersonInfo');

/**
 * Responsible for all the operation that has anything with the database management.
 * It will handle all the query executions for retrieving, inserting and updating data from and to the database.
 */
class LaundryDAO {
    /**
     * Create an instance of the database handler class that has the required credentials for database connectivity.
     * It includes other components to disable node-postgres date auto parsing process. 
     */
    constructor() {
        const dateObjectId = 1082;
        const defaultRawParser = (value) => value;
        types.setTypeParser(dateObjectId, defaultRawParser);

        this.client = new Client({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASS,
            port: process.env.DB_PORT,
            connectionTimeoutMillis: 5000,
            statement_timeout: 4000,
            query_timeout: 4000,
            ssl: {rejectUnauthorized: false},
        });

        this.logger = new Logger('LaundryDatabaseHandler');
		
		this.activePassesAllowed = 1;
		this.lockDuration = 5; // Minutes
    }

    /**
     * Get a connection to the database using the set credentials.
     * It includes an event to catch any unexpected errors.
     */
    async establishConnection() {
        try {
            this.client.on('error', (err) => {
                this.client._connecting = true;
                this.client._connected = false;
                this.client._connectionError = true;
                this.logger.logException(err);
            });

            await this.client.connect();
        } catch (err) {
            this.logger.logException(err);
        }
    }

    /**
     * Try to login the user to their account if they exist or have the right info.
     * @param {string} username The username that is used by user to login into their account.
     * @param {string} password The password that is used by user to login into their account.
     * @returns {UserDTO | null} An object that has the info about the login results.
     *                           null indicates that something went wrong and it gets logged.
     */
    async loginUser(username, password) {
        const checkLoginQuery = {
            text: `SELECT    account.username, account.password, person.privilege_id
            FROM        account
            INNER JOIN person ON (person.id = account.person_id)
            WHERE    account.username = $1`,
            values: [username],
        };

        try {
            await this._executeQuery('BEGIN');

            const results = await this._executeQuery(checkLoginQuery);

            let retValue;
            if (results.rowCount <= 0) {
                retValue = new UserDTO(username, privilegeEnum.Invalid, userStatusCodes.LoginFailure);
            } else {
                const passwordVerification = await this._verifyPasswordHash(password, results.rows[0].password);
                
                if(!passwordVerification) {
                    retValue = new UserDTO(username, privilegeEnum.Invalid, userStatusCodes.LoginFailure);
                } else {
                    retValue = new UserDTO(results.rows[0].username, results.rows[0].privilege_id, userStatusCodes.OK);
                }
            }
            
            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }

    /**
     * Register new person into the database with all the required information.
     * @param {string} username The username of the admin to register new account.
     * @param {RegisterDTO} registerDTO Holds all the needed values about the registration information.
     * @returns {UserDTO | null} An object that has the info about the login results.
     *                           null indicates that something went wrong and it gets logged.
     */
    async registerNewResident(username, registerDTO) {
        try {
            const personInfo = await this._getPersonInfo(username);

            if (personInfo === null) {
                return new UserDTO(username, privilegeEnum.Invalid, userStatusCodes.InvalidUser);
            }

            if (personInfo.privilegeID !== privilegeEnum.Administrator) {
                return new UserDTO(username, personInfo.privilegeID, userStatusCodes.InvalidPrivilege);
            }

            return await this._registerNewUser(registerDTO, privilegeEnum.Standard);
        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _registerNewAdministrator(registerDTO) {
        try {
            return await this._registerNewUser(registerDTO, privilegeEnum.Administrator);
        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _registerNewUser(registerDTO, privilege) {
        const passwordHash = await this._generatePasswordHash(registerDTO.password);

        const checkEmailQuery = {
            text: `SELECT    person.id
            FROM        person
            WHERE    person.email = $1`,
            values: [registerDTO.email],
        };

        const checkUsernameQuery = {
            text: `SELECT    account.id
            FROM        account
            WHERE    account.username = $1`,
            values: [registerDTO.username],
        };

        try {
            await this._executeQuery('BEGIN');

            const emailCheck = await this._executeQuery(checkEmailQuery);
            const usernameCheck = await this._executeQuery(checkUsernameQuery);

            let retValue;

            if (emailCheck.rowCount > 0) {
                retValue = new UserDTO(registerDTO.username, privilegeEnum.Invalid, userStatusCodes.ExistentEmail);
            } else if (usernameCheck.rowCount > 0) {
                retValue = new UserDTO(registerDTO.username, privilegeEnum.Invalid, userStatusCodes.ExistentUsername);
            } else {
                const enterNewUser = {
                    text: `WITH new_user AS (
                        INSERT INTO person(firstname, lastname, personal_number, email, privilege_id)
                        VALUES ($1, $2, $3, $4, $5) RETURNING person.id
                    )
                    INSERT INTO account(username, password, person_id)
                    VALUES ($6, $7,
                        (SELECT new_user.id
                        FROM new_user)
                    ) RETURNING account.username, account.person_id`,
                    values: [registerDTO.firstName, registerDTO.lastName, registerDTO.personalNumber,
                    registerDTO.email, privilege, registerDTO.username, passwordHash],
                };


                await this._executeQuery(enterNewUser);
                retValue = new UserDTO(registerDTO.username, privilege, userStatusCodes.OK);
            }

            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Get the list of users with their information. Note that only high privilege user can do list users. 
     * @param {string} username The username of the related user that initiated the request.
     * @returns {UserInfoDTO | null} An array of objects that hold all the information about the results.
     *                              null indicates that something went wrong and it gets logged.
     */         
    async listUsers(username) {
        try {
            const personInfo = await this._getPersonInfo(username);

            if (personInfo === null) {
                return new UserInfoDTO([], userInfoStatusCodes.InvalidUser);
            }

            if (personInfo.privilegeID !== privilegeEnum.Administrator) {
                return new UserInfoDTO([], userInfoStatusCodes.InvalidPrivilege);
            }

            const getUsersQuery = {
                text: `SELECT  person.firstname, person.lastname,
                person.personal_number, account.username
                FROM        account
                INNER JOIN person ON (person.id = account.person_id)
                WHERE    person.privilege_id = $1`,
                values: [privilegeEnum.Standard],
            };

            await this._executeQuery('BEGIN');

            let retValue;
            let userInfoList = [];
            const results = await this._executeQuery(getUsersQuery);

            for (let i = 0; i < results.rowCount; i++) {
                userInfoList[i] = {firstName: results.rows[i].firstname, lastName: results.rows[i].lastname, 
                                personalNumber: results.rows[i].personal_number, username: results.rows[i].username}
            }

            retValue = new UserInfoDTO([...userInfoList], userInfoStatusCodes.OK);

            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }

    /**
     * Deletes all information about the specified user and removes the user from the system.
     * @param {string} username The username of the related user initiated the deleting process.
     * @param {string} userToBeRemoved The username of the user that it will be removed.
     * @returns {boolean | null} true or false to give a confirmation of the deletion.
     *                           null indicates that something went wrong and it gets logged.
     */
    async deleteUser(username, userToBeRemoved) {
        try {
            const adminInfo = await this._getPersonInfo(username);
            const userInfo = await this._getPersonInfo(userToBeRemoved);

            if (adminInfo === null) {
                return false;
            }

            if (adminInfo.privilegeID !== privilegeEnum.Administrator) {
                return false;
            }

            if (userInfo === null) {
                return false;
            }

            const deleteBookingQuery = {
                text: `DELETE FROM public.pass_booking
                WHERE account_id = $1`,
                values: [userInfo.accountID],
            };

            const deleteAccountQuery = {
                text: `DELETE FROM public.account
                WHERE id = $1`,
                values: [userInfo.accountID],
            };

            const deletePersonQuery = {
                text: `DELETE FROM public.person
                WHERE id = $1`,
                values: [userInfo.personID],
            };

            await this._executeQuery('BEGIN');

            await this._executeQuery(deleteBookingQuery)
            await this._executeQuery(deleteAccountQuery)
            await this._executeQuery(deletePersonQuery)
            
            await this._executeQuery('COMMIT');

            return true;
        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }
	
	/**
     * Lock the pass slot temporarily for an amount of time to allow the user to confirm their choice.
     * @param {string} username The username that is related to the user.
     * @param {int} roomNumber The number related to the room chosen.
     * @param {string} date The date that the pass is going to be.
     * @param {string} passRange The time frame that the pass have.
     * @returns {boolean | null} true or false to give a confirmation of the locking.
     *                           null indicates that something went wrong and it gets logged.
     */
    async lockPass(username, roomNumber, date, passRange) {
        try {
            const personInfo = await this._getPersonInfo(username);
            const passScheduleID = await this._getPassInfo(roomNumber, passRange);

            if (personInfo === null) {
                return false;
            }

            if (passScheduleID === -1) {
                return false;
            }

            const bookedPassID = await this._getBookedPassID(date, passScheduleID);
            const lockOwnerID = await this._getLockOwner(date, passScheduleID);
            const activePassesCount = await this._getActivePasses(personInfo.accountID);

            if (bookedPassID !== -1) {
                return false;
            }

            if (lockOwnerID !== personInfo.accountID && lockOwnerID !== -1) {
                return false;
            }

            if (lockOwnerID === personInfo.accountID) {
                return false;
            }

            if (activePassesCount >= this.activePassesAllowed) {
                return false;
            }

            const addLockQuery = {
                text: `INSERT INTO public.pass_lock(lock_start, pass_date, account_id, pass_schedule_id)
                VALUES (NOW(), $1, $2, $3)`,
                values: [date, personInfo.accountID ,passScheduleID],
            };

            await this.unlockPass(username);

            await this._executeQuery('BEGIN');
            
            await this._executeQuery(addLockQuery);

            await this._executeQuery('COMMIT');

            return true;
        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }


    // eslint-disable-next-line require-jsdoc
    async _getPassInfo(roomNumber, passRange) {
        const getPassScheduleQuery = {
            text: `SELECT    pass_schedule.id AS pass_schedule_id
            FROM        pass_schedule
                        INNER JOIN pass ON (pass.id = pass_schedule.pass_id)
            WHERE    pass_schedule.room = $1 AND
            pass.range = $2`,
            values: [roomNumber, passRange],
        };

        try {
            await this._executeQuery('BEGIN');

            const results = await this._executeQuery(getPassScheduleQuery);

            let retValue = -1;
            if (results.rowCount > 0) {
                retValue = results.rows[0].pass_schedule_id;
            }

            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            throw err;
        }
    }
    
    // eslint-disable-next-line require-jsdoc
    async _getBookedPassID(date, passScheduleID) {
        const checkBookedPassQuery = {
            text: `SELECT       pass_booking.id AS pass_booking_id
            FROM    pass_booking
            WHERE   pass_booking.date = $1 AND
                    pass_booking.pass_schedule_id = $2`,
            values: [date, passScheduleID],
        };

        try {
            await this._executeQuery('BEGIN');

            const result = await this._executeQuery(checkBookedPassQuery);

            let retValue = -1;

            if (result.rowCount > 0) {
                retValue = result.rows[0].pass_booking_id;
            }

            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            throw err;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _getActivePasses(accountID) {
        try {
            const checkActivePassesQuery = {
                text: `SELECT        COUNT(pass_booking.id) AS booking_count
                FROM        pass_booking
                WHERE       pass_booking.account_id = $1 AND
                            pass_booking.date >= CURRENT_DATE
                GROUP BY    pass_booking.id`,
                values: [accountID]
            };

            let retValue = -1;
            await this._executeQuery('BEGIN');
            
            const result = await this._executeQuery(checkActivePassesQuery);
            
            if (result.rowCount > 0) {
                retValue = result.rows[0].booking_count;
            }

            await this._executeQuery('COMMIT');
            
            return retValue;
        } catch (err) {
            throw err;
        }
    }

	// eslint-disable-next-line require-jsdoc
    async _getLockOwner(date, passScheduleID) {
        const checkLockedPassQuery = {
            text: `SELECT        pass_lock.account_id AS account_id
            FROM    pass_lock
            WHERE   pass_lock.pass_date = $1 AND
                    pass_lock.pass_schedule_id = $2 AND
                    (NOW() - pass_lock.lock_start) <= ($3 * 60) * INTERVAL '1' second`,
            values: [date, passScheduleID, this.lockDuration],
        };

        try {
            await this._executeQuery('BEGIN');

            const results = await this._executeQuery(checkLockedPassQuery);

            let retValue = -1;
            if (results.rowCount > 0) {
                retValue = results.rows[0].account_id;
            }

            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Unlock the temporarily locked pass slot that the user had.
     * @param {string} username The username that related to the user.
     * @returns {boolean | null} true or false to give a confirmation of the unlocking.
     *                           null indicates that something went wrong and it gets logged.
     */
    async unlockPass(username) {
        try {
            const personInfo = await this._getPersonInfo(username);
            
            if (personInfo === null) {
                return false;
            }

            const deleteLockQuery = {
                text: `DELETE FROM public.pass_lock
                WHERE pass_lock.account_id = $1`,
                values: [personInfo.accountID],
            };

            await this._executeQuery('BEGIN');
            
            await this._executeQuery(deleteLockQuery);
            
            await this._executeQuery('COMMIT');
            
            return true;
        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }
    
    // eslint-disable-next-line require-jsdoc
    async _getPersonInfo(username) {
        const getInfoQuery = {
            text: `SELECT    account.id AS account_id, person.id AS person_id, 
            person.email, person.privilege_id
            FROM        account
            INNER JOIN person ON (person.id = account.person_id)
            WHERE    account.username = $1`,
            values: [username],
        };

        try {
            await this._executeQuery('BEGIN');

            const results = await this._executeQuery(getInfoQuery);

            let retValue = null;
            if (results.rowCount > 0) {
                retValue = new PersonInfo(results.rows[0].account_id, results.rows[0].person_id,
                    results.rows[0].email, results.rows[0].privilege_id);
            }

            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            throw err;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _executeQuery(query) {
        try {
            if (!this.client._connected) {
                throw new Error('The connection to the database is down.');
            }

            const results = await this.client.query(query);
            return results;
        } catch (mainErr) {
            try {
                if (this.client._connected) {
                    await this.this.client.query('ROLLBACK')
                }
            } catch (err) {
                this.logger.logException(err);
            }

            throw mainErr;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _generatePasswordHash(plainPassword) {
        const saltRounds = parseInt(process.env.SALT_ROUNDS, 10);
        const salt = await bcrypt.genSalt(saltRounds);
        const passwordHash = await bcrypt.hash(plainPassword, salt);
        return passwordHash;
    }

    // eslint-disable-next-line require-jsdoc
    async _verifyPasswordHash(plainPassword, passwordHash) {
        const result = await bcrypt.compare(plainPassword, passwordHash);
        return result;
    }
}

module.exports = LaundryDAO;

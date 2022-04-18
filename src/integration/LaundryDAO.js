'use strict';

const {Client, types} = require('pg');
const bcrypt = require('bcrypt');
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
     * @returns {boolean | null} true or false to give a confirmation of the deletion in case nothing wrong happens.
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

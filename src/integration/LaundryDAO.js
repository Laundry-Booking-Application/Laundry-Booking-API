'use strict';

const {Client, types} = require('pg');
const bcrypt = require('bcrypt');
let dayjs = require('dayjs');
let weekOfYear = require('dayjs/plugin/weekOfYear');
const Logger = require('../util/Logger');
const UserDTO = require('../model/UserDTO');
const RegisterDTO = require('../model/RegisterDTO');
const UserInfoDTO = require('../model/UserInfoDTO');
const BookingDTO = require('../model/BookingDTO');
const PassDTO = require('../model/PassDTO');
const PassScheduleDTO = require('../model/PassScheduleDTO');
const privilegeEnum = require('../util/privilegeEnum');
const userStatusCodes = require('../util/userStatusCodes');
const userInfoStatusCodes = require('../util/userInfoStatusCodes');
const bookingStatusCodes = require('../util/bookingStatusCodes');
const scheduleStatusCodes = require('../util/scheduleStatusCodes');
const slotStatusEnum = require('../util/slotStatusEnum');
const emptyParamEnum = require('../util/emptyParamEnum');
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
        dayjs.extend(weekOfYear);

        this.activePassesAllowed = 1;
        this.totalMonthPassesAllowed = 6;
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

                if (!passwordVerification) {
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
                return new UserInfoDTO(emptyParamEnum.PersonInfo, userInfoStatusCodes.InvalidUser);
            }

            if (personInfo.privilegeID !== privilegeEnum.Administrator) {
                return new UserInfoDTO(emptyParamEnum.PersonInfo, userInfoStatusCodes.InvalidPrivilege);
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
                userInfoList[i] = {
                    firstName: results.rows[i].firstname, lastName: results.rows[i].lastname,
                    personalNumber: results.rows[i].personal_number, username: results.rows[i].username
                }
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
     * Get the number corresponding to the current date.
     * @returns {int} The number of the current week.
     */
    async getWeekNumber() {
        try {
            return dayjs().week() - 1;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Get the passes schedule for the week. 
     * Residents are allowed to see the bookings of one week before and after the current one.
     * @param {string} username The username related to the person.
     * @param {int} week The specific week to get the passes related to the week dates.
     * @returns {PassScheduleDTO | null} An object with All the bookings for a specific week.
     *                                   null indicates that something went wrong and it gets logged.
     */
    async getResidentPasses(username, week) {
        try {
            const weekCorrection = week + 1;
            const weekOffset = 1;
            const checkWeek = await this._checkWeekSchedule(weekCorrection, weekOffset);
            const personInfo = await this._getPersonInfo(username);

            if (!checkWeek) {
                return new PassScheduleDTO(emptyParamEnum.Week, emptyParamEnum.RoomCount,
                    emptyParamEnum.RoomPasses, scheduleStatusCodes.InvalidWeek);
            }

            if (personInfo === null) {
                return new PassScheduleDTO(emptyParamEnum.Week, emptyParamEnum.RoomCount,
                    emptyParamEnum.RoomPasses, scheduleStatusCodes.InvalidUser);
            }

            if (personInfo.privilegeID !== privilegeEnum.Standard && personInfo.privilegeID !== privilegeEnum.Administrator) {
                return new PassScheduleDTO(emptyParamEnum.Week, emptyParamEnum.RoomCount,
                    emptyParamEnum.RoomPasses, scheduleStatusCodes.InvalidPrivilege);
            }

            let passesSchedule = await this._getPassesSchedule(weekCorrection);
            const userBooking = await this.getBookedPass(username);

            if (passesSchedule === null) {
                return null;
            }

            const bookingParam = [{date: userBooking.date, room: userBooking.roomNumber, range: userBooking.passRange}];
            await this._fillPassSchedule(passesSchedule, bookingParam, slotStatusEnum.SelfBooking);

            passesSchedule.roomPasses.forEach(room => {
                room.passes.forEach(pass => {
                    pass.slots.forEach(slot => {
                        delete slot.username;
                    });
                });
            });

            passesSchedule.weekNumber = week;
            return passesSchedule;
        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }

    /**
     * Get the passes schedule for the week with all the username related to the bookings. 
     * Can be only used by an administrator.
     * @param {string} username The username related to the person.
     * @param {int} week The specific week to get the passes related to the week dates.
     * @returns {PassScheduleDTO | null} An object with All the bookings for a specific week.
     *                                   null indicates that something went wrong and it gets logged.
     */
    async getPasses(username, week) {
        try {
            const personInfo = await this._getPersonInfo(username);
            const weekCorrection = week + 1;

            if (personInfo === null) {
                return new PassScheduleDTO(emptyParamEnum.Week, emptyParamEnum.RoomCount,
                    emptyParamEnum.RoomPasses, scheduleStatusCodes.InvalidUser);
            }

            if (personInfo.privilegeID !== privilegeEnum.Administrator) {
                return new PassScheduleDTO(emptyParamEnum.Week, emptyParamEnum.RoomCount,
                    emptyParamEnum.RoomPasses, scheduleStatusCodes.InvalidPrivilege);
            }

            let passesSchedule = await this._getPassesSchedule(weekCorrection);

            if (passesSchedule === null) {
                return null;
            }

            passesSchedule.weekNumber = week;
            return passesSchedule;

        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _checkWeekSchedule(week, offset) {
        const currentWeek = dayjs().week();

        if ((currentWeek - offset) <= week && (currentWeek + offset) >= week) {
            return true;
        }

        return false;
    }

    // eslint-disable-next-line require-jsdoc
    async _getPassesSchedule(week) {
        try {
            const { startWeekDate, endWeekDate } = await this._weekStartAndEndDate(week);
            let passSchedule = await this._buildPassesSchedule(week);

            if (passSchedule === null) {
                return null;
            }

            const getSpecificBookingsQuery = {
                text: `SELECT	pass_booking.date, pass_schedule.room,
                pass.range, account.username
                FROM	pass_booking
                INNER JOIN account ON (account.id = pass_booking.account_id)
                INNER JOIN pass_schedule ON (pass_schedule.id = pass_booking.pass_schedule_id)
                INNER JOIN pass ON (pass.id = pass_schedule.pass_id)
                WHERE	pass_booking.date >= $1 AND
                pass_booking.date <= $2`,
                values: [startWeekDate, endWeekDate],
            };

            const getLockedBookingsQuery = {
                text: `SELECT    pass_lock.pass_date AS date, pass_schedule.room,
                pass.range, account.username
                FROM        pass_lock
                INNER JOIN account ON (account.id = pass_lock.account_id)
                INNER JOIN pass_schedule ON (pass_schedule.id = pass_lock.pass_schedule_id)
                INNER JOIN pass ON (pass.id = pass_schedule.pass_id)
                WHERE    pass_lock.pass_date >= CURRENT_DATE AND
                (NOW() - pass_lock.lock_start) <= ($1 * 60) * INTERVAL '1' second`,
                values: [this.lockDuration],
            };

            await this._executeQuery('BEGIN');

            const getSpecificBookingsRes = await this._executeQuery(getSpecificBookingsQuery);
            const getLockedBookingsRes = await this._executeQuery(getLockedBookingsQuery);

            await this._fillPassSchedule(passSchedule, getSpecificBookingsRes.rows, slotStatusEnum.Taken);
            await this._fillPassSchedule(passSchedule, getLockedBookingsRes.rows, slotStatusEnum.Taken);

            await this._executeQuery('COMMIT');

            passSchedule.statusCode = bookingStatusCodes.OK;
            return passSchedule;
        } catch (err) {
            throw err;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _fillPassSchedule(passSchedule, passes, status) {
        try {
            for (let i = 0; i < passes.length; i++) {
                passSchedule.roomPasses.forEach(room => {
                    if (room.roomNum === passes[i].room) {
                        room.passes.forEach(pass => {
                            if (pass.date === passes[i].date) {
                                pass.slots.forEach(slot => {
                                    if (slot.range === passes[i].range) {
                                        slot.status = status;
                                        slot.username = passes[i].username;
                                    }
                                });
                            }
                        });
                    }
                });
            }
        } catch (err) {
            throw err;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _weekStartAndEndDate(week) {
        const startWeekDate = dayjs().week(week).day(1).$d.toISOString().substring(0, 10);
        const endWeekDate = dayjs().week(week).day(7).$d.toISOString().substring(0, 10);
        return { startWeekDate: startWeekDate, endWeekDate: endWeekDate };
    }

    // eslint-disable-next-line require-jsdoc
    async _buildPassesSchedule(week) {
        try {
            const passSchedule = await this._getPassScheduleScheme();
            const weekDate = await this._getWeekDates(week);

            if (passSchedule === null) {
                return null;
            }

            let roomPasses = [];
            for (let roomCounter = 0; roomCounter < passSchedule.length; roomCounter++) {
                let roomPass = [];

                for (let day = 0; day < weekDate.length; day++) {
                    let slots = [];

                    for (let slotCounter = 0; slotCounter < passSchedule[roomCounter].slots.length; slotCounter++) {
                        slots[slotCounter] = {
                            range: passSchedule[roomCounter].slots[slotCounter],
                            status: slotStatusEnum.Available,
                            username: emptyParamEnum.Username
                        };
                    }

                    roomPass[day] = new PassDTO(weekDate[day], slots);
                }

                roomPasses[roomCounter] = { roomNum: passSchedule[roomCounter].room, passes: roomPass };
            }

            return new PassScheduleDTO(week, passSchedule.length, weekDate, roomPasses, bookingStatusCodes.OK);
        } catch (err) {
            throw err;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _getPassScheduleScheme() {
        try {
            const passScheduleQuery = {
                text: `SELECT		pass_schedule.room, 
                ARRAY_AGG(pass.range) AS slots
                FROM		pass_schedule
                            INNER JOIN pass ON (pass.id = pass_schedule.pass_id)
                GROUP BY	pass_schedule.room
                ORDER BY    pass_schedule.room ASC`,
                values: [],
            };

            let retValue = null;
            await this._executeQuery('BEGIN');

            const results = await this._executeQuery(passScheduleQuery);

            if (results.rowCount > 0) {
                retValue = results.rows;
            }

            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            throw err;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _getWeekDates(week) {
        try {
            const offset = 1;
            let weekDate = [];

            for (let day = 0; day < 7; day++) {
                weekDate[day] = dayjs().week(week).day(day + offset).$d.toISOString().substring(0, 10);
            }

            return weekDate;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Lock the pass slot temporarily for an amount of time to allow the user to confirm their choice.
     * @param {string} username The username that is related to the user.
     * @param {int} roomNumber The number related to the chosen room.
     * @param {string} date The date of the laundry pass.
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

            const checkRange = await this._checkRangeHour(passRange);
            const bookedPassID = await this._getBookedPassID(date, passScheduleID);
            const lockOwnerID = await this._getLockOwner(date, passScheduleID);
            const activePassesCount = await this._getActivePasses(personInfo.accountID, passRange);
            
            if (!checkRange) {
                return false;
            }

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
                values: [date, personInfo.accountID, passScheduleID],
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
    async _getActivePasses(accountID, range) {
        try {
            const checkActivePassesQuery = {
                text: `SELECT      COUNT(pass_booking.id) AS booking_count
                FROM        pass_booking
                INNER JOIN pass_schedule ON (pass_schedule.id = pass_booking.pass_schedule_id)
                INNER JOIN pass ON (pass.id = pass_schedule.pass_id)
                WHERE       pass_booking.account_id = $1 AND
                pass_booking.date >= CURRENT_DATE AND
                pass.range >= $2 
                GROUP BY    pass_booking.id`,
                values: [accountID, range]
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

    /**
     * Book the chosen pass for the user.
     * @param {string} username The username related to the person.
     * @param {int} roomNumber The number related to the room.
     * @param {string} date The date of the laundry pass.
     * @param {string} passRange The time frame that the pass have.
     * @returns {BookingDTO | null} An object that has the result of the booking result.
     *                              null indicates that something went wrong and it gets logged.
     */
    async bookPass(username, roomNumber, date, passRange) {
        try {
			const currentDate = dayjs();
            const currentWeek = dayjs().week();
            const dateWeek = dayjs(date).week();
            const dateMonth = dayjs(date).month();
            const personInfo = await this._getPersonInfo(username);
            const passScheduleID = await this._getPassInfo(roomNumber, passRange);
            
            if (currentWeek > dateWeek || dateWeek > (currentWeek + 1)) {
                return new BookingDTO(emptyParamEnum.Date, emptyParamEnum.RoomNumber,
                    emptyParamEnum.PassRange, bookingStatusCodes.InvalidDate);
            }
			
			if (date < currentDate.$d.toISOString().substring(0,10)) {
                return new BookingDTO(emptyParamEnum.Date, emptyParamEnum.RoomNumber,
                    emptyParamEnum.PassRange, bookingStatusCodes.InvalidDate);
            }
			
            if (personInfo === null) {
                return new BookingDTO(emptyParamEnum.Date, emptyParamEnum.RoomNumber,
                    emptyParamEnum.PassRange, bookingStatusCodes.InvalidUser);
            }

            if (passScheduleID === -1) {
                return new BookingDTO(emptyParamEnum.Date, emptyParamEnum.RoomNumber,
                    emptyParamEnum.PassRange, bookingStatusCodes.InvalidPassInfo);
            }

            const checkRange = await this._checkRangeHour(passRange);
            const { startMonthDate, endMonthDate } = await this._monthStartAndEndDate(dateMonth);

            const bookedPassID = await this._getBookedPassID(date, passScheduleID);
            const lockOwnerID = await this._getLockOwner(date, passScheduleID);
            const activePassesCount = await this._getActivePasses(personInfo.accountID, passRange);
            const periodBookedPasses = await this._getPeriodBookedPasses(personInfo.accountID, startMonthDate, endMonthDate);

            if (!checkRange) {
                return new BookingDTO(emptyParamEnum.Date, emptyParamEnum.RoomNumber,
                    emptyParamEnum.PassRange, bookingStatusCodes.InvalidPassInfo);
            }

            if (bookedPassID !== -1) {
                return new BookingDTO(emptyParamEnum.Date, emptyParamEnum.RoomNumber,
                    emptyParamEnum.PassRange, bookingStatusCodes.BookedPass);
            }

            if (lockOwnerID !== personInfo.accountID && lockOwnerID !== -1) {
                return new BookingDTO(emptyParamEnum.Date, emptyParamEnum.RoomNumber,
                    emptyParamEnum.PassRange, bookingStatusCodes.LockedPass);
            }

            if (activePassesCount >= this.activePassesAllowed) {
                return new BookingDTO(emptyParamEnum.Date, emptyParamEnum.RoomNumber,
                    emptyParamEnum.PassRange, bookingStatusCodes.ExistentActivePass);
            }

            if (periodBookedPasses >= this.totalMonthPassesAllowed) {
                return new BookingDTO(emptyParamEnum.Date, emptyParamEnum.RoomNumber,
                    emptyParamEnum.PassRange, bookingStatusCodes.PassCountExceeded);
            }

            await this._executeQuery('BEGIN');

            let retValue;
            const insertBookingQuery = {
                text: `INSERT INTO public.pass_booking(date, account_id, pass_schedule_id)
                    VALUES ($1, $2, $3)`,
                values: [date, personInfo.accountID, passScheduleID],
            };

            await this._executeQuery(insertBookingQuery);
            await this.unlockPass(username);
            retValue = new BookingDTO(date, roomNumber, passRange, bookingStatusCodes.OK);

            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _checkRangeHour(range) {
        try {
            let endHour = parseInt(range.substring(3,5));
            const currentHour = dayjs().hour();

            if (endHour >= currentHour) {
                return true;
            }

            return false;
        } catch (err) {
            throw err;
        }
    }

    // eslint-disable-next-line require-jsdoc
    async _monthStartAndEndDate(month) {
        const startMonthDate = dayjs().month(month).startOf('month').add(1, 'day');
        const endMonthDate = dayjs().month(month).endOf('month');
        return { startMonthDate: startMonthDate, endMonthDate: endMonthDate };
    }

    // eslint-disable-next-line require-jsdoc
    async _getPeriodBookedPasses(accountID, startPeriod, endPeriod) {
        try {
            const checkPeriodBookedPassesQuery = {
                text: `SELECT        COUNT(pass_booking.id) AS specific_booking_count
                FROM        pass_booking
                WHERE        pass_booking.account_id = $1 AND
                            pass_booking.date >= $2 AND
                            pass_booking.date <= $3
                GROUP BY    pass_booking.id`,
                values: [accountID, startPeriod, endPeriod],
            };

            await this._executeQuery('BEGIN');

            const results = await this._executeQuery(checkPeriodBookedPassesQuery);

            let retValue = 0;

            if (results.rowCount > 0) {
                retValue = results.rows[0].specific_booking_count;
            }

            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            throw err;
        }
    }

    /**
     * Get the active booking of the person.
     * @param {string} username The username related to the person.
     * @returns {BookingDTO | null} An object with the booking information.
     *                              null indicates that something went wrong and it gets logged.
     */
    async getBookedPass(username) {
        try {
            const personInfo = await this._getPersonInfo(username);

            if (personInfo === null) {
                return new BookingDTO(emptyParamEnum.Date, emptyParamEnum.RoomNumber,
                    emptyParamEnum.PassRange, bookingStatusCodes.InvalidUser);
            }

            const getBookingQuery = {
                text: `SELECT	pass_booking.date, pass_schedule.room, pass.range
                FROM	pass_booking
                        INNER JOIN pass_schedule ON (pass_schedule.id = pass_booking.pass_schedule_id)
                        INNER JOIN pass ON (pass.id = pass_schedule.pass_id)
                WHERE	pass_booking.account_id = $1 AND
                        pass_booking.date >= CURRENT_DATE AND
                        SUBSTRING(pass.range, 4,5)::INT >= EXTRACT('HOUR' FROM NOW())`,
                values: [personInfo.accountID],
            };

            await this._executeQuery('BEGIN');

            const results = await this._executeQuery(getBookingQuery);

            let retValue;

            if (results.rowCount > 0) {
                retValue = new BookingDTO(results.rows[0].date, results.rows[0].room, results.rows[0].range, bookingStatusCodes.OK);
            } else {
                retValue = new BookingDTO(emptyParamEnum.Date, emptyParamEnum.RoomNumber,
                    emptyParamEnum.PassRange, bookingStatusCodes.NoBooking);
            }

            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }

    /**
     * Cancel an active booking of the person.
     * @param {string} username The username related to the person.
     * @param {int} roomNumber The number related to the room.
     * @param {string} date The date that the pass is booked on.
     * @param {string} passRange The time frame of the booked pass.
     * @returns {boolean | null} true or false to indicate that the booking has been canceled.
     *                           null indicates that something went wrong and it gets logged.
     */
    async cancelBookedPass(username, roomNumber, date, passRange) {
        try {
            const personInfo = await this._getPersonInfo(username);
            const passScheduleID = await this._getPassInfo(roomNumber, passRange);

            if (personInfo === null) {
                return false;
            }
			
            if (passScheduleID === -1) {
                return false;
            }
			
            const checkRange = await this._checkRangeHour(passRange);

            if (!checkRange && personInfo.privilegeID !== privilegeEnum.Administrator) {
                return false;
            }
			
            const cancelBookingQuery = {
                text: `DELETE FROM public.pass_booking
                WHERE       pass_booking.date = $1 AND
                            $1  >= CURRENT_DATE AND
                            pass_schedule_id = $2 AND
                            CASE WHEN (($3 = $4) IS NOT TRUE) THEN
                                pass_booking.account_id = $5
                            ELSE
                                TRUE
                            END`,
                values: [date, passScheduleID, personInfo.privilegeID, privilegeEnum.Administrator, personInfo.accountID],
            };

            await this._executeQuery('BEGIN');

            const results = await this._executeQuery(cancelBookingQuery);

            let retValue = false;

            if (results.rowCount > 0) {
                retValue = true;
            }
            await this._executeQuery('COMMIT');

            return retValue;
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
                if (this.client !== undefined && this.client._connected) {
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

    // eslint-disable-next-line require-jsdoc
    async _deleteOldBookings(date) {
        const getInfoQuery = {
            text: `DELETE FROM public.pass_booking
            WHERE     pass_booking.date <= $1`,
            values: [date],
        };

        try {
            let retValue = false;

            await this._executeQuery('BEGIN');

            const results = await this._executeQuery(getInfoQuery);

            if (results.rowCount > 0) {
                retValue = true;
            }

            await this._executeQuery('COMMIT');

            return retValue;
        } catch (err) {
            this.logger.logException(err);
            return null;
        }
    }
}

module.exports = LaundryDAO;

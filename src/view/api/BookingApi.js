'use strict';

const {query, body, validationResult} = require('express-validator');
const RequestHandler = require('./RequestHandler');
const Validators = require('../../util/Validators');
const Authorization = require('./auth/Authorization');
const bookingStatusCodes = require('../../util/bookingStatusCodes');
const scheduleStatusCodes = require('../../util/scheduleStatusCodes');

/**
 * Handles the REST API requests for the booking endpoints.
 */
class BookingApi extends RequestHandler {
    /**
     * Constructs an instance of {BookingApi}.
     */
    constructor() {
        super();
    }

    /**
     * @return {string} The URL paths handled by the booking api request handler.
     */
    get path() {
        return BookingApi.BOOKING_API_PATH;
    }

    /**
     * @return {string} The URL paths handled by the booking request handler.
     */
    static get BOOKING_API_PATH() {
        return '/booking';
    }

    /**
    * Registers the request handling functions.
    */
    async registerHandler() {
        try {
            await this.fetchController();

            /**
             * Temporarily locks a specific laundry pass slot for an amount of time
             * to allow the user to confirm their choice.
             * This endpoint is only accessible by authenticated 'Standard' users.
             * Errors caused by database related issues, are handled by the
             * {BookingErrorHandler}.
             *
             * parameter roomNumber The number related to the chosen room.
             * parameter date The date of the laundry pass.
             * parameter passRange The time frame that the pass has.
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains the locking operation result.
             *         400: If the request body did not contain properly formatted fields.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.post(
                '/lockPass',
                body('roomNumber').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isPositiveWholeNumber(value, 'roomNumber');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                body('date').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isDateFormat(value, 'date');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                body('passRange').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isPassRange(value, 'passRange');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                async (req, res, next) => {
                    try {
                        const errors = validationResult(req);
                        if (!errors.isEmpty()) {
                            this.sendHttpResponse(res, 400, errors);
                            return;
                        }
                        const loggedInUserDTO = await Authorization.verifyStandardAuthorization(req);

                        if (loggedInUserDTO === null) {
                            this.sendHttpResponse(res, 401, 'Missing or invalid authorization cookie.');
                            return;
                        } else {
                            const lockingResult = await this.controller.lockPass(loggedInUserDTO.username, req.body.roomNumber, req.body.date, req.body.passRange);
                            if (lockingResult === null) {
                                throw new Error('Expected operation result boolean, received null.');
                            } else {
                                const resultObject = {'result': lockingResult};
                                this.sendHttpResponse(res, 200, resultObject);
                                return;
                            }
                        }
                    } catch (err) {
                        next(err);
                    }
                },
            );

            /**
             * Unlocks the temporarily locked laundry pass slot that the user had.
             * This endpoint is only accessible by authenticated 'Standard' users.
             * Errors caused by database related issues, are handled by the
             * {BookingErrorHandler}.
             *
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains the unlocking operation result.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.post(
                '/unlockPass',
                async (req, res, next) => {
                    try {
                        const loggedInUserDTO = await Authorization.verifyStandardAuthorization(req);

                        if (loggedInUserDTO === null) {
                            this.sendHttpResponse(res, 401, 'Missing or invalid authorization cookie.');
                            return;
                        } else {
                            const unlockingResult = await this.controller.unlockPass(loggedInUserDTO.username);
                            if (unlockingResult === null) {
                                throw new Error('Expected operation result boolean, received null.');
                            } else {
                                const resultObject = {'result': unlockingResult};
                                this.sendHttpResponse(res, 200, resultObject);
                                return;
                            }
                        }
                    } catch (err) {
                        next(err);
                    }
                },
            );

            /**
             * Books the chosen laundry pass for the user.
             * This endpoint is only accessible by authenticated 'Standard' users.
             * Errors caused by database related issues, are handled by the
             * {BookingErrorHandler}.
             *
             * parameter roomNumber The number related to the chosen room.
             * parameter date The date of the laundry pass.
             * parameter passRange The time frame that the pass has.
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains the booking operation result {BookingDTO}.
             *         400: If the request body did not contain properly formatted fields or
             *              if an error has occurred while attempting to book the pass.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.post(
                '/bookPass',
                body('roomNumber').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isPositiveWholeNumber(value, 'roomNumber');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                body('date').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isDateFormat(value, 'date');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                body('passRange').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isPassRange(value, 'passRange');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                async (req, res, next) => {
                    try {
                        const errors = validationResult(req);
                        if (!errors.isEmpty()) {
                            this.sendHttpResponse(res, 400, errors);
                            return;
                        }
                        const loggedInUserDTO = await Authorization.verifyStandardAuthorization(req);

                        if (loggedInUserDTO === null) {
                            this.sendHttpResponse(res, 401, 'Missing or invalid authorization cookie.');
                            return;
                        } else {
                            const bookingDTO = await this.controller.bookPass(loggedInUserDTO.username, req.body.roomNumber, req.body.date, req.body.passRange);
                            if (bookingDTO === null) {
                                throw new Error('Expected BookingDTO object, received null.');
                            } else {
                                if (bookingDTO.statusCode === bookingStatusCodes.OK) {
                                    this.sendHttpResponse(res, 200, bookingDTO);
                                    return;
                                } else if (bookingDTO.statusCode === bookingStatusCodes.InvalidUser) {
                                    this.sendHttpResponse(res, 400, 'The username is invalid.');
                                    return;
                                } else if (bookingDTO.statusCode === bookingStatusCodes.InvalidPassInfo) {
                                    this.sendHttpResponse(res, 400, 'The requested pass range is invalid.');
                                    return;
                                } else if (bookingDTO.statusCode === bookingStatusCodes.ExistentActivePass) {
                                    this.sendHttpResponse(res, 400, 'The maximum simultaneously allowed laundry passes has been exceeded.');
                                    return;
                                } else if (bookingDTO.statusCode === bookingStatusCodes.PassCountExceeded) {
                                    this.sendHttpResponse(res, 400, 'The maximum allowed laundry passes per month has been exceeded.');
                                    return;
                                } else if (bookingDTO.statusCode === bookingStatusCodes.BookedPass) {
                                    this.sendHttpResponse(res, 400, 'The requested laundry pass is already booked.');
                                    return;
                                } else if (bookingDTO.statusCode === bookingStatusCodes.LockedPass) {
                                    this.sendHttpResponse(res, 400, 'The requested laundry pass is being booked by someone else.');
                                    return;
                                } else if (bookingDTO.statusCode === bookingStatusCodes.InvalidDate) {
                                    this.sendHttpResponse(res, 400, 'The requested laundry pass date is invalid.');
                                    return;
                                }
                            }
                        }
                    } catch (err) {
                        next(err);
                    }
                },
            );


            /**
             * Gets the active booking pass of the authenticated user.
             * This endpoint is only accessible by authenticated users.
             * Errors caused by database related issues, are handled by the
             * {BookingErrorHandler}.
             *
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains the active booking information {BookingDTO}.
             *         400: if there was no active booking.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.get(
                '/getBookedPass',
                async (req, res, next) => {
                    try {
                        const loggedInUserDTO = await Authorization.verifyAuthCookie(req);

                        if (loggedInUserDTO === null) {
                            this.sendHttpResponse(res, 401, 'Missing or invalid authorization cookie.');
                            return;
                        } else {
                            const bookingDTO = await this.controller.getBookedPass(loggedInUserDTO.username);
                            if (bookingDTO === null) {
                                throw new Error('Expected BookingDTO object, received null.');
                            } else {
                                if (bookingDTO.statusCode === bookingStatusCodes.OK) {
                                    this.sendHttpResponse(res, 200, bookingDTO);
                                    return;
                                } else if (bookingDTO.statusCode === bookingStatusCodes.NoBooking) {
                                    this.sendHttpResponse(res, 400, 'No active booking found.');
                                    return;
                                }
                            }
                        }
                    } catch (err) {
                        next(err);
                    }
                },
            );

            /**
             * Cancels an active laundry pass.
             * This endpoint is only accessible by authenticated users.
             * Errors caused by database related issues, are handled by the
             * {BookingErrorHandler}.
             *
             * parameter roomNumber The number related to the chosen room.
             * parameter date The date of the laundry pass.
             * parameter passRange The time frame that the pass has.
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains the booking cancellation result.
             *         400: If the request body did not contain properly formatted fields.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.post(
                '/cancelBookedPass',
                body('roomNumber').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isPositiveWholeNumber(value, 'roomNumber');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                body('date').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isDateFormat(value, 'date');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                body('passRange').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isPassRange(value, 'passRange');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                async (req, res, next) => {
                    try {
                        const errors = validationResult(req);
                        if (!errors.isEmpty()) {
                            this.sendHttpResponse(res, 400, errors);
                            return;
                        }
                        const loggedInUserDTO = await Authorization.verifyAuthCookie(req);

                        if (loggedInUserDTO === null) {
                            this.sendHttpResponse(res, 401, 'Missing or invalid authorization cookie.');
                            return;
                        } else {
                            const cancellationResult = await this.controller.cancelBookedPass(loggedInUserDTO.username, req.body.roomNumber, req.body.date, req.body.passRange);
                            if (cancellationResult === null) {
                                throw new Error('Expected cancellationResult object, received null.');
                            } else {
                                const resultObject = {'result': cancellationResult};
                                this.sendHttpResponse(res, 200, resultObject);
                                return;
                            }
                        }
                    } catch (err) {
                        next(err);
                    }
                },
            );

            /**
             * Fetches the laundry passes' schedule for the specified week.
             * Residents are only allowed to see the passes schedule of one week before and after the current week.
             * This endpoint is only accessible by authenticated users.
             * Errors caused by database related issues, are handled by the
             * {BookingErrorHandler}.
             *
             * parameter week The requested week to get the laundry passes' schedule for.
             *                Accepted values are -1, 0 and 1 for previous, current and next week respectively.
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains an {PassScheduleDTO} object that contains information about the
             *              bookings for the specified week.
             *         400: If the request query did not contain properly formatted fields.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.get(
                '/getResidentPasses',
                query('week').isInt({min: -1, max: 1}),
                async (req, res, next) => {
                    try {
                        const errors = validationResult(req);
                        if (!errors.isEmpty()) {
                            this.sendHttpResponse(res, 400, errors);
                            return;
                        }
                        const loggedInUserDTO = await Authorization.verifyAuthCookie(req);

                        if (loggedInUserDTO === null) {
                            this.sendHttpResponse(res, 401, 'Missing or invalid authorization cookie.');
                            return;
                        } else {
                            const passScheduleDTO = await this.controller.getResidentPasses(loggedInUserDTO.username, req.query.week);
                            if (passScheduleDTO === null) {
                                throw new Error('Expected PassScheduleDTO object, received null.');
                            } else {
                                if (passScheduleDTO.statusCode === scheduleStatusCodes.OK) {
                                    this.sendHttpResponse(res, 200, passScheduleDTO);
                                    return;
                                } else if (passScheduleDTO.statusCode === scheduleStatusCodes.InvalidUser) {
                                    this.sendHttpResponse(res, 400, 'Invalid user.');
                                    return;
                                } else if (passScheduleDTO.statusCode === scheduleStatusCodes.InvalidPrivilege) {
                                    this.sendHttpResponse(res, 400, 'The authenticated user is not authorized to perform this operation.');
                                    return;
                                } else if (passScheduleDTO.statusCode === scheduleStatusCodes.InvalidWeek) {
                                    this.sendHttpResponse(res, 400, 'The specified week is invalid.');
                                    return;
                                }
                            }
                        }
                    } catch (err) {
                        next(err);
                    }
                },
            );

            /**
             * Fetches the passes' schedule for the specified week including the usernames related to the bookings.
             * This endpoint is only accessible by administrators.
             * Errors caused by database related issues, are handled by the
             * {BookingErrorHandler}.
             *
             * parameter week The requested week to get the laundry passes' schedule for.
             *                This parameter is relative to the current week, e.g. -2 is two weeks before the current week.
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains an {PassScheduleDTO} object that contains information about the
             *              bookings for the specified week.
             *         400: If the request query did not contain properly formatted fields.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.get(
                '/getPasses',
                query('week').isInt(),
                async (req, res, next) => {
                    try {
                        const errors = validationResult(req);
                        if (!errors.isEmpty()) {
                            this.sendHttpResponse(res, 400, errors);
                            return;
                        }
                        const loggedInUserDTO = await Authorization.verifyAdminAuthorization(req);

                        if (loggedInUserDTO === null) {
                            this.sendHttpResponse(res, 401, 'Missing or invalid authorization cookie.');
                            return;
                        } else {
                            const passScheduleDTO = await this.controller.getPasses(loggedInUserDTO.username, req.query.week);
                            if (passScheduleDTO === null) {
                                throw new Error('Expected PassScheduleDTO object, received null.');
                            } else {
                                if (passScheduleDTO.statusCode === scheduleStatusCodes.OK) {
                                    this.sendHttpResponse(res, 200, passScheduleDTO);
                                    return;
                                } else if (passScheduleDTO.statusCode === scheduleStatusCodes.InvalidUser) {
                                    this.sendHttpResponse(res, 400, 'Invalid user.');
                                    return;
                                } else if (passScheduleDTO.statusCode === scheduleStatusCodes.InvalidPrivilege) {
                                    this.sendHttpResponse(res, 400, 'The authenticated user is not authorized to perform this operation.');
                                    return;
                                } else if (passScheduleDTO.statusCode === scheduleStatusCodes.InvalidWeek) {
                                    this.sendHttpResponse(res, 400, 'The specified week is invalid.');
                                    return;
                                }
                            }
                        }
                    } catch (err) {
                        next(err);
                    }
                },
            );
        } catch (err) {
            this.logger.logException(err);
        }
    }
}

module.exports = BookingApi;

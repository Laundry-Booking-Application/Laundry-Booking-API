'use strict';

const { check, validationResult } = require('express-validator');
const RequestHandler = require('./RequestHandler');
const Validators = require('../../util/Validators');
const Authorization = require('./auth/Authorization');
const bookingStatusCodes = require('../../util/bookingStatusCodes');

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
             * This endpoint is only accessible by an authenticated 'Standard' users.
             * Errors caused by database related issues, are handled by the
             * {BookingErrorHandler}.
             *
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains the locking operation result.
             *         400: If the request body did not contain properly formatted fields.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.post(
                '/lockPass',
                check('roomNumber').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isPositiveWholeNumber(value, 'roomNumber');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                check('date').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isDateFormat(value, 'date');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                check('passRange').isString(),
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
                            }
                            else {
                                const resultObject = { 'result': lockingResult }
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
             * This endpoint is only accessible by an authenticated 'Standard' users.
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
                            }
                            else {
                                const resultObject = { 'result': unlockingResult }
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
             * This endpoint is only accessible by an authenticated 'Standard' users.
             * Errors caused by database related issues, are handled by the
             * {BookingErrorHandler}.
             *
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains the booking operation result {BookingDTO}.
             *         400: If the request body did not contain properly formatted fields or 
             *              if an error has occurred while attempting to book the pass.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.post(
                '/bookPass',
                check('roomNumber').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isPositiveWholeNumber(value, 'roomNumber');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                check('date').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isDateFormat(value, 'date');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                check('passRange').isString(),
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
                            }
                            else {
                                if (bookingDTO.statusCode === bookingStatusCodes.OK) {
                                    this.sendHttpResponse(res, 200, bookingDTO);
                                    return;
                                }
                                else if (bookingDTO.statusCode === bookingStatusCodes.InvalidUser) {
                                    this.sendHttpResponse(res, 400, 'The username is invalid.');
                                    return;
                                }
                                else if (bookingDTO.statusCode === bookingStatusCodes.InvalidPassInfo) {
                                    this.sendHttpResponse(res, 400, 'The requested pass range is invalid.');
                                    return;
                                }
                                else if (bookingDTO.statusCode === bookingStatusCodes.ExistentActivePass) {
                                    this.sendHttpResponse(res, 400, 'The maximum simultaneously allowed laundry passes has been exceeded.');
                                    return;
                                }
                                else if (bookingDTO.statusCode === bookingStatusCodes.PassCountExceeded) {
                                    this.sendHttpResponse(res, 400, 'The maximum allowed laundry passes per month has been exceeded.');
                                    return;
                                }
                                else if (bookingDTO.statusCode === bookingStatusCodes.BookedPass) {
                                    this.sendHttpResponse(res, 400, 'The requested laundry pass is already booked.');
                                    return;
                                }
                                else if (bookingDTO.statusCode === bookingStatusCodes.LockedPass) {
                                    this.sendHttpResponse(res, 400, 'The requested laundry pass is being booked by someone else.');
                                    return;
                                }
                                else if (bookingDTO.statusCode === bookingStatusCodes.InvalidDate) {
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

        } catch (err) {
            this.logger.logException(err);
        }
    }
}

module.exports = BookingApi;

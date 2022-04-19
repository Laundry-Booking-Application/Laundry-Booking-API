'use strict';

const { check, validationResult } = require('express-validator');
const RequestHandler = require('./RequestHandler');
// const Validators = require('../../util/Validators');
const Authorization = require('./auth/Authorization');

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
             * This endpoint is only accessible by authenticated users.
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
                    // Validators.isPositiveWholeNumber(value, 'roomNumber');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                check('date').isString(),
                check('passRange').isString(),
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
             * This endpoint is only accessible by authenticated users.
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
                        const loggedInUserDTO = await Authorization.verifyAuthCookie(req);

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

        } catch (err) {
            this.logger.logException(err);
        }
    }
}

module.exports = BookingApi;

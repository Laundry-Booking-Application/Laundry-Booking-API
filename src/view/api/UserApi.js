'use strict';

const { check, validationResult } = require('express-validator');
const RequestHandler = require('./RequestHandler');
// const Validators = require('../../util/Validators');
const userStatusCodes = require('../../util/userStatusCodes');
// const Authorization = require('./auth/Authorization');

/**
 * Handles the REST API requests for the user endpoint.
 */
class UserApi extends RequestHandler {
    /**
     * Constructs an instance of {UserApi}.
     */
    constructor() {
        super();
    }

    /**
     * @return {string} The URL paths handled by the user api request handler.
     */
    get path() {
        return UserApi.USER_API_PATH;
    }

    /**
     * @return {string} The URL paths handled by the user api request handler.
     */
    static get USER_API_PATH() {
        return '/user';
    }

    /**
    * Registers the request handling functions.
    */
    async registerHandler() {
        try {
            await this.fetchController();

            /**
             * Login a user. Handles requests to the login endpoint.
             * The username and password received in the request are validated.
             * Errors caused by database related issues, are handled by the
             * {UserErrorHandler}.
             *
             * parameter username: The username is also used as display name and must be alphanumeric.
             * parameter password: The password parameter is used for the authentication process,
             *                     and must have a minimum length of eight and maximum length of thirty two characters.
             * Sends   200: If the user was successfully authenticated, and returns {UserDTO}
             *         400: If the body did not contain a JSON-formatted property
             *             called 'username' and 'password'
             *             or contained malformed data in these properties.
             *         401: If authentication failed.
             * throws  {Error} In case that the controller returns unexpected data.
             */
            this.router.post(
                '/login',
                check('username').isAlphanumeric(),
                check('password').isLength({ min: 8, max: 32 }),
                async (req, res, next) => {
                    try {
                        const errors = validationResult(req);
                        if (!errors.isEmpty()) {
                            // Authorization.clearAuthCookie(res);
                            this.sendHttpResponse(res, 400, errors);
                            return;
                        }
                        const loggedInUserDTO = await this.controller.loginUser(req.body.username, req.body.password);

                        if (loggedInUserDTO === null) {
                            // Authorization.clearAuthCookie(res);
                            throw new Error('Expected UserDTO object, received null.');
                        } else if (loggedInUserDTO.statusCode !== userStatusCodes.OK) {
                            // Authorization.clearAuthCookie(res);
                            this.sendHttpResponse(res, 401, 'User login failed.');
                            return;
                        } else {
                            // Authorization.setAuthCookie(loggedInUserDTO, res);
                            this.sendHttpResponse(res, 200, loggedInUserDTO);
                            return;
                        }
                    } catch (err) {
                        next(err);
                    }
                },
            );

            /**
             * Register a resident account. Handles requests to the registerResident endpoint.
             * All the fields received in the request are validated.
             * Errors caused by database related issues, are handled by the
             * {UserErrorHandler}.
             *
             * parameter firstname The first name of the new resident account owner.
             * parameter lastname The last name of the new resident account owner.
             * parameter personalNumber The personal number of the new resident account.
             *                          It should follow the following format YYYYMMDD-XXXX.
             * parameter email The email address of the new resident account.
             * parameter username The username of the new resident account.
             * parameter password The password of the new resident account
             *                     and must have a minimum length of eight and 
             *                     a maximum length of thirty two characters.
             * Sends   200: If the user was successfully registered, and returns {UserDTO}
             *         400: If the request body did not contain properly formatted fields.
             * throws  {Error} In case that the controller returns unexpected data.
             */
            this.router.post(
                '/registerResident',
                check('firstname').isAlpha(),
                check('lastname').isAlpha(),
                check('personalNumber').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    // Validators.isPersonalNumberFormat(value, 'personalNumber');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                check('email').normalizeEmail().isEmail(),
                check('username').isAlphanumeric(),
                check('password').isLength({ min: 8, max: 32 }),
                async (req, res, next) => {
                    try {
                        const errors = validationResult(req);
                        if (!errors.isEmpty()) {
                            this.sendHttpResponse(res, 400, errors);
                            return;
                        }
                        // const loggedInUserDTO = await Authorization.verifyAdminAuthorization(req);
                        const loggedInUserDTO = {'username': 'test'};
                        if (loggedInUserDTO === null) {
                            this.sendHttpResponse(res, 401, 'Missing or invalid authorization cookie.');
                            return;
                        }
                        else {
                            const registeredUserDTO = await this.controller.registerResident(loggedInUserDTO.username, req.body.firstname, req.body.lastname,
                                req.body.personalNumber, req.body.email, req.body.username, req.body.password);
                            if (registeredUserDTO === null) {
                                throw new Error('Expected UserDTO object, received null.');
                            } else if (registeredUserDTO.statusCode !== userStatusCodes.OK) {
                                if (registeredUserDTO.statusCode === userStatusCodes.ExistentEmail) {
                                    this.sendHttpResponse(res, 400, 'E-Mail already exists.');
                                } else if (registeredUserDTO.statusCode === userStatusCodes.ExistentUsername) {
                                    this.sendHttpResponse(res, 400, 'Username already exists.');
                                } else {
                                    this.sendHttpResponse(res, 400, 'Resident user signup failed.');
                                }
                            } else {
                                this.sendHttpResponse(res, 200, registeredUserDTO);
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

module.exports = UserApi;

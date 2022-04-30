'use strict';

const {body, validationResult} = require('express-validator');
const RequestHandler = require('./RequestHandler');
const Validators = require('../../util/Validators');
const userStatusCodes = require('../../util/userStatusCodes');
const Authorization = require('./auth/Authorization');

/**
 * Handles the REST API requests for the user endpoints.
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
             * Attempts to login a user.
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
                body('username').isAlphanumeric(),
                body('password').isLength({min: 8, max: 32}),
                async (req, res, next) => {
                    try {
                        const errors = validationResult(req);
                        if (!errors.isEmpty()) {
                            Authorization.clearAuthCookie(res);
                            this.sendHttpResponse(res, 400, errors);
                            return;
                        }
                        const loggedInUserDTO = await this.controller.loginUser(req.body.username, req.body.password);

                        if (loggedInUserDTO === null) {
                            Authorization.clearAuthCookie(res);
                            throw new Error('Expected UserDTO object, received null.');
                        } else if (loggedInUserDTO.statusCode !== userStatusCodes.OK) {
                            Authorization.clearAuthCookie(res);
                            this.sendHttpResponse(res, 401, 'User login failed.');
                            return;
                        } else {
                            Authorization.setAuthCookie(loggedInUserDTO, res);
                            this.sendHttpResponse(res, 200, loggedInUserDTO);
                            return;
                        }
                    } catch (err) {
                        next(err);
                    }
                },
            );

            /**
             * Registers a resident account.
             * All the fields received in the request are validated.
             * This endpoint is only accessible by administrators.
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
                body('firstname').isAlpha(),
                body('lastname').isAlpha(),
                body('personalNumber').custom((value) => {
                    // This will throw an AssertionError if the validation fails
                    Validators.isPersonalNumberFormat(value, 'personalNumber');
                    // Indicates the success of the custom validator check
                    return true;
                }),
                body('email').normalizeEmail().isEmail(),
                body('username').isAlphanumeric(),
                body('password').isLength({min: 8, max: 32}),
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
                                    this.sendHttpResponse(res, 400, 'Resident user registration failed.');
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

            /**
             * Lists all registered resident account information.
             * This endpoint is only accessible by administrators.
             * Errors caused by database related issues, are handled by the
             * {UserErrorHandler}.
             *
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains all registered resident account information.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.get(
                '/listUsers',
                async (req, res, next) => {
                    try {
                        const loggedInUserDTO = await Authorization.verifyAdminAuthorization(req);
                        if (loggedInUserDTO === null) {
                            this.sendHttpResponse(res, 401, 'Missing or invalid authorization cookie.');
                            return;
                        } else {
                            const userInfoDTO = await this.controller.listUsers(loggedInUserDTO.username);
                            if (userInfoDTO === null) {
                                throw new Error('Expected UserInfoDTO object, received null.');
                            } else {
                                this.sendHttpResponse(res, 200, userInfoDTO);
                                return;
                            }
                        }
                    } catch (err) {
                        next(err);
                    }
                },
            );

            /**
             * Deletes all information about the specified user and removes the user from the system.
             * This endpoint is only accessible by administrators.
             * Errors caused by database related issues, are handled by the
             * {UserErrorHandler}.
             *
             * parameter username The username of the account to be removed.
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains the deletion operation result.
             *         400: If the request body did not contain properly formatted fields.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.post(
                '/deleteUser',
                body('username').isAlphanumeric(),
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
                            const result = await this.controller.deleteUser(loggedInUserDTO.username, req.body.username);
                            if (result === null) {
                                throw new Error('Expected operation result boolean, received null.');
                            } else {
                                const resultObject = {'result': result};
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
             * Checks whether a user is logged in or not, by verifying the authentication cookie.
             *
             * Sends   200: If the request contained a valid authentication cookie, the response body
             *              contains the logged in user info.
             *         401: If the authentication cookie was missing or invalid.
             */
            this.router.get(
                '/checkLogin',
                async (req, res, next) => {
                    try {
                        const userDTO = await Authorization.verifyAuthCookie(req, res);
                        if (userDTO === null) {
                            Authorization.clearAuthCookie(res);
                            this.sendHttpResponse(res, 401, 'Missing or invalid authorization cookie.');
                            return;
                        } else {
                            this.sendHttpResponse(res, 200, userDTO);
                            return;
                        }
                    } catch (err) {
                        next(err);
                    }
                },
            );

            /**
             * Logs out a user by clearing the authentication cookie.
             *
             * Sends   200: If the authentication cookie was successfully cleared.
             */
            this.router.get(
                '/logout',
                async (req, res, next) => {
                    try {
                        Authorization.clearAuthCookie(res);
                        this.sendHttpResponse(res, 200, 'Logged out successfully.');
                        return;
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

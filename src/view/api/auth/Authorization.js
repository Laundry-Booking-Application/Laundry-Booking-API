'use strict';

const jwt = require('jsonwebtoken');
const privilege = require('../../../util/privilegeEnum');

/**
 * Handles user authorization,
 */
class Authorization {
    /**
     * The authentication/authorization cookie name.
     */
    static get AUTH_COOKIE_NAME() {
        return 'laundryAuth';
    }

    /**
     * Verifies the authentication of a user using the JWT token contained in the auth cookie.
     * The authentication cookie is also cleared in case of verification failure.
     *
     * @param {Request} req The express Request object.
     * @param {Response} res The express Response object.
     * @return {UserDTO | null} An object containing the username and the privilege of the user
     *                           or null in case of verification failure.
     */
    static async verifyAuthCookie(req, res) {
        const authCookie = req.cookies.laundryAuth;
        if (!authCookie) {
            return null;
        }
        try {
            const userDTOPayload = jwt.verify(authCookie, process.env.JWT_SECRET);
            const userDTO = userDTOPayload.userDTO;
            return userDTO;
        } catch (err) {
            res.clearCookie(this.AUTH_COOKIE_NAME);
            return null;
        }
    }

    /**
     * Verifies the authentication and authorization level of a user using
     * the JWT token contained in the auth cookie.
     * For the verification to succeed, the user privilege MUST be 'Standard'.
     *
     * @param {Request} req The express Request object.
     * @return {UserDTO | null} An object containing the username and the privilege of the user
     *                           or null in case of verification failure.
     */
    static async verifyStandardAuthorization(req) {
        const authCookie = req.cookies.laundryAuth;
        if (!authCookie) {
            return null;
        }
        try {
            const userDTOPayload = jwt.verify(authCookie, process.env.JWT_SECRET);
            const userDTO = userDTOPayload.userDTO;
            if (userDTO.privilegeID === privilege.Standard) {
                return userDTO;
            } else {
                return null;
            }
        } catch (err) {
            return null;
        }
    }

    /**
     * Verifies the authentication and authorization level of a user using
     * the JWT token contained in the auth cookie.
     * For the verification to succeed, the user privilege MUST be 'Administrator'.
     *
     * @param {Request} req The express Request object.
     * @return {UserDTO | null} An object containing the username and the privilege of the user
     *                           or null in case of verification failure.
     */
    static async verifyAdminAuthorization(req) {
        const authCookie = req.cookies.laundryAuth;
        if (!authCookie) {
            return null;
        }
        try {
            const userDTOPayload = jwt.verify(authCookie, process.env.JWT_SECRET);
            const userDTO = userDTOPayload.userDTO;
            if (userDTO.privilegeID === privilege.Administrator) {
                return userDTO;
            } else {
                return null;
            }
        } catch (err) {
            return null;
        }
    }


    /**
     * Sets the auth cookie containing the signed JSON Web Token
     * in the express response object.
     * Note: sameSite and secure cookie is required since the Express app
     *       is hosted on different host than the React WebApp
     *
     * @param {UserDTO} userDTO An object containing the username and the privilege of the user.
     * @param {Response} res The express Response object.
     */
    static setAuthCookie(userDTO, res) {
        const httpOnlyCookie = {httpOnly: true};
        const cookieAge = {maxAge: 7 * 24 * 60 * 60 * 1000}; // 1 Week (maxAge is in seconds, but in cookie it's in ms.)
        const sameSite = {sameSite: 'None'};
        // const secureCookie = {secure: true};
        const jwtToken = jwt.sign(
            {userDTO},
            process.env.JWT_SECRET,
            {
                expiresIn: '7 days',
            },
        );

        const cookieOptions = {
            ...httpOnlyCookie,
            ...cookieAge,
            ...sameSite,
            // ...secureCookie,
        };
        res.cookie(this.AUTH_COOKIE_NAME, jwtToken, cookieOptions);
    }

    /**
     * Clears auth cookie.
     * Note: sameSite and secure cookie is required since the Express app
     *       is hosted on different host than the React WebApp
     *
     * @param {Response} res The express Response object.
     */
    static clearAuthCookie(res) {
        const httpOnlyCookie = {httpOnly: true};
        const sameSite = {sameSite: 'None'};
        // const secureCookie = {secure: true};

        const cookieOptions = {
            ...httpOnlyCookie,
            ...sameSite,
            // ...secureCookie,
        };

        res.clearCookie(this.AUTH_COOKIE_NAME, cookieOptions);
    }
}

module.exports = Authorization;

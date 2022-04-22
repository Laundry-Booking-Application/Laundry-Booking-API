'use strict';
const LaundryDAO = require('../integration/LaundryDAO');
const UserDTO = require('../model/UserDTO');
const RegisterDTO = require('../model/RegisterDTO');

/**
 * The application's controller.
 * Only this class should communicate with the model and integration layers.
 */
class Controller {

    /**
     * Constructs an instance of {Controller}.
     * Also creates an instance of the {LaundryDAO}.
     */
    constructor() {
        this.laundryDAO = new LaundryDAO();
    }

    /**
     * Creates a new instance of the controller,
     * and establishes a connection to the database,
     * and returns the newly created instance of the controller.
     *
     * @return {Controller} The newly created controller.
     */
    static async createController() {
        const controller = new Controller();
        await controller.laundryDAO.establishConnection();

        return controller;
    }

    /**
     * Logs in a user. This method issues a call to the loginUser method in the {LaundryDAO},
     * which either returns a {UserDTO} with the result of the authentication or null in case of an error
     * while contacting the database.
     *
     * @param {string} username The username of the user which is logging in.
     * @param {string} password The password of the user which is logging in.
     * @return {UserDTO | null} The logged in user's UserDTO or null in case an error
     *                          while contacting the database.
     */
    async loginUser(username, password) {
        const userDTO = await this.laundryDAO.loginUser(username, password);
        return userDTO;
    }

    /**
     * Registers a resident account. 
     * This method issues a call to the registerNewResident method in the {LaundryDAO},
     * which either returns a {UserDTO} with the result of the registration or null in case of an error
     * while contacting the database.
     *
     * @param {String} issuerUsername The username of the user that issued the request.
     *                                The user that issued the request must be an administrator.
     * @param {String} firstName The first name of the new resident account owner.
     * @param {String} lastName The last name of the new resident account owner.
     * @param {String} personalNumber The personal number of the new resident account.
     *                                It should follow the following format YYYYMMDD-XXXX.
     * @param {String} email The email address of the new resident account.
     * @param {String} username The username of the new resident account.
     * @param {String} password The password of the new resident account.
     * @return {UserDTO | null} The registered user's UserDTO or null in case of an error
     *                          while contacting the database.
     */
    async registerResident(issuerUsername, firstName, lastName, personalNumber, email, username, password) {
        const registerDTO = new RegisterDTO(firstName, lastName, personalNumber, email, username, password);
        const userDTO = await this.laundryDAO.registerNewResident(issuerUsername, registerDTO);
        return userDTO;
    }

    /**
    * Lists all registered resident users. 
    * This method issues a call to the listUsers method in the {LaundryDAO},
    * which either returns a {UserInfoDTO} or null in case of an error
    * while contacting the database.
    *
    * @param {String} issuerUsername The username of the user that issued the request.
    *                                The user that issued the request must be an administrator.
    * @return {UserInfoDTO | null} The registered residents UserInfoDTO or null in case of an error
    *                          while contacting the database.
    */
    async listUsers(issuerUsername) {
        const userInfoDTO = await this.laundryDAO.listUsers(issuerUsername);
        return userInfoDTO;
    }

    /**
    * Deletes all information about the specified user and removes the user from the system.
    * This method issues a call to the deleteUser method in the {LaundryDAO},
    * which either returns true in case of success or false in case of an error 
    * while processing the operation, or null if an error occurs while contacting the database.
    *
    * @param {String} issuerUsername The username of the user that issued the request.
    *                                The user that issued the request must be an administrator.
    * @param {String} userToBeRemoved The username of the user that is to be removed from the system.
    * @return {boolean | null} The deletion operation result, true in case of success, false in case of failure
    *                          or null in case of an error while contacting the database.                     
    */
    async deleteUser(issuerUsername, userToBeRemoved) {
        const result = await this.laundryDAO.deleteUser(issuerUsername, userToBeRemoved);
        return result;
    }


    /**
    * Temporarily locks a specific laundry pass slot for an amount of time 
    * to allow the user to confirm their choice.
    * This method issues a call to the lockPass method in the {LaundryDAO},
    * which either returns true in case of success or false in case of an error 
    * while processing the operation, or null if an error occurs while contacting the database.
    *
    * @param {String} issuerUsername The username of the user that issued the request.
    *                                The user that issued the request must be a 'Standard' user.
    * @param {int} roomNumber The number related to the room chosen.
    * @param {string} date The date that the pass is going to be.
    * @param {string} passRange The time frame that the pass has.
    * @returns {boolean | null} true or false to give a confirmation of the locking attempt, 
    *                           or null in case of an error while contacting the database. 
    */
    async lockPass(issuerUsername, roomNumber, date, passRange) {
        const result = await this.laundryDAO.lockPass(issuerUsername, roomNumber, date, passRange);
        return result;
    }


    /**
    * Unlocks the temporarily locked laundry pass slot that the user had.
    * This method issues a call to the unlockPass method in the {LaundryDAO},
    * which either returns true in case of success or false in case of an error 
    * while processing the operation, or null if an error occurs while contacting the database.
    *
    * @param {String} issuerUsername The username of the user that issued the request.
    *                                The user that issued the request must be a 'Standard' user.
    * @returns {boolean | null} true or false to give a confirmation of the unlocking attempt, 
    *                           or null in case of an error while contacting the database. 
    */
    async unlockPass(issuerUsername) {
        const result = await this.laundryDAO.unlockPass(issuerUsername);
        return result;
    }

    /**
    * Books the chosen laundry pass for the user.
    * This method issues a call to the bookPass method in the {LaundryDAO},
    * Returns a {BookingDTO} that contains information about the booking attempt
    * or null in case of an error while contacting the database.
    *
    * @param {String} issuerUsername The username of the user that issued the request.
    *                                The user that issued the request must be a 'Standard' user.
    * @param {int} roomNumber The number related to the room chosen.
    * @param {string} date The date of the laundry pass.
    * @param {string} passRange The time frame that the pass has.
    * @returns {BookingDTO | null} The booking attempt result {BookingDTO}, 
    *                              or null in case of an error while contacting the database. 
    */
    async bookPass(issuerUsername, roomNumber, date, passRange) {
        const bookingDTO = await this.laundryDAO.bookPass(issuerUsername, roomNumber, date, passRange);
        return bookingDTO;
    }

    /**
    * Gets the active laundry pass of the provided user.
    * This method issues a call to the getBookedPass method in the {LaundryDAO},
    * Returns a {BookingDTO} that contains information about the active booking
    * or null in case of an error while contacting the database.
    *
    * @param {String} username The username related to the user.
    *                          The user that issued the request must be an authenticated user.
    * @returns {BookingDTO | null} A {BookingDTO} containing the booking information, 
    *                              or null in case of an error while contacting the database. 
    */
    async getBookedPass(username) {
        const bookingDTO = await this.laundryDAO.getBookedPass(username);
        return bookingDTO;
    }


    /**
    * Cancels an active laundry pass.
    * This method issues a call to the cancelBookedPass method in the {LaundryDAO},
    * Returns a {BookingDTO} that contains information about the booking attempt
    * or null in case of an error while contacting the database.
    *
    * @param {String} issuerUsername The username of the user that issued the request.
    *                                The user that issued the request must be an authenticated user.
    * @param {int} roomNumber The laundry room number.
    * @param {string} date The date that the active laundry pass is booked on.
    * @param {string} passRange The time frame that the pass has.
    * @returns {boolean | null} true or false to indicate whether the pass was cancelled or not, 
    *                           or null in case of an error while contacting the database. 
    */
     async cancelBookedPass(issuerUsername, roomNumber, date, passRange) {
        const cancellationResult = await this.laundryDAO.cancelBookedPass(issuerUsername, roomNumber, date, passRange);
        return cancellationResult;
    }

}

module.exports = Controller;

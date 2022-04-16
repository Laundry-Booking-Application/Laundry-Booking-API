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
     * which either returns a {UserDTO} with the result of the authentication or null in case of an error
     * while contacting the database.
     *
     * @param {String} issuerUsername The username of the user that issued the request.
     *                                The user that issued the request should be an administrator.
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


}

module.exports = Controller;

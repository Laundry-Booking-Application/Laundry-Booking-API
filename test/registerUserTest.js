'use strict';

const {assert} = require('chai');
const Controller = require('../src/controller/Controller');
const userStatusCodes = require('../src/util/userStatusCodes');
// eslint-disable-next-line no-unused-vars
const envLoader = require('./envLoader');
const DataGenerator = require('./DataGenerator');

describe('Register Resident User Account Test', () => {
    let controller;
    let residentUsername;
    let residentPersonalNumber;
    let residentEmail;
    const testUsername = 'unitTestRegisterUser';
    const adminUsername = 'testAdmin';

    before(async function() {
        /**
         * Creates an instance of the controller needed for testing and registers a test user.
         * @return {Controller} retController The newly instantiated controller.
         */
        async function prepareTest() {
            const retController = await Controller.createController();
            await DataGenerator.generateTestUser(retController, adminUsername, testUsername);
            residentUsername = 'unitTestResidentUser';
            residentPersonalNumber = await DataGenerator.randomPersonalNumber();
            residentEmail = residentUsername + '@test.se';
            return retController;
        }
        return prepareTest().then((retController) => {
            controller = retController;
        });
    });

    /**
     * Deletes the unit test user after last test in this block
     */
    after(async function() {
        await DataGenerator.deleteTestUser(controller, adminUsername, residentUsername);
        await DataGenerator.deleteTestUser(controller, adminUsername, testUsername);
    });


    it('should fail to register resident account due to lack of privilege', async () => {
        const userDTO = await controller.registerResident(testUsername, residentUsername, residentUsername, residentPersonalNumber, residentEmail, residentUsername, residentUsername);
        assert.strictEqual(userDTO.statusCode, userStatusCodes.InvalidPrivilege, 'Expected to fail to register resident account due to lack of privilege');
    });

    it('should succeed to register resident account as an administrator', async () => {
        const userDTO = await controller.registerResident(adminUsername, residentUsername, residentUsername, residentPersonalNumber, residentEmail, residentUsername, residentUsername);
        assert.strictEqual(userDTO.statusCode, userStatusCodes.OK, 'Expected to succeed to registering resident account as an administrator');
    });

    it('should fail to register resident account due to existent username', async () => {
        const testEmail = testUsername + '@test.se';
        const userDTO = await controller.registerResident(adminUsername, testUsername, testUsername, residentPersonalNumber, testEmail, testUsername, testUsername);
        assert.strictEqual(userDTO.statusCode, userStatusCodes.ExistentUsername, 'Expected to fail to register resident account due to existent username');
    });
});

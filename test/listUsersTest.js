'use strict';

const {assert} = require('chai');
const Controller = require('../src/controller/Controller');
const userInfoStatusCodes = require('../src/util/userInfoStatusCodes');
// eslint-disable-next-line no-unused-vars
const envLoader = require('./envLoader');
const DataGenerator = require('./DataGenerator');

describe('Fetch Users List Test', () => {
    let controller;
    const testUsername = 'unitTestListUser';
    const adminUsername = 'testAdmin';

    before(async function() {
        /**
         * Creates an instance of the controller needed for testing.
         * @return {Controller} retController The newly instantiated controller.
         */
        async function prepareTest() {
            const retController = await Controller.createController();
            await DataGenerator.generateTestUser(retController, adminUsername, testUsername);
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
        await DataGenerator.deleteTestUser(controller, adminUsername, testUsername);
    });

    it('should fail to get users list due to lack of privilege', async () => {
        const userInfoDTO = await controller.listUsers(testUsername);
        assert.isNotNull(userInfoDTO, 'An error has occurred while contacting the database');
        assert.strictEqual(userInfoDTO.statusCode, userInfoStatusCodes.InvalidPrivilege, 'Expected invalid privilege');
    });

    it('should succeed getting the users list', async () => {
        const userInfoDTO = await controller.listUsers(adminUsername);
        assert.isNotNull(userInfoDTO, 'An error has occurred while contacting the database');
        assert.strictEqual(userInfoDTO.statusCode, userInfoStatusCodes.OK, 'Expected success status code');
    });
});

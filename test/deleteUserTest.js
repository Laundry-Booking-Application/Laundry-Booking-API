'use strict';

const {assert} = require('chai');
const Controller = require('../src/controller/Controller');
// eslint-disable-next-line no-unused-vars
const envLoader = require('./envLoader');
const DataGenerator = require('./DataGenerator');

describe('Delete User Test', () => {
    let controller;
    const testUsername = 'unitTestDeleteUser';
    const adminUsername = 'testAdmin';

    before(async function() {
        /**
         * Creates an instance of the controller needed for testing and registers a test user.
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


    it('should fail to delete user due to lack of privilege', async () => {
        const deletionResult = await controller.deleteUser('firstTest', testUsername);
        assert.isNotNull(deletionResult, 'An error has occurred while contacting the database');
        assert.isFalse(deletionResult, 'Expected failure to delete user due to lack of privilege');
    });

    it('should fail to delete user because user does not exist', async () => {
        const deletionResult = await controller.deleteUser(adminUsername, 'NonExistentUser');
        assert.isNotNull(deletionResult, 'An error has occurred while contacting the database');
        assert.isFalse(deletionResult, 'Expected failure to delete user because user does not exist');
    });

    it('should succeed deleting the unit test user', async () => {
        const deletionResult = await controller.deleteUser(adminUsername, testUsername);
        assert.isNotNull(deletionResult, 'An error has occurred while contacting the database');
        assert.isTrue(deletionResult, 'Expected success in deleting the unit test user');
    });
});

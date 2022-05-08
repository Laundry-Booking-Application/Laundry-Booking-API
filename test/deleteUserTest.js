'use strict';

const {assert} = require('chai');
const Controller = require('../src/controller/Controller');
// eslint-disable-next-line no-unused-vars
const envLoader = require('./envLoader');

describe('Delete User', () => {
    let controller;

    before(async function() {
        /**
         * Creates an instance of the controller needed for testing and registers a test user.
         * @return {Controller} retController The newly instantiated controller.
         */
        async function prepareTest() {
            const retController = await Controller.createController();
            const issuerUsername = 'testAdmin';
            const firstName = 'unitTestUser';
            const lastName = 'unitTestUser';
            const personalNumber = '19710530-8659';
            const email = 'unitTestUser@unitTestUser.se';
            const username = 'unitTestUser';
            const password = 'unitTestUser#1337';
            await retController.registerResident(issuerUsername, firstName, lastName, personalNumber, email, username, password);
            return retController;
        }
        return prepareTest().then((retController) => {
            controller = retController;
        });
    });


    it('should fail to delete user due to lack of privilege', async () => {
        const deletionResult = await controller.deleteUser('firstTest', 'unitTestUser');
        assert.isNotNull(deletionResult, 'An error has occurred while contacting the database');
        assert.isFalse(deletionResult, 'Expected failure to delete user due to lack of privilege');
    });

    it('should fail to delete user because user does not exist', async () => {
        const deletionResult = await controller.deleteUser('testAdmin', 'NonExistentUser');
        assert.isNotNull(deletionResult, 'An error has occurred while contacting the database');
        assert.isFalse(deletionResult, 'Expected failure to delete user because user does not exist');
    });

    it('should succeed deleting the unit test user', async () => {
        const deletionResult = await controller.deleteUser('testAdmin', 'unitTestUser');
        assert.isNotNull(deletionResult, 'An error has occurred while contacting the database');
        assert.isTrue(deletionResult, 'Expected success in deleting the unit test user');
    });
});

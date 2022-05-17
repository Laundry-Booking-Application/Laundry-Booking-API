'use strict';

const {assert} = require('chai');
const Controller = require('../src/controller/Controller');
const scheduleStatusCodes = require('../src/util/scheduleStatusCodes');
// eslint-disable-next-line no-unused-vars
const envLoader = require('./envLoader');
const DataGenerator = require('./DataGenerator');

describe('Get Schedule Passes Test', () => {
    let controller;
    const testUsername = 'unitTestPassesUser';
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


    it('should fail to retrieve detailed pass schedule due to lack of privilege', async () => {
        const passScheduleDTO = await controller.getPasses(testUsername, 0);
        assert.strictEqual(passScheduleDTO.statusCode, scheduleStatusCodes.InvalidPrivilege, 'Expected to fail due to lack of privilege');
    });

    it('should succeed retrieving the resident pass schedule', async () => {
        const passScheduleDTO = await controller.getResidentPasses(testUsername, 0);
        assert.strictEqual(passScheduleDTO.statusCode, scheduleStatusCodes.OK, 'Expected to succeed retrieving the resident pass schedule');
    });

    it('should succeed retrieving detailed pass schedule as an administrator', async () => {
        const passScheduleDTO = await controller.getPasses(adminUsername, 0);
        assert.strictEqual(passScheduleDTO.statusCode, scheduleStatusCodes.OK, 'Expected to succeed retrieving detailed pass schedule as an administrator');
    });
});

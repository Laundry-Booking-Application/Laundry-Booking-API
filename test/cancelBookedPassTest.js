'use strict';

const {assert} = require('chai');
const Controller = require('../src/controller/Controller');
// eslint-disable-next-line no-unused-vars
const envLoader = require('./envLoader');
const DataGenerator = require('./DataGenerator');
const dayjs = require('dayjs');

describe('Cancel Booked Pass Test', () => {
    let controller;
    const testUsername = 'unitTestCancelUser';
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


    it('should fail to cancel inexistent booking', async () => {
        const yesterdayDate = dayjs().subtract(1, 'day').$d.toISOString().substring(0, 10);
        const cancellationResult = await controller.cancelBookedPass(testUsername, 1, yesterdayDate, '07-12');
        assert.isFalse(cancellationResult, 'Expected failure to cancel inexistent booking');
    });

    it('should succeed cancelling booked pass', async () => {
        const tomorrowDate = dayjs().add(1, 'day').$d.toISOString().substring(0, 10);
        // eslint-disable-next-line no-unused-vars
        const bookingDTO = await controller.bookPass(testUsername, 1, tomorrowDate, '07-12');
        const cancellationResult = await controller.cancelBookedPass(testUsername, 1, tomorrowDate, '07-12');
        assert.isTrue(cancellationResult, 'Expected success cancelling booked pass');
    });
});

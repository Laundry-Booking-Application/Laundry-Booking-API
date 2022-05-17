'use strict';

const {assert} = require('chai');
const Controller = require('../src/controller/Controller');
const bookingStatusCodes = require('../src/util/bookingStatusCodes');
// eslint-disable-next-line no-unused-vars
const envLoader = require('./envLoader');
const DataGenerator = require('./DataGenerator');
const dayjs = require('dayjs');

describe('Get Booked Pass Test', () => {
    let controller;
    const testUsername = 'unitTestBookedUser';
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


    it('should report no active booking found', async () => {
        const bookingDTO = await controller.getBookedPass(testUsername);
        assert.strictEqual(bookingDTO.statusCode, bookingStatusCodes.NoBooking, 'Expected to report that no active booking found');
    });

    it('should succeed fetching booked pass', async () => {
        const tomorrowDate = dayjs().add(1, 'day').$d.toISOString().substring(0, 10);
        // eslint-disable-next-line no-unused-vars
        const bookingDTO = await controller.bookPass(testUsername, 1, tomorrowDate, '07-12');
        const bookedPassInfo = await controller.getBookedPass(testUsername);
        assert.strictEqual(bookedPassInfo.statusCode, bookingStatusCodes.OK, 'Expected to succeed fetching booked pass');
    });
});

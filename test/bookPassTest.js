'use strict';

const {assert} = require('chai');
const Controller = require('../src/controller/Controller');
const bookingStatusCodes = require('../src/util/bookingStatusCodes');
// eslint-disable-next-line no-unused-vars
const envLoader = require('./envLoader');
const DataGenerator = require('./DataGenerator');
const dayjs = require('dayjs');

describe('Book Pass Test', () => {
    let controller;
    const testUsername = 'unitTestBookUser';
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


    it('should fail to book pass due to wrong date', async () => {
        const yesterdayDate = dayjs().subtract(1, 'day').$d.toISOString().substring(0, 10);
        const bookingDTO = await controller.bookPass(testUsername, 1, yesterdayDate, '07-12');
        assert.strictEqual(bookingDTO.statusCode, bookingStatusCodes.InvalidDate, 'Expected failure to book pass due to wrong date');
    });

    it('should fail to book pass due to wrong pass range', async () => {
        const tomorrowDate = dayjs().add(1, 'day').$d.toISOString().substring(0, 10);
        const bookingDTO = await controller.bookPass(testUsername, 1, tomorrowDate, '09-12');
        assert.strictEqual(bookingDTO.statusCode, bookingStatusCodes.InvalidPassInfo, 'Expected failure to book pass due to wrong pass range');
    });

    it('should fail to book pass because user does not exist', async () => {
        const tomorrowDate = dayjs().add(1, 'day').$d.toISOString().substring(0, 10);
        const bookingDTO = await controller.bookPass('NonExistentUser', 1, tomorrowDate, '07-12');
        assert.strictEqual(bookingDTO.statusCode, bookingStatusCodes.InvalidUser, 'Expected failure to book pass because user does not exist');
    });

    it('should succeed booking the pass', async () => {
        const tomorrowDate = dayjs().add(1, 'day').$d.toISOString().substring(0, 10);
        const bookingDTO = await controller.bookPass(testUsername, 1, tomorrowDate, '07-12');
        assert.strictEqual(bookingDTO.statusCode, bookingStatusCodes.OK, 'Expected success booking laundry pass');
    });
});

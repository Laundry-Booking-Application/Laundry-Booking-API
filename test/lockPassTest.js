'use strict';

const { assert } = require('chai');
const Controller = require('../src/controller/Controller');
// eslint-disable-next-line no-unused-vars
const envLoader = require('./envLoader');
const DataGenerator = require('./DataGenerator');
const dayjs = require('dayjs');

describe('Lock Pass Test', () => {
    let controller;

    before(async function () {
        /**
         * Creates an instance of the controller needed for testing and registers a test user.
         * @return {Controller} retController The newly instantiated controller.
         */
        async function prepareTest() {
            const retController = await Controller.createController();
            await DataGenerator.generateTestUser(retController, 'testAdmin', 'unitTestLockUser');
            return retController;
        }
        return prepareTest().then((retController) => {
            controller = retController;
        });
    });

    /**
     * Deletes the unit test user after last test in this block
     */
    after(async function () {
        await DataGenerator.deleteTestUser(controller, 'testAdmin', 'unitTestLockUser');
    });


    it('should fail to lock pass due to wrong date', async () => {
        const yesterdayDate = dayjs().subtract(1, 'day').$d.toISOString().substring(0, 10);
        const lockResult = await controller.lockPass('unitTestLockUser', 1, yesterdayDate, '07-12');
        assert.isFalse(lockResult, 'Expected failure to lock pass due to wrong date');
    });

    it('should fail to lock pass due to wrong pass range', async () => {
        const tomorrowDate = dayjs().add(1, 'day').$d.toISOString().substring(0, 10);
        const lockResult = await controller.lockPass('unitTestLockUser', 1, tomorrowDate, '09-12');
        assert.isFalse(lockResult, 'Expected failure to lock pass due to wrong pass range');
    });

    it('should succeed locking the pass', async () => {
        const tomorrowDate = dayjs().add(4, 'day').$d.toISOString().substring(0, 10);
        const lockResult = await controller.lockPass('unitTestLockUser', 1, tomorrowDate, '07-12');
        assert.isTrue(lockResult, 'Expected to succeed locking the pass');
    });



});

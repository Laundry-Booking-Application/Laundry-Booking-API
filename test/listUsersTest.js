'use strict';

const {assert} = require('chai');
const Controller = require('../src/controller/Controller');
const userInfoStatusCodes = require('../src/util/userInfoStatusCodes');
// eslint-disable-next-line no-unused-vars
const envLoader = require('./envLoader');

describe('Fetch Users List', () => {
    let controller;

    before(async function() {
        /**
         * Creates an instance of the controller needed for testing.
         * @return {Controller} retController The newly instantiated controller.
         */
        async function prepareTest() {
            const retController = await Controller.createController();
            return retController;
        }
        return prepareTest().then((retController) => {
            controller = retController;
        });
    });


    it('should fail to get users list due to lack of privilege', async () => {
        const userInfoDTO = await controller.listUsers('firstTest');
        assert.isNotNull(userInfoDTO, 'An error has occurred while contacting the database');
        assert.strictEqual(userInfoDTO.statusCode, userInfoStatusCodes.InvalidPrivilege, 'Expected invalid privilege');
    });

    it('should succeed getting the users list', async () => {
        const userInfoDTO = await controller.listUsers('testAdmin');
        assert.isNotNull(userInfoDTO, 'An error has occurred while contacting the database');
        assert.strictEqual(userInfoDTO.statusCode, userInfoStatusCodes.OK, 'Expected success status code');
    });
});

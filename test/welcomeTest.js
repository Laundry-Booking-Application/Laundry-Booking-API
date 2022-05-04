'use strict';

const {expect} = require('chai');
const request = require('supertest');
const initServer = require('./base');

describe('GET Welcome message', () => {
    let app;

    before(function() {
        return initServer().then((retApp) => {
            app = retApp;
        });
    });


    it('should respond with welcome message', async () => {
        return request(app)
            .get('/')
            .expect(200)
            .then((res) => {
                expect(res.text).to.be.eql('Welcome to the LaundryAPI');
            });
    });
});

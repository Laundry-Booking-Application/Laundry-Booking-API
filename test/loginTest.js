'use strict';

const {expect} = require('chai');
const request = require('supertest');
const initServer = require('./base');

describe('Login User', () => {
    let app;

    before(function() {
        return initServer().then((retApp) => {
            app = retApp;
        });
    });


    it('should fail login and return bad request', async () => {
        return request(app)
            .post('/user/login')
            .expect(400);
    });

    it('should fail login and return unauthorized', async () => {
        return request(app)
            .post('/user/login')
            .send({
                'username': 'firstTest',
                'password': 'wrongPassword',
            })
            .expect(401)
            .then((res) => {
                expect(res.body).to.be.eql({'error': 'User login failed.'});
            }); ;
    });

    it('should succeed login and return OK', async () => {
        return request(app)
            .post('/user/login')
            .send({
                'username': 'firstTest',
                'password': 'firstTest@1234',
            })
            .expect(200)
            .then((res) => {
                expect(res.body).to.be.eql({'success': {'username': 'firstTest', 'privilegeID': 2, 'statusCode': 0}});
            }); ;
    });
});

'use strict';

const express = require('express');
const Controller = require('../../controller/Controller');
// const Validators = require('../util/Validators');
const Logger = require('../../util/Logger');

/**
 * Superclass for the request handlers.
 */
class RequestHandler {
    /**
     * Constructs an instance of {RequestHandler}.
     * Also creates the router and logger.
     */
    constructor() {
        // eslint-disable-next-line new-cap
        this.router = express.Router();
        this.logger = new Logger('RequestHandler');
    }


    /**
     * The protocol part of the requests' url.
     */
    static get URL_PREFIX() {
        return 'http://';
    }


    /**
     * Creates an instance of the controller, and assigns it to the variable controller.
     */
    async fetchController() {
        this.controller = await Controller.createController();
    }

    /**
     * Sends an http response with the specified http status and body.
     * @param {Response} res The express Response object.
     * @param {number} status The status code of the response.
     * @param {any} body The body of the response.
     */
    sendHttpResponse(res, status, body) {
        // Validators.isIntegerBetween(status, 200, 503, 'status code');
        if (body === undefined) {
            res.status(status).end();
            return;
        }
        let jsonStatus = undefined;
        if (status < 400) {
            jsonStatus = 'success';
        } else {
            jsonStatus = 'error';
        }
        res.status(status).json({[jsonStatus]: body});
    }
}

module.exports = RequestHandler;

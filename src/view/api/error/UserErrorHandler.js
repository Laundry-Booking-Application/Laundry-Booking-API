'use strict';

const ErrorLogger = require('./ErrorLogger');

/**
 * Handles errors caused by the {UserApi} endpoints.
 */
class UserErrorHandler extends ErrorLogger {
    /**
   * Constructs a new instance of the {UserErrorHandler}, and passes the log filename
   * to the superclass.
   */
    constructor() {
        super('UserApi');
    }

    /**
   * @return {string} The URL paths handled by the error handler.
   */
    get path() {
        return '/user/';
    }

    /**
   * Registers the error handler
   * @param {Application} app The express application that will host the error handlers.
   */
    registerHandler(app) {
        app.use(this.path, (err, req, res, next) => {
            this.logger.logException(err);
            if (res.headersSent) {
                return next(err);
            }
            res.status(503).send({error: 'The user service is unavailable.'});
        });
    }
}

module.exports = UserErrorHandler;

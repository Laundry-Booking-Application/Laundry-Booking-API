'use strict';

const ErrorLogger = require('./ErrorLogger');

/**
 * Handles errors caused by the {BookingApi} endpoints.
 */
class BookingErrorHandler extends ErrorLogger {
    /**
   * Constructs a new instance of the {BookingErrorHandler}, and passes the log filename
   * to the superclass.
   */
    constructor() {
        super('BookingApi');
    }

    /**
   * @return {string} The URL paths handled by the error handler.
   */
    get path() {
        return '/booking/';
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
            res.status(503).send({ error: 'The booking service is unavailable.' });
        });
    }
}

module.exports = BookingErrorHandler;

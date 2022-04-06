'use strict';

const {createLogger, format, transports} = require('winston');

/**
 * Writes error logs to a file.
 */
class Logger {
    /**
     * Constructs an instance of the {Logger}.
     * @param {string} filename The name of the log file to write the errors to.
     */
    constructor(filename) {
        this.winstonLogger = createLogger({
            level: 'error',
            format: format.combine(
                format.errors({stack: true}),
                format.timestamp(),
                format.prettyPrint(),
            ),
            transports: [
                new (transports.File)({filename: `logs/${filename}.log`}),
                new transports.Console(),

            ],
        });
    }

    /**
     * Logs an error exception to the log file.
     * @param {Exception} exception The error exception to be logged
     */
    logException(exception) {
        this.winstonLogger.log({level: 'error', exception});
    }
}

module.exports = Logger;

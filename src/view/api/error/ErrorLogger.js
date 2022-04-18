'use strict';
const Logger = require('../../../util/Logger');

/**
 * The superclass for all other API error handlers.
 */
class ErrorLogger {
    /**
   * Constructs an instance of the {ErrorLogger}, and also creates an instance of the logger
   * to be used by subclasses.
   *
   * @param {string} filename The name of the log file to write the errors to.
   */
    constructor(filename) {
        this.logger = new Logger(filename);
    }
}

module.exports = ErrorLogger;

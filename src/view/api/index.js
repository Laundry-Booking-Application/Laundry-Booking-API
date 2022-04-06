'use strict';

/**
 * Loads all the request handlers
 */
class RequestHandlerLoader {
    /**
   * Constructs a new instance of the {RequestHandlerLoader}.
   */
    constructor() {
        this.reqHandlers = [];
        this.errorHandlers = [];
    }

    /**
   * Adds a new request handler.
   *
   * @param {RequestHandler} reqHandler The request handler to be added.
   */
    addRequestHandler(reqHandler) {
        this.reqHandlers.push(reqHandler);
    }

    /**
   * Adds a new error handler.
   *
   * @param {ErrorHandler} errorHandler The error handler to be added.
   */
    addErrorHandler(errorHandler) {
        this.errorHandlers.push(errorHandler);
    }


    /**
   * Loads all the request handlers into the specified express application.
   *
   * @param {Application} app The express application that will host the request handlers.
   */
    loadHandlers(app) {
        this.reqHandlers.forEach((reqHandler) => {
            reqHandler.registerHandler();
            app.use(reqHandler.path, reqHandler.router);
        });
    }

    /**
   * Loads all the error handlers into the specified express application.
   *
   * @param {Application} app The express application that will host the error handlers.
   */
    loadErrorHandlers(app) {
        this.errorHandlers.forEach((errorHandler) => {
            errorHandler.registerHandler(app);
        });
    }
}

const reqHandlerloader = new RequestHandlerLoader();


module.exports = reqHandlerloader;


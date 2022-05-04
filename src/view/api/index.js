'use strict';
const UserApi = require('./UserApi');
const BookingApi = require('./BookingApi');
const UserErrorHandler = require('./error/UserErrorHandler');
const BookingErrorHandler = require('./error/BookingErrorHandler');
const GeneralErrorHandler = require('./error/GeneralErrorHandler');

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
    async addRequestHandler(reqHandler) {
        this.reqHandlers.push(reqHandler);
    }

    /**
   * Adds a new error handler.
   *
   * @param {ErrorHandler} errorHandler The error handler to be added.
   */
    async addErrorHandler(errorHandler) {
        this.errorHandlers.push(errorHandler);
    }


    /**
   * Loads all the request handlers into the specified express application.
   *
   * @param {Application} app The express application that will host the request handlers.
   */
    async loadRequestHandlers(app) {
        for (const reqHandler of this.reqHandlers) {
            await reqHandler.registerHandler();
            await app.use(reqHandler.path, reqHandler.router);
        }
    }

    /**
   * Loads all the error handlers into the specified express application.
   *
   * @param {Application} app The express application that will host the error handlers.
   */
    async loadErrorHandlers(app) {
        for (const errorHandler of this.errorHandlers) {
            await errorHandler.registerHandler(app);
        }
    }
}

/**
 * Initializes and loads all the request and error handlers.
 * @param {Application} app The express application that will host the request and error handlers.
 */
async function initRequestHandlerLoader(app) {
    const requestHandlerLoader = new RequestHandlerLoader();
    await requestHandlerLoader.addRequestHandler(new UserApi());
    await requestHandlerLoader.addRequestHandler(new BookingApi());
    await requestHandlerLoader.addErrorHandler(new UserErrorHandler());
    await requestHandlerLoader.addErrorHandler(new BookingErrorHandler());
    await requestHandlerLoader.addErrorHandler(new GeneralErrorHandler());
    await requestHandlerLoader.loadRequestHandlers(app);
    await requestHandlerLoader.loadErrorHandlers(app);
}

module.exports = initRequestHandlerLoader;


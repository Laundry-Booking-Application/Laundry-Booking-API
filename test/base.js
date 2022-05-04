'use strict';

const path = require('path');
const APP_ROOT_DIR = path.join(__dirname, '..');

// eslint-disable-next-line no-unused-vars
const result = require('dotenv-safe').config({
    path: path.join(APP_ROOT_DIR, '.env'),
    example: path.join(APP_ROOT_DIR, '.env.example'),
    allowEmptyValues: true,
});

const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.use(express.static(path.join(APP_ROOT_DIR, 'public')));

const cors = require('cors');
app.use(cors({
    origin: process.env.CORS_HOST,
    credentials: true,
}));

app.set('etag', false);

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});


app.get('/', (req, res, next) => {
    try {
        return res.send('Welcome to the LaundryAPI');
    } catch (err) {
        next(err);
    }
});

/**
 * Initializes the Express server and registers all the routes, returns the express app to be used for testing.
 * This function differs from the server.js version, to fulfill the needs of the supertest package.
 * @return {Application} app The express application object.
 */
async function initServer() {
    const initRequestHandlerLoader = require('../src/view/api');
    await initRequestHandlerLoader(app);
    return app;
}


module.exports = initServer;

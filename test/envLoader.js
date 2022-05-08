'use strict';

const path = require('path');
const APP_ROOT_DIR = path.join(__dirname, '..');

// eslint-disable-next-line no-unused-vars
const result = require('dotenv-safe').config({
    path: path.join(APP_ROOT_DIR, '.env'),
    example: path.join(APP_ROOT_DIR, '.env.example'),
    allowEmptyValues: true,
});

module.exports = result;

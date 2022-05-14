/**
 * Used for manual usage if the need arises for generating certain data.
 */
'use strict';

const path = require('path');
const APP_ROOT_DIR = path.join(__dirname, '..');
const LaundryDAO = require('../src/integration/LaundryDAO');
const DataGenerator = require('./DataGenerator');

const result = require('dotenv-safe').config({
    path: path.join(APP_ROOT_DIR, '.env'),
    example: path.join(APP_ROOT_DIR, '.env.example'),
    allowEmptyValues: true,
});

/**
 * Prepare the database DAO and the data generator. 
 * @returns {DataGenerator} Object responsible for generating data.
 */
async function initiateApp() {
    const laundryDAO = new LaundryDAO();
    await laundryDAO.establishConnection();

    return new DataGenerator(laundryDAO, 'admin', 'test');
}

/**
 * Start the manual generations of data.
 */
async function start() {
    const dataGenerator = await initiateApp();
    /*
    const result = await dataGenerator.();
    console.log(result);
    */
}

start();
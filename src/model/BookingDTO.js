'use strict';

const Validators = require('../util/Validators');
/**
 * Representing the result of the booking.
 */
class BookingDTO {
    /**
     * Create an instance of the booking result.
     * @param {string} date The date that the pass is going to be.
     * @param {int} roomNumber The number related to the chosen room.
     * @param {string} passRange The time frame that the pass have.
     * @param {int} statusCode The code to indicate the status of the result process.
     *                         The codes can be found in the bookingStatusCodes.js
     */
    constructor(date, roomNumber, passRange, statusCode) {
        Validators.isDateFormat(date, 'Date');
        Validators.isNonNegativeNumber(roomNumber, 'Room Number');
        Validators.isPassRange(passRange, 'Pass Range');
        Validators.isNonNegativeNumber(statusCode, 'Status Code');
        this.date = date;
        this.roomNumber = roomNumber;
        this.passRange = passRange;
        this.statusCode = statusCode;
    }
}

module.exports = BookingDTO;

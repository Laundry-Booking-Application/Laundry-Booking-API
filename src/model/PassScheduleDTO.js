'use strict';

const Validators = require('../util/Validators');

/**
 * Represent the schedule of the laundry bookings for a specific week.
 */
class PassScheduleDTO {
    /**
     * Create an instance of the week schedule.
     * @param {int} weekNumber The week number for the schedule.
     * @param {int} roomCount The count of rooms that have slots for the users to book passes.
     * @param {[string]} weekDates The dates for the days in the week schedule.
     * @param { [{roomNum, passes}] } roomPasses The pass slots that relate to the specific room.
     * roomNum {int} The number related to the room.
     * passes { [PassDTO] } The information about the booking for each day in the specified week.
     * @param {int} statusCode The code that represent the status of the information,
     *                         which can be found in the scheduleStatusCodes.js.
     */
    constructor(weekNumber, roomCount, weekDates, roomPasses, statusCode) {
        Validators.isNonNegativeNumber(weekNumber, 'Week Number');
        Validators.isNonNegativeNumber(roomCount, 'Room Count');
        weekDates.forEach((weekDate) => Validators.isDateFormat(weekDate, 'Week Date'));
        roomPasses.forEach((roomPass) => Validators.isNonNegativeNumber(roomPass.roomNum, 'Room Number'));
        Validators.isNonNegativeNumber(statusCode, 'Status Code');
        this.weekNumber = weekNumber;
        this.roomCount = roomCount;
        this.weekDates = weekDates;
        this.roomPasses = roomPasses;
        this.statusCode = statusCode;
    }
}

module.exports = PassScheduleDTO;

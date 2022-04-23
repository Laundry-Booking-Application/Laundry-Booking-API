'use strict';

// const Validators = require('../util/Validators');

/**
 * Represent the schedule of the laundry bookings for a specific week.
 */
 class PassScheduleDTO {
    /**
     * Create an instance of the week schedule.
     * @param {int} weekNumber The week number for the schedule.
     * @param {int} roomCount The count of rooms that have slots for the users to book passes.
     * @param { [{roomNum, passes}] } roomPasses The pass slots that relate to the specific room.
     * roomNum {int} The number related to the room.
     * passes { [PassDTO] } The information about the booking for each day in the specified week.
     * @param {int} statusCode The code that represent the status of the information,
     *                         which can be found in the scheduleStatusCodes.js.
     */
    constructor(weekNumber, roomCount, roomPasses, statusCode) {
        this.weekNumber = weekNumber;
        this.roomCount = roomCount;
        this.roomPasses = roomPasses;
        this.statusCode = statusCode;
    }
}

module.exports = PassScheduleDTO;
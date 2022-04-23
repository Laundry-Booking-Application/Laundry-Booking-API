'use strict';

// const Validators = require('../util/Validators');

/**
 * Represent the pass slot information for a specific day.
 */
 class PassDTO {
    /**
     * Create an instance with the pass slot information.
     * @param {string} date The date that the pass is going to be.
     * @param {[ { range, status, username} ]} slots Array of the time frames that the pass has for the day.
     * range {string} The time frame specified for the slot.
     * status {string} The status of the slot.
     * username {string} The username related to the person if the slot is booked.
     */
    constructor(date, slots) {
        this.date = date;
        this.slots = slots;
    }
}

module.exports = PassDTO;
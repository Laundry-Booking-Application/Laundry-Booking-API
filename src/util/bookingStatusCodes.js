'use strict';

const bookingStatusCodes = {'OK': 0, 'InvalidUser': 1, 'InvalidPassInfo': 2, 'ExistentActivePass': 3, 'PassCountExceeded': 4, 'BookedPass': 5
                            , 'LockedPass': 6, 'InvalidDate': 7, 'NoBooking':8};

module.exports = bookingStatusCodes;
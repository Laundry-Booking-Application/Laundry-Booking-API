'use strict';

const bookingStatusCodes = {'OK': 0, 'InvalidUser': 1, 'InvalidPassInfo': 2, 'ExistentActivePass': 3, 'PassCountExceeded': 4, 'ExistentPass': 5
                            , 'LockedPass': 6, 'InvalidDate': 7};

module.exports = bookingStatusCodes;
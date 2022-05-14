'use strict';

const RegisterDTO = require('../src/model/RegisterDTO');

/**
 * Responsible for generating random data.
 */
class DataGenerator {
    /**
     * Create an instance of the generator.
     * @param {LaundryDAO} laundryDAO The instance of the DAO of the database.
     * @param {string} adminUsername A random administrator username.
     * @param {string} residentUsername A random resident username.
     */
    constructor(laundryDAO, adminUsername, residentUsername) {
        this.laundryDAO = laundryDAO;
        this.adminUsername = adminUsername;
        this.residentUsername = residentUsername;
        this.usernameLength = 10;
    }

    /**
     * Generate random resident users and add them to the database.
     * Note that the username is used for the password.
     * @param {int} userCount The count of users wanted to be generated.
     * @returns {string} Message to tell that the generation is done.
     */
    async residentUser(userCount) {
        for (let i = 0; i < userCount; i++) {
            const randUser = await this.randomUser();
            await this.laundryDAO.registerNewResident(this.adminUsername, randUser);
        }
        return 'Done';
    }

    /**
     * Generate random administrator users and add them to the database.
     * Note that the username is used for the password.
     * @param {int} userCount The count of users wanted to be generated.
     * @returns {string} Message to tell that the generation is done.
     */
    async administratorUser(userCount) {
        for (let i = 0; i < userCount; i++) {
            const randUser = await this.randomUser();
            await this.laundryDAO._registerNewAdministrator(randUser);
        }
        return 'Done';
    }

    /**
     * Generate a random user information.
     * @returns {RegisterDTO} Object with the random user information.
     */
    async randomUser() {
        const firstName = await this.randomName();
        const lastName = await this.randomName();
        const personalNumber = await this.randomPersonalNumber();
        const email = firstName + '.' + lastName + '@test.se';
        const username = await this.randomUsername();
        return new RegisterDTO(firstName, lastName, personalNumber, email, username, username);
    }

    /**
     * Generate random username, could contain characters and numbers.
     * @returns {string} The random generated username.
     */
    async randomUsername() {
        let username = '';

        for (let i = 0; i < this.usernameLength; i++) {
            username += await this.randomCharacter();
        }

        return username;
    }

    /**
     * Generate Random character. The characters could be english letters and numbers.
     * @returns {char} Random character.
     */
    async randomCharacter() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const randomChar = characters[Math.floor(Math.random() * characters.length)];
        return randomChar;
    }

    /**
     * Generate random name.
     * @returns {string} Random name.
     */
    async randomName() {
        const names = ['John', 'Wilson', 'Kyle', 'Butler', 'Alexis', 'Rollins', 'Danielle', 'Melton',
            'Matthew', 'Perez', 'David', 'Patrick', 'Christopher', 'Stephens', 'Felicia', 'Jackson',
            'Joseph', 'Gonzales', 'Deborah', 'Bryan', 'Osborne', 'Megan', 'Atkinson', 'Garcia',
            'Sharon', 'Mcfarland', 'Jason', 'Murphy', 'Matthew'];

        const randName = names[Math.floor(Math.random() * names.length)];
        return randName;
    }

    /**
     * Generate random swedish personal number of format YYYYMMDD-XXXX.
     * @returns {string} THe random personal number.
     */
    async randomPersonalNumber() {
        const date = await this.randomDate(new Date('1950-01-01'), new Date('2005-01-01'));
        let num = '';

        for (let i = 0; i < 3; i++) {
            num += await this.randomNum(0, 9);
        }

        let multiplier = 1;
        let sum = 0;
        const joinedString = date.concat(num).replaceAll('-', '').substring(2);
        for (let k = 0; k < 9; k++) {
            if (multiplier === 1) {
                multiplier = 2;
            } else {
                multiplier = 1;
            }

            sum += await this.numberCalc(multiplier, parseInt(joinedString[k]));
        }

        num += (10 - (sum % 10)) % 10;
        const dateSplit = date.split('-');
        const personalNumber = dateSplit[0] + dateSplit[1] + dateSplit[2] + '-' + num;

        return personalNumber;
    }

    /**
     * Generate a random date with format YYYY-MM-DD.
     * @param {Date} startDate The min value that the date would be.
     * @param {Date} endDate The max value that the date would be.
     * @returns {string} The random generated date.
     */
    async randomDate(startDate, endDate) {
        const randDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        return randDate.toISOString().substring(0, 10);
    }

    /**
     * Generate a random number between a certain range.
     * @param {int} min The mix value that the number would be.
     * @param {int} max The max value that the number would be.
     * @returns {int} THe random generated number.
     */
    async randomNum(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    async numberCalc(multiplier, number) {
        let calc = multiplier * number;
        if (calc >= 10) {
            calc = 1 + (calc % 10);
        }
        return calc;
    }

    /**
     * Make a booking for each resident users registered in the database. 
     * @returns {string} Message telling the generation is done.
     */
    async makeBookings() {
        const currentWeek = await this.laundryDAO.getWeekNumber();
        const residentUsers = await this.getResidentUsers();
        let emptyBookings = await this.getBookingsSlots(currentWeek);
        emptyBookings = emptyBookings.concat(await this.getBookingsSlots(currentWeek + 1));

        for (let i = 0; i < residentUsers.length; i++) {
            await this.laundryDAO.bookPass(residentUsers[i], emptyBookings[0].room, emptyBookings[0].date, emptyBookings[0].range);
            emptyBookings.shift();
        }

        return 'Done';
    }

    /**
     * Get a list of the registered resident username from the database.
     * @returns {[string]} List of registered resident username. 
     */
    async getResidentUsers() {
        const residentList = await this.laundryDAO.listUsers(this.adminUsername);
        if (residentList === null || residentList.statusCode !== 0) {
            return [];
        }

        let residentUsernames = [];
        residentList.personInfo.forEach(user => {
            residentUsernames.push(user.username);
        });

        return residentUsernames;
    }

    /**
     * Get the free booking slots for a specific week.
     * @param {string} week The number corresponding the current week or next one.
     * @returns {[{room, date, range}]} List of objects with the free space information.
     */
    async getBookingsSlots(week) {
        const currentDate = new Date().toISOString().substring(0, 10);
        const bookingSchedule = await this.laundryDAO.getResidentPasses(this.residentUsername, week);

        if (bookingSchedule === null || bookingSchedule.statusCode !== 0) {
            return [];
        }

        let emptyBookings = [];

        bookingSchedule.roomPasses.forEach(room => {
            room.passes.forEach(pass => {
                if (pass.date > currentDate) {
                    pass.slots.forEach(slot => {
                        if (slot.status == 'Available') {
                            emptyBookings.push({ room: room.roomNum, date: pass.date, range: slot.range})
                        }
                    });
                }
            });
        });

        return emptyBookings;
    }
}

module.exports = DataGenerator;
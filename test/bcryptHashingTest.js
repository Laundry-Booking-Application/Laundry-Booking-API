'use strict';

const bcrypt = require('bcrypt');
const {assert} = require('chai');
// eslint-disable-next-line no-unused-vars
const envLoader = require('./envLoader');
const crypto = require('crypto');

describe('Bcrypt Key Derivation Function Test', () => {
    let saltRounds;
    let plainPassword;

    before(function() {
        saltRounds = parseInt(process.env.SALT_ROUNDS, 10);
        plainPassword = crypto.randomBytes(32).toString('hex');
    });


    it('should succeed hashing and verifying a password.', async () => {
        const salt = await bcrypt.genSalt(saltRounds);
        const passwordHash = await bcrypt.hash(plainPassword, salt);
        const comparisonResult = await bcrypt.compare(plainPassword, passwordHash);
        assert.isTrue(comparisonResult, 'Expected successful hash verification');
    });

    it('should report verification failure of incorrect hash', async () => {
        const salt = await bcrypt.genSalt(saltRounds);
        const passwordHash = await bcrypt.hash(plainPassword, salt);
        const differentPlainPassword = crypto.randomBytes(32).toString('hex');
        const comparisonResult = await bcrypt.compare(differentPlainPassword, passwordHash);
        assert.isFalse(comparisonResult, 'Expected verification failure of incorrect hash');
    });
});

const functions = require('../../../structs/functions');

module.exports = async (req, res) => {
    const { discordId, username, email, password } = req.body;

    try {
        await functions.registerUser(discordId, username, email, password);
        res.json({ success: true, message: 'Account created successfully!' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.json({ success: false, message: 'Failed to create account' });
    }
};
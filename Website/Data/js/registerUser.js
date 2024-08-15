const functions = require('../../../structs/functions');

module.exports = async (req, res) => {
    const { discordId, username, email, password } = req.body;

    try {
        const result = await functions.registerUser(discordId, username, email, password);

        if (result.status === 200) {
            res.json({ success: true, message: result.message });
        } else {
            res.json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('Error registering user:', error);
        res.json({ success: false, message: 'Failed to create account.' });
    }
};
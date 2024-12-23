const axios = require('axios');
const log = require("../../../structs/log.js");
const User = require('../../../model/user.js');

module.exports = (DISCORD_API_URL, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI) => async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.json({
            "error": "Invalid oauth code provided."
        })
    }

    try {
        const tokenResponse = await axios.post(`${DISCORD_API_URL}/oauth2/token`, new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            scope: 'identify'
        }));

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get(`${DISCORD_API_URL}/users/@me`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const discordId = userResponse.data.id;
        const username = userResponse.data.username;

        const userExists = await User.findOne({ discordId: discordId });

        if (userExists) {
            res.redirect(`/account-exists?discordId=${discordId}&username=${username}`);
        } else {
            res.redirect(`/register?discordId=${discordId}&username=${username}`);
        }
    } catch (err) {
        log.error('Error during Discord OAuth2:', err);
        return res.json({
            "error": "Authentication failed"
        })
    }
};
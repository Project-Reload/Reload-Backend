const express = require("express");
const app = express.Router();
const User = require("../model/user.js");
const log = require("../structs/log.js");
const bcrypt = require("bcrypt");

//Api for launcher login (If u want a POST requesto just replace "app.get" to "app.post" and "req.query" to "req.body")
app.get("/api/launcher/login", async (req, res) => {
    const { email, password } = req.query;

    if (!email) return res.status(400).send('The email was not entered.');
    if (!password) return res.status(400).send('The password was not entered.');

    try {
        const user = await User.findOne({ email: email });
        if (!user) return res.status(404).send('User not found.');

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            const username = user.username;

            return res.status(200).json({
                username: username,
            });
        } else {
            return res.status(400).send('Error!');
        }
    } catch (err) {
        log.error('Launcher Api Error:', err);
        return res.status(500).send('Error encountered, look at the console');
    }
});

module.exports = app;
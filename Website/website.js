module.exports = function(websiteApp) {
    const express = require("express");
    const path = require("path");
    const config = require("../Config/config.json");

    const DISCORD_API_URL = 'https://discord.com/api';
    const CLIENT_ID = config.Website.clientId;
    const CLIENT_SECRET = config.Website.clientSecret;
    const REDIRECT_URI = config.Website.redirectUri.replace("${websiteport}", config.Website.websiteport);

    websiteApp.use(express.json());
    websiteApp.use(express.urlencoded({ extended: true }));
    
    websiteApp.use('/Images', express.static(path.join(__dirname, './Data/Images')));
    websiteApp.use('/css', express.static(path.join(__dirname, './Data/css')));
    websiteApp.use('/html', express.static(path.join(__dirname, './Data/html')));

    websiteApp.get('/', (req, res) => {
        res.redirect('/login');
    });

    websiteApp.get('/login', (req, res) => {
        const authURL = `${DISCORD_API_URL}/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;

        res.redirect(authURL);
    });

    const oauthCallback = require('./Data/js/oauthCallback')(DISCORD_API_URL, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    websiteApp.get('/oauth2/callback', oauthCallback);

    websiteApp.post('/register-user', require('./Data/js/registerUser.js'));

    websiteApp.get('/register', (req, res) => {
        res.sendFile(path.join(__dirname, './Data/html/register.html'));
    });

    websiteApp.get('/account-exists', (req, res) => {
        res.sendFile(path.join(__dirname, './Data/html/accountExists.html'));
    });
};

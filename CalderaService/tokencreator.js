const jwt = require("jsonwebtoken");

const guids = require("./guids.json")

const config = require('../Config/config.js');

var CalderaGenerated = 0;

function createCaldera(accountId) {
    let CalderaToken = jwt.sign({
        "account_id": accountId,
        "generated": CalderaGenerated =+ 1,
        "calderaGuid": guids[config.bGameVersion],
        "acProvider": "none",
        "notes": "",
        "fallback": false
    }, global.JWT_SECRET );

    return CalderaToken
}

module.exports = { createCaldera }
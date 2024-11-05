const jwt = require("jsonwebtoken");
const fs = require("fs");

const guids = require("./guids.json")

const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());

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
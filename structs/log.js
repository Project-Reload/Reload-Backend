const fs = require("fs");
const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());

function backend(...args) {
    let msg = args.join(" ");
    console.log(`\x1b[32mReload Backend Log\x1b[0m: ${msg}`);
}

function bot(...args) {
    let msg = args.join(" ");
    console.log(`\x1b[33mReload Bot Log\x1b[0m: ${msg}`);
}

function xmpp(...args) {
    let msg = args.join(" ");
    console.log(`\x1b[34mReload Xmpp Log\x1b[0m: ${msg}`);
}

function error(...args) {
    let msg = args.join(" ");
    console.log(`\x1b[31mReload Error Log\x1b[0m: ${msg}`);
}

function debug(...args) {
    if (config.bEnableDebugLogs === true) {
        let msg = args.join(" ");
        console.log(`\x1b[35mReload Debug Log\x1b[0m: ${msg}`);
    }
}

function website(...args) {
    let msg = args.join(" ");
    console.log(`\x1b[36mReload Website Log\x1b[0m: ${msg}`);
}

function AutoRotation(...args) {
    if (config.bEnableAutoRotateDebugLogs === true) {
        let msg = args.join(" ");
        console.log(`\x1b[36mReload AutoRotation Debug Log\x1b[0m: ${msg}`);
    }
}

module.exports = {
    backend,
    bot,
    xmpp,
    error,
    debug,
    website,
    AutoRotation
};
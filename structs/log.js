function backend() {
    let msg = "";

    for (let i in backend.arguments) {
        msg += `${i == "0" ? "" : " "}${backend.arguments[i]}`;
    }

    console.log(`\x1b[32mReload Backend Log\x1b[0m: ${msg}`);
}

function bot() {
    let msg = "";

    for (let i in bot.arguments) {
        msg += `${i == "0" ? "" : " "}${bot.arguments[i]}`;
    }

    console.log(`\x1b[33mReload Bot Log\x1b[0m: ${msg}`);
}

function xmpp() {
    let msg = "";

    for (let i in xmpp.arguments) {
        msg += `${i == "0" ? "" : " "}${xmpp.arguments[i]}`;
    }

    console.log(`\x1b[34mReload Xmpp Log\x1b[0m: ${msg}`);
}

function error() {
    let msg = "";

    for (let i in error.arguments) {
        msg += `${i == "0" ? "" : " "}${error.arguments[i]}`;
    }

    console.log(`\x1b[31mReload Error Log\x1b[0m: ${msg}`);
}

module.exports = {
    backend,
    bot,
    xmpp,
    error
}
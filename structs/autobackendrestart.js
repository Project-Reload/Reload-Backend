const { exec } = require("child_process");
const log = require("../structs/log.js");

function parseRestartTime(restartTime) {
    const match = restartTime.match(/^(\d+)([ywdhms])$/);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    let milliseconds;
    switch (unit) {
        case 'y': milliseconds = value * 365 * 24 * 60 * 60 * 1000; break;
        case 'M': milliseconds = value * 30.44 * 24 * 60 * 60 * 1000; break;
        case 'w': milliseconds = value * 7 * 24 * 60 * 60 * 1000; break;
        case 'd': milliseconds = value * 24 * 60 * 60 * 1000; break;
        case 'h': milliseconds = value * 60 * 60 * 1000; break;
        case 'm': milliseconds = value * 60 * 1000; break;
        case 's': milliseconds = value * 1000; break;
        default: return null;
    }

    return milliseconds;
}

function formatTime(milliseconds) {
    const seconds = Math.floor((milliseconds / 1000) % 60);
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);
    const days = Math.floor((milliseconds / (1000 * 60 * 60 * 24)) % 30);
    const months = Math.floor((milliseconds / (1000 * 60 * 60 * 24 * 30.44)) % 12);
    const years = Math.floor(milliseconds / (1000 * 60 * 60 * 24 * 365));

    let timeString = '';
    if (years > 0) timeString += `${years} year${years > 1 ? 's' : ''}, `;
    if (months > 0) timeString += `${months} month${months > 1 ? 's' : ''}, `;
    if (days > 0) timeString += `${days} day${days > 1 ? 's' : ''}, `;
    if (hours > 0) timeString += `${hours} hour${hours > 1 ? 's' : ''}, `;
    if (minutes > 0) timeString += `${minutes} minute${minutes > 1 ? 's' : ''}, `;
    if (seconds > 0) timeString += `${seconds} second${seconds > 1 ? 's' : ''}`;

    return timeString.trim().replace(/,([^,]*)$/, ' and$1');
}

function scheduleRestart(restartTime) {
    const restartDelay = parseRestartTime(restartTime);
    if (!restartDelay) {
        log.error("Invalid 'bRestartTime' format");
        return;
    }

    const formattedTime = formatTime(restartDelay);
    log.autobackendrestart(`The backend will restart in ${formattedTime}`);

    if (restartDelay > 10000) {
        setTimeout(() => {
            log.autobackendrestart("The backend will restart shortly...");
        }, restartDelay - 10000);
    } else {
        setTimeout(() => {
            log.autobackendrestart("The backend will restart shortly...");
        }, restartDelay);
    }

    setTimeout(() => {
        console.clear();

        exec("node index.js", (error, stdout, stderr) => {
            if (error) {
                log.error(`Error restarting backend: ${error.message}`);
                return;
            }
            log.autobackendrestart("Backend restarted successfully");
        });

        process.exit(0);
    }, restartDelay);
}

module.exports = { scheduleRestart };
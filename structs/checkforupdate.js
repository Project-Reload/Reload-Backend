const log = require("../structs/log.js");
const fetch = require("node-fetch");

class CheckForUpdate {
    static async checkForUpdate(currentVersion) {
        const packageJson = await fetch('https://raw.githubusercontent.com/Project-Reload/Reload-Backend/refs/heads/main/package.json')
            .then(res => res.json());

        const latestVersion = packageJson.version.replace(/\./g, "");
        const currentVersionFormatted = currentVersion.replace(/\./g, "");

        if (parseFloat(latestVersion) > parseFloat(currentVersionFormatted)) {
            log.checkforupdate(`A new version of the Backend has been released! ${currentVersion} -> ${packageJson.version}, Download it from the GitHub repo.`);
        }
    }
}

module.exports = CheckForUpdate;
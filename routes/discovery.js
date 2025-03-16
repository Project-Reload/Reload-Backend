const Express = require("express");
const app = Express.Router();
const discovery = require("./../responses/Discovery/discovery_frontend.json");
const functions = require("./../structs/functions.js");

app.post("*/api/v2/discovery/surface/*", async (req, res) => {
    res.json(discovery);
});

app.post("*/discovery/surface/*", async (req, res) => {
    res.json(discovery);
})

app.get("/fortnite/api/discovery/accessToken/:branch", async (req, res) => {
    res.json({
        "branchName": req.params.branch,
        "appId": "Fortnite",
        "token": functions.MakeID()
    });
});

app.post("/links/api/fn/mnemonic", async (req, res) => {
    var MnemonicArray = [];

    for (var i in discovery.Panels[0].Pages[0].results) {
        MnemonicArray.push(discovery.Panels[0].Pages[0].results[i].linkData)
    }

    res.json(MnemonicArray);
})

app.get("/links/api/fn/mnemonic/:playlist/related", async (req, res) => {
    var response = {
        "parentLinks": [],
        "links": {}
    };

    if (req.params.playlist) {
        for (var i in discovery.Panels[0].Pages[0].results) {
            var linkData = discovery.Panels[0].Pages[0].results[i].linkData;
            if (linkData.mnemonic == req.params.playlist) {
                response.links[req.params.playlist] = linkData;
            }
        }        
    }    

    res.json(response);
})

app.get("/links/api/fn/mnemonic/*", async (req, res) => {
    for (var i in discovery.Panels[0].Pages[0].results) {
        if (discovery.Panels[0].Pages[0].results[i].linkData.mnemonic == req.url.split("/").slice(-1)[0]) {
            res.json(discovery.Panels[0].Pages[0].results[i].linkData);
        }
    }
})

module.exports = app;
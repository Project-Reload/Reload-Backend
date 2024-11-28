const express = require("express");
const app = express.Router();
const functions = require("../structs/functions.js");

app.get("/content/api/pages/fortnite-game/spark-tracks", async (req, res) => {
    const sparkTracks = require("./../responses/sparkTracks.json");

    res.json(sparkTracks)
})

app.get("/content/api/pages/*", async (req, res) => {
    const contentpages = functions.getContentPages(req);

    res.json(contentpages);
});

app.post("/api/v1/fortnite-br/surfaces/motd/target", async (req, res) => {
    const motdTarget = JSON.parse(JSON.stringify(require("./../responses/motdTarget.json")));

    try {
        motdTarget.contentItems.forEach(item => {
            item.contentFields.title = item.contentFields.title[req.body.language];
            item.contentFields.body = item.contentFields.body[req.body.language];
        })
    } catch (err) {}

    res.json(motdTarget)
})

module.exports = app;
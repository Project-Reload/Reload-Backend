// routes/motd.js
const express = require("express");
const router = express.Router();

// POST /api/v1/fortnite-br/surfaces/motd/interactions
router.post("/api/v1/fortnite-br/surfaces/motd/interactions", (req, res) => {
    console.log("[MOTD] Interaction received:", req.body);

    // Epic általában üres 204-et vár
    res.status(204).send();
});

module.exports = router;

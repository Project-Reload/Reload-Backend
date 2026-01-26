// routes/friendsRecent.js
const express = require("express");
const router = express.Router();

// GET /friends/api/v1/:accountId/recent/fortnite
router.get("/friends/api/v1/:accountId/recent/fortnite", (req, res) => {
    const accountId = req.params.accountId;

    // Dummy recent players lista (üresen is működik)
    res.json({
        accountId: accountId,
        recentPlayers: []
    });
});

module.exports = router;

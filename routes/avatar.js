// routes/avatar.js
const express = require("express");
const router = express.Router();

// GET /v1/avatar/fortnite/ids
router.get("/v1/avatar/fortnite/ids", (req, res) => {
    const ids = req.query.accountIds?.split(",") || [];

    const avatars = ids.map(id => ({
        accountId: id,
        avatarUrl: "https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/profile/avatar/default"
    }));

    res.json(avatars);
});

module.exports = router;

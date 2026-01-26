const express = require("express");
const router = express.Router();

// GET /fortnite/api/game/v2/creative/favorites/:accountId
router.get("/fortnite/api/game/v2/creative/favorites/:accountId", (req, res) => {
    const { accountId } = req.params;
    const { limit } = req.query;

    console.log(`[CREATIVE] Favorites request for ${accountId}, limit=${limit}`);

    // Fortnite empty listet is elfogad
    return res.json({
        favorites: []
    });
});

module.exports = router;

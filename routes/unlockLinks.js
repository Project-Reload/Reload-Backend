const express = require("express");
const router = express.Router();

// ================================
// UNLOCK LINKS STUB
// ================================
router.get("/api/v1/links/unlock/:accountId", (req, res) => {
    const { accountId } = req.params;
    const { limit, ratingAuthority, rating } = req.query;

    console.log(`[UnlockLinks] GET called for account: ${accountId}, limit: ${limit}, ratingAuthority: ${ratingAuthority}, rating: ${rating}`);

    // Visszaadunk egy üres listát, vagy igény szerint mockolt unlock adatot
    res.json({
        accountId: accountId,
        unlockedLinks: [], // üres tömb, vagy ide tehetsz mock adatot
        limit: parseInt(limit) || 0,
        ratingAuthority: ratingAuthority || null,
        rating: rating || null,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

module.exports = router;

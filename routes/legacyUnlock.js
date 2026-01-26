const express = require("express");
const router = express.Router();

// ================================
// LEGACY UNLOCK STUB
// ================================
router.delete("/api/v1/links/legacy-unlock/:accountId", (req, res) => {
    const { accountId } = req.params;

    // Csak logoljuk, de nem végzünk tényleges unlockot
    console.log(`[LegacyUnlock] DELETE called for account: ${accountId}`);

    // Visszaadjuk, hogy sikeres volt
    res.json({
        accountId: accountId,
        unlocked: true,  // mindig sikeres
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

module.exports = router;

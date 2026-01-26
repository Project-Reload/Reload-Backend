const express = require("express");
const router = express.Router();

// ================================
// VERIFY PIN STUB
// ================================
router.post("/content-controls/:accountId/verify-pin", (req, res) => {
    const { accountId } = req.params;
    const { pin } = req.body;

    // Csak logoljuk, de nem csinálunk valódi ellenőrzést
    console.log(`[ContentControls] Verify PIN called for account: ${accountId}, pin: ${pin}`);

    // Visszaadjuk, hogy sikeres volt
    res.json({
        accountId: accountId,
        pinVerified: true,  // mindig sikeres
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

module.exports = router;

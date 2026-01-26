const express = require("express");
const router = express.Router();

// GET /content-controls/:accountId/rules/namespaces/fn
router.get("/content-controls/:accountId/rules/namespaces/fn", (req, res) => {
    const { accountId } = req.params;

    console.log(`[CONTENT-CONTROLS] Rules requested for ${accountId}`);

    return res.json({
        accountId: accountId,
        namespaces: {
            fn: {
                restrictions: [],
                version: 1
            }
        },
        updatedAt: new Date().toISOString()
    });
});

module.exports = router;

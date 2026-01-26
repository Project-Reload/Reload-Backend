const express = require("express");
const router = express.Router();

// POST /content-controls/{accountId}/rules/namespaces/fn
router.post("/content-controls/:accountId/rules/namespaces/fn", (req, res) => {
    console.log(`[CONTENT RULES] Request for ${req.params.accountId}`);

    res.json({
        namespace: "fn",
        rules: {
            "ageRating": {
                enabled: false,
                value: "UNRESTRICTED"
            },
            "chat": {
                enabled: true
            },
            "ugc": {
                enabled: true
            }
        },
        updatedAt: new Date().toISOString()
    });
});

module.exports = router;

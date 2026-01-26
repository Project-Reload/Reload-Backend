const express = require("express");
const router = express.Router();

/*
|--------------------------------------------------------------------------
| LINKS HISTORY
|--------------------------------------------------------------------------
| GET /api/v1/links/history/:accountId?limit=30
*/
router.get("/api/v1/links/history/:accountId", (req, res) => {
    res.json({
        links: [],
        accountId: req.params.accountId,
        limit: Number(req.query.limit) || 30
    });
});

/*
|--------------------------------------------------------------------------
| LFG SETTINGS
|--------------------------------------------------------------------------
| PATCH /api/v1/lfg/Fortnite/users/:accountId/settings
*/
router.patch("/api/v1/lfg/Fortnite/users/:accountId/settings", (req, res) => {
    res.json({
        accountId: req.params.accountId,
        settings: req.body || {},
        updated: true
    });
});

/*
|--------------------------------------------------------------------------
| BR INVENTORY (VERY IMPORTANT STUB)
|--------------------------------------------------------------------------
| GET /fortnite/api/game/v2/br-inventory/account/:accountId
*/
router.get("/fortnite/api/game/v2/br-inventory/account/:accountId", (req, res) => {
    res.json({
        accountId: req.params.accountId,
        inventory: {
            currency: [],
            items: []
        }
    });
});

module.exports = router;

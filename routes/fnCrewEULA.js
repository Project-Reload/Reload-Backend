const express = require("express");
const router = express.Router();

// GET /eulatracking/api/shared/agreements/fn-crew-terms
router.get("/eulatracking/api/shared/agreements/fn-crew-terms", (req, res) => {
    console.log("[EULA] Crew terms requested");

    const locale = req.query.locale || "en";

    return res.json({
        key: "fn-crew-terms",
        version: 1,
        locale: locale,
        content: "By using this Fortnite private backend, you agree to nothing. This is a fake EULA for private server use.",
        accepted: true,
        acceptedDate: new Date().toISOString()
    });
});

module.exports = router;

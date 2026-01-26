const express = require("express");
const router = express.Router();

// POST /publickey/v1/publickey/
router.post("/publickey/v1/publickey/", (req, res) => {
    console.log("[PUBLICKEY] Client requested public key");

    return res.json({
        "key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArandomfakekeyfortnitebackend1234567890ABCD\n-----END PUBLIC KEY-----",
        "algorithm": "RS256",
        "expires_at": "2099-01-01T00:00:00Z"
    });
});

module.exports = router;

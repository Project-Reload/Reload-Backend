const express = require("express");
const router = express.Router();

/* helpers */
const ok = (req, res) => res.status(200).json({});
const noContent = (req, res) => res.sendStatus(204);

/* =========================
   CLIENT FEEDBACK / LOG UPLOAD
   (urlencoded path miatt wildcard!)
========================= */

router.get(
  "/api/v1/access/fortnite/client-feedback*",
  noContent
);

/* =========================
   PROFILES (PUT /profiles)
========================= */

router.put("/profiles", noContent);

/* =========================
   FORTNITE TRACKS
========================= */

router.get(
  "/api/v1/games/fortnite/tracks/query",
  (req, res) => {
    res.json({
      tracks: []
    });
  }
);

/* =========================
   TAGS
========================= */

router.get("/api/v1/public/tags", (req, res) => {
  res.json({
    tags: []
  });
});

/* =========================
   BLURL FILES (dynamic hash path)
========================= */

router.get("/:hash/master.blurl", noContent);
router.get("/:hash/main.blurl", noContent);

/* =========================
   SAFETY NET (optional)
   only for weird FN GETs
========================= */

// router.get("*", noContent);

module.exports = router;

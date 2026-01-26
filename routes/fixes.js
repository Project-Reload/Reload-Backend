const express = require("express");
const app = express.Router();

/**
 * Helper: empty OK responses
 */
const ok = (req, res) => res.status(200).json({});
const noContent = (req, res) => res.sendStatus(204);
const accepted = (req, res) => res.sendStatus(202);

/* =========================
   DATAROUTER / TELEMETRY
========================= */

// basic datarouter
app.post("/datarouter/api/v1/public/data", accepted);

// FN client event stream
app.post("/datarouter/api/v1/public/data/clients", accepted);

// EOS / SDK telemetry (note the /telemetry/data prefix)
app.post("/telemetry/data/datarouter/api/v1/public/data", accepted);

/* =========================
   HOTCONFIG / CONTENT
========================= */

app.get("/hotconfigs/v2/livefn.json", (req, res) => {
  res.json({
    version: 1,
    configs: {}
  });
});

app.get("/api/content/v2/launch-data", ok);

/* =========================
   PROFILE / USER PREFS
========================= */

app.put("/profile/play_region", noContent);
app.put("/profile/languages", noContent);
app.put("/profile/privacy_settings", noContent);

/* =========================
   SOCIAL / FRIENDS
========================= */

app.get("/epic/friends/v1/:accountId/blocklist", (req, res) => {
  res.json({ blocked: [] });
});

app.get("/content-controls/:accountId", ok);

app.get("/party/api/v1/Fortnite/user/:accountId/settings/privacy", ok);

/* =========================
   INTERACTIONS (SOCIAL FEED)
========================= */

app.get("/api/v2/interactions/latest/Fortnite/:accountId", (req, res) => {
  res.json({ entries: [] });
});

app.get("/api/v2/interactions/aggregated/Fortnite/:accountId", (req, res) => {
  res.json({ stats: {} });
});

/* =========================
   LFG
========================= */

app.get("/api/v1/lfg/Fortnite/users/:accountId/settings", ok);

/* =========================
   ACCOUNTS (PUBLIC LOOKUPS)
========================= */

app.get("/api/v1/public/accounts", (req, res) => {
  const ids = [].concat(req.query.accountId || []);
  res.json(
    ids.map(id => ({
      id,
      displayName: "Player",
      externalAuths: {}
    }))
  );
});

/* =========================
   OAUTH MISC
========================= */

app.post("/epic/oauth/v2/tokenInfo", ok);

/* =========================
   FEEDBACK / LOG UPLOADS
========================= */

app.get("/api/v1/access/fortnite/client-feedback/*", noContent);
app.post("/fortnite/api/feedback/*", noContent);

/* =========================
   LINKS / LOCK STATUS
========================= */

app.post("/api/v1/links/lock-status/:accountId/check", (req, res) => {
  res.json({ locked: false });
});

/* =========================
   MOTD SURFACES
========================= */

app.post("/api/v1/fortnite-br/surfaces/:surface/target", (req, res) => {
  res.json({
    entries: []
  });
});

/* =========================
   APP / REGION
========================= */

app.get("/app_installation/status", ok);

app.get("/region", (req, res) => {
  res.json({
    region: "EU"
  });
});

module.exports = app;

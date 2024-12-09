const express = require("express");
const app = express.Router();
const axios = require("axios");
const sjcl = require('sjcl');
const User = require("../model/user.js");
const Friends = require("../model/friends.js");
const functions = require("../structs/functions.js");
const error = require("../structs/error.js");
const { verifyToken } = require("../tokenManager/tokenVerify.js");

global.parties = {};
var pings = [];
var vcParticipants = {};
var vcInfo = {};

app.get("/party/api/v1/Fortnite/user/:accountId/notifications/undelivered/count", verifyToken, async (req, res) => {
    var p = Object.values(global.parties).find(m => m.members.findIndex(x => x.account_id == req.params.accountId) != -1);
    res.json({
        "pings": pings.filter(x => x.id == req.params.accountId).length,
        "invites": p ? p.invites.filter(p => p.sent_to == req.params.accountId).length : 0,
    });
});

app.get("/party/api/v1/Fortnite/user/:accountId", verifyToken, async (req, res) => {
  var p = Object.values(global.parties).filter(m => m.members.findIndex(x => x.account_id == req.params.accountId) != -1);
  res.json({
    "current": p.length > 0 ? p : [],
    "pending": [],
    "invites": [],
    "pings": pings.filter(x => x.id == req.params.accountId)
  });
});

app.post("/party/api/v1/Fortnite/parties", verifyToken, async (req, res) => {
  if (!req.body.join_info) return res.json({});
  if (!req.body.join_info.connection) return res.json({});

  const id = functions.MakeID().replace(/-/ig, "");
  var party = {
    "id": id,
    "created_at": new Date().toISOString(),
    "updated_at": new Date().toISOString(),
    "config": req.body.config,
    "members": [{
      "account_id": (req.body.join_info.connection.id || "").split("@prod")[0],
      "meta": req.body.join_info.meta || {},
      "connections": [
        {
          "id": req.body.join_info.connection.id || "",
          "connected_at": new Date().toISOString(),
          "updated_at": new Date().toISOString(),
          "yield_leadership": req.body.join_info.connection.yield_leadership || false,
          "meta": req.body.join_info.connection.meta || {}
        }
      ],
      "revision": 0,
      "updated_at": new Date().toISOString(),
      "joined_at": new Date().toISOString(),
      "role": "CAPTAIN"
    }],
    "applicants": [],
    "meta": req.body.meta || {},
    "invites": [],
    "revision": 0,
    "intentions": []
  };
  global.parties[id] = party;
  res.json(party);
})

app.patch("/party/api/v1/Fortnite/parties/:pid", verifyToken, async (req, res) => {
  var newp = global.parties[req.params.pid];
  if (!newp) return error.createError("errors.com.epicgames.party.not_found", `Party ${req.params.pid} does not exist!`, undefined, 51002, undefined, 404, res);

  let editingMember = newp.members.find(m => m.account_id == req.user.accountId);
  if (editingMember && editingMember.role != "CAPTAIN") return error.createError("errors.com.epicgames.party.unauthorized", `User ${req.user.accountId} is not allowed to edit party ${req.params.pid}!`, undefined, 51015, undefined, 403, res);

  if (req.body.config) {
    for (var prop of Object.keys(req.body.config)) {
      newp.config[prop] = req.body.config[prop];
    }
  }

  if (req.body.meta) {
    for (var prop of req.body.meta.delete) {
      delete newp.meta[prop];
    }

    for (var prop of Object.keys(req.body.meta.update)) {
      newp.meta[prop] = req.body.meta.update[prop];
    }
  }

  newp.revision = req.body.revision;

  const captain = newp.members.find((member) => member.role === "CAPTAIN");

  newp.updated_at = new Date().toISOString();
  global.parties[req.params.pid] = newp;

  res.status(204).send();
  newp.members.forEach(async (member) => {
    functions.sendXmppMessageToId(member.account_id, {
        captain_id: captain.account_id,
        created_at: newp.created_at,
        invite_ttl_seconds: 14400,
        max_number_of_members: newp.config.max_size,
        ns: "Fortnite",
        party_id: newp.id,
        party_privacy_type: newp.config.joinability,
        party_state_overriden: {},
        party_state_removed: req.body.meta.delete,
        party_state_updated: req.body.meta.update,
        party_sub_type: newp.meta['urn:epic:cfg:party-type-id_s'],
        party_type: "DEFAULT",
        revision: newp.revision,
        sent: new Date().toISOString(),
        type: "com.epicgames.social.party.notification.v0.PARTY_UPDATED",
        updated_at: new Date().toISOString(),
    });
  });
});

app.patch("/party/api/v1/Fortnite/parties/:pid/members/:accountId/meta", verifyToken, async (req, res) => {
  var newp = global.parties[req.params.pid];
  if (!newp) return error.createError("errors.com.epicgames.party.not_found", `Party ${req.params.pid} does not exist!`, undefined, 51002, undefined, 404, res);
  var mIndex;
  for (var member of newp.members) {
    if (member.account_id == req.params.accountId) {
      mIndex = newp.members.indexOf(member);
      break;
    }
  }
  var member = newp.members[mIndex];
  if (!member) return res.status(404).end();
  if (req.user.accountId != req.params.accountId) return error.createError("errors.com.epicgames.party.unauthorized", `User ${req.user.accountId} is not allowed to edit member ${req.params.accountId}!`, undefined, 51015, undefined, 403, res);

  for (var prop of Object.keys(req.body.delete)) {
    delete member.meta[prop];
  }

  for (var prop of Object.keys(req.body.update)) {
    member.meta[prop] = req.body.update[prop];
  }

  member.revision = req.body.revision;

  member.updated_at = new Date().toISOString();
  newp.members[mIndex] = member;
  newp.updated_at = new Date().toISOString();
  global.parties[req.params.pid] = newp;

  res.status(204).send();
  newp.members.forEach(async (member2) => {
    functions.sendXmppMessageToId(member2.account_id, {
        "account_id": req.params.accountId,
        "account_dn": member.meta["urn:epic:member:dn_s"],
        "member_state_updated": req.body.update,
        "member_state_removed": req.body.delete,
        "member_state_overridden": {},
        "party_id": newp.id,
        "updated_at": new Date().toISOString(),
        "sent": new Date().toISOString(),
        "revision": member.revision,
        "ns": "Fortnite",
        "type": "com.epicgames.social.party.notification.v0.MEMBER_STATE_UPDATED",
    });
  });
});

app.get("/party/api/v1/Fortnite/parties/:pid", verifyToken, async (req, res) => {
  var newp = global.parties[req.params.pid];
  if (!newp) return error.createError("errors.com.epicgames.party.not_found", `Party ${req.params.pid} does not exist!`, undefined, 51002, undefined, 404, res);
  res.json(newp);
});

app.delete("/party/api/v1/Fortnite/parties/:pid/members/:accountId", verifyToken, async (req, res) => {
  var newp = global.parties[req.params.pid];
  if (!newp) return error.createError("errors.com.epicgames.party.not_found", `Party ${req.params.pid} does not exist!`, undefined, 51002, undefined, 404, res);
  var mIndex;
  for (var member of newp.members) {
    if (member.account_id == req.params.accountId) {
      mIndex = newp.members.indexOf(member);
      break;
    }
  }
  var member = newp.members[mIndex];
  if (req.user.accountId != req.params.accountId && !member.captain) return error.createError("errors.com.epicgames.party.unauthorized", `User ${req.user.accountId} is not allowed to delete member ${req.params.accountId}!`, undefined, 51015, undefined, 403, res);

  newp.members.forEach(async (member) => {
    functions.sendXmppMessageToId(member.account_id, {
        account_id: req.params.accountId,
        member_state_update: {},
        ns: "Fortnite",
        party_id: newp.id,
        revision: newp.revision || 0,
        sent: new Date().toISOString(),
        type: "com.epicgames.social.party.notification.v0.MEMBER_LEFT"
    });
  });

  newp.members.splice(mIndex, 1);

  res.status(204).end();
  if (newp.members.length == 0) {
    delete global.parties[req.params.pid];
  } else {
    var v = newp.meta['Default:RawSquadAssignments_j'] ? 'Default:RawSquadAssignments_j' : 'RawSquadAssignments_j'
    if (newp.meta[v]) {
      var rsa = JSON.parse(newp.meta[v]);
      rsa.RawSquadAssignments.splice(rsa.RawSquadAssignments.findIndex(a => a.memberId == req.params.accountId), 1);
      newp.meta[v] = JSON.stringify(rsa);

      let captain = newp.members.find((member) => member.role === "CAPTAIN");
      if (!captain) {
        newp.members[0].role = "CAPTAIN";
        captain = newp.members[0];
      }

      newp.updated_at = new Date().toISOString();
      global.parties[req.params.pid] = newp;
      newp.members.forEach(async (member) => {
        functions.sendXmppMessageToId(member.account_id, {
            captain_id: captain.account_id,
            created_at: newp.created_at,
            invite_ttl_seconds: 14400,
            max_number_of_members: 16,
            ns: "Fortnite",
            party_id: newp.id,
            party_privacy_type: newp.config.joinability,
            party_state_overriden: {},
            party_state_removed: [],
            party_state_updated: {
              [v]: JSON.stringify(rsa)
            },
            party_sub_type: newp.meta['urn:epic:cfg:party-type-id_s'],
            party_type: "DEFAULT",
            revision: newp.revision,
            sent: new Date().toISOString(),
            type: "com.epicgames.social.party.notification.v0.PARTY_UPDATED",
            updated_at: new Date().toISOString(),
        });
      });
    }
  }
});

app.post("/party/api/v1/Fortnite/parties/:pid/members/:accountId/join", verifyToken, async (req, res) => {
  var newp = global.parties[req.params.pid];
  if (!newp) return error.createError("errors.com.epicgames.party.not_found", `Party ${req.params.pid} does not exist!`, undefined, 51002, undefined, 404, res);
  var mIndex = -1;
  for (var member of newp.members) {
    if (member.account_id == req.params.accountId) {
      mIndex = newp.members.indexOf(member);
      break;
    }
  }
  if (mIndex != -1) return {
    status: "JOINED",
    party_id: newp.id,
  };

  var mem = {
    "account_id": (req.body.connection.id || "").split("@prod")[0],
    "meta": req.body.meta || {},
    "connections": [
      {
        "id": req.body.connection.id || "",
        "connected_at": new Date().toISOString(),
        "updated_at": new Date().toISOString(),
        "yield_leadership": req.body.connection.yield_leadership ? true : false,
        "meta": req.body.connection.meta || {}
      }
    ],
    "revision": 0,
    "updated_at": new Date().toISOString(),
    "joined_at": new Date().toISOString(),
    "role": req.body.connection.yield_leadership ? "CAPTAIN" : "MEMBER"
  };
  newp.members.push(mem);
  var v = newp.meta['Default:RawSquadAssignments_j'] ? 'Default:RawSquadAssignments_j' : 'RawSquadAssignments_j'
  if (newp.meta[v]) {
  	var rsa = JSON.parse(newp.meta[v]);
  	rsa.RawSquadAssignments.push({
    		memberId: (req.body.connection.id || "").split("@prod")[0],
    		absoluteMemberIdx: newp.members.length - 1
  	});
  	newp.meta[v] = JSON.stringify(rsa);
  	newp.revision++;
  }
  newp.updated_at = new Date().toISOString();
  global.parties[req.params.pid] = newp;

  const captain = newp.members.find((member) => member.role === "CAPTAIN") || { account_id: "" };
  res.json({
    status: "JOINED",
    party_id: newp.id,
  });
  newp.members.forEach(async (member) => {
    functions.sendXmppMessageToId(member.account_id, {
        account_dn: req.body.connection.meta["urn:epic:member:dn_s"],
        account_id: (req.body.connection.id || "").split("@prod")[0],
        connection: {
          connected_at: new Date().toISOString(),
          id: req.body.connection.id,
          meta: req.body.connection.meta,
          updated_at: new Date().toISOString(),
        },
        joined_at: new Date().toISOString(),
        member_state_updated: req.body.meta || {},
        ns: "Fortnite",
        party_id: newp.id,
        revision: 0,
        sent: new Date().toISOString(),
        type: "com.epicgames.social.party.notification.v0.MEMBER_JOINED",
        updated_at: new Date().toISOString(),
    });

    functions.sendXmppMessageToId(member.account_id, {
        captain_id: captain.account_id,
        created_at: newp.created_at,
        invite_ttl_seconds: 14400,
        max_number_of_members: newp.config.max_size,
        ns: "Fortnite",
        party_id: newp.id,
        party_privacy_type: newp.config.joinability,
        party_state_overriden: {},
        party_state_removed: [],
        party_state_updated: {
          [v]: JSON.stringify(rsa)
        },
        party_sub_type: newp.meta['urn:epic:cfg:party-type-id_s'],
        party_type: "DEFAULT",
        revision: newp.revision,
        sent: new Date().toISOString(),
        type: "com.epicgames.social.party.notification.v0.PARTY_UPDATED",
        updated_at: new Date().toISOString(),
    });
  });
});

app.post("/party/api/v1/Fortnite/parties/:pid/members/:accountId/promote", verifyToken, async (req, res) => {
  var newp = global.parties[req.params.pid];
  if (!newp) return error.createError("errors.com.epicgames.party.not_found", `Party ${req.params.pid} does not exist!`, undefined, 51002, undefined, 404, res);
  const captain = newp.members.findIndex((member) => member.role === "CAPTAIN");
  if (newp.members[captain].account_id != req.user.accountId) return error.createError("errors.com.epicgames.party.unauthorized", `User ${req.user.accountId} is not allowed to promote member ${req.params.accountId}!`, undefined, 51015, undefined, 403, res);
  const newCaptain = newp.members.findIndex((member) => member.account_id === req.params.accountId);
  if (captain != -1) {
    newp.members[captain].role = "MEMBER";
  }
  if (newCaptain != -1) {
      newp.members[newCaptain].role = "CAPTAIN";
  }

  newp.updated_at = new Date().toISOString();
  global.parties[req.params.pid] = newp;

  res.status(204).end();
  newp.members.forEach(async (member) => {
    functions.sendXmppMessageToId(member.account_id, {
        account_id: req.params.accountId,
        member_state_update: {},
        ns: "Fortnite",
        party_id: newp.id,
        revision: newp.revision || 0,
        sent: new Date().toISOString(),
        type: "com.epicgames.social.party.notification.v0.MEMBER_NEW_CAPTAIN"
    });
  });
});

app.post("/party/api/v1/Fortnite/user/:accountId/pings/:pingerId", verifyToken, async (req, res) => {
  var memory = functions.GetVersionInfo(req);
  var pIndex;
  if ((pIndex = pings.filter(p => p.sent_to == req.params.accountId).findIndex(p => p.sent_by == req.params.pingerId)) != -1)
    pings.splice(pIndex, 1);

  var d = new Date();
  d.setHours(d.getHours() + 1);
  var ping = {
    sent_by: req.params.pingerId,
    sent_to: req.params.accountId,
    sent_at: new Date().toISOString(),
    expires_at: d.toISOString(),
    meta: req.body.meta
  };
  pings.push(ping);
  res.json(ping);
  functions.sendXmppMessageToId(req.params.accountId, {
    expires: ping.expires_at,
    meta: req.body.meta,
    ns: "Fortnite",
    pinger_dn: (await User.findOne({ accountId: req.params.pingerId }).cache()).username,
    pinger_id: req.params.pingerId,
    sent: ping.sent_at,
    version: memory.build.toString().padEnd(5, 0),
    type: "com.epicgames.social.party.notification.v0.PING"
  });
});

app.delete("/party/api/v1/Fortnite/user/:accountId/pings/:pingerId", verifyToken, async (req, res) => {
  var pIndex;
  if ((pIndex = pings.filter(p => p.sent_to == req.params.accountId).findIndex(p => p.sent_by == req.params.pingerId)) != -1)
    pings.splice(pIndex, 1);
  res.status(204).end();
});

app.get("/party/api/v1/Fortnite/user/:accountId/pings/:pingerId/parties", verifyToken, async (req, res) => {
  var query = pings.filter(p => p.sent_to == req.params.accountId && p.sent_by == req.params.pingerId);
  if (query.length == 0) query = [{
    sent_by: req.params.pingerId
  }];

  res.json(query.map(y => {
    var party = Object.values(global.parties).find(x => x.members.findIndex(m => m.account_id == y.sent_by) != -1);
    if (!party) return null;
    return {
      id: party.id,
      created_at: party.createdAt,
      updated_at: party.updatedAt,
      config: party.config,
      members: party.members,
      applicants: [],
      meta: party.meta,
      invites: [],
      revision: party.revision || 0
    };
  }).filter(x => x != null));
});

app.post("/party/api/v1/Fortnite/user/:accountId/pings/:pingerId/join", verifyToken, async (req, res) => {
  var query = pings.filter(p => p.sent_to == req.params.accountId && p.sent_by == req.params.pingerId);
  if (query.length == 0) query = [{
    sent_by: req.params.pingerId
  }];
  var newp = Object.values(global.parties).find(p => p.members.findIndex(m => m.account_id == query[0].sent_by) != -1);

  var mIndex = -1;
  for (var member of newp.members) {
    if (member.account_id == req.params.accountId) {
      mIndex = newp.members.indexOf(member);
      break;
    }
  }
  if (mIndex != -1) if (mIndex != -1) return {
    status: "JOINED",
    party_id: newp.id,
  };

  var mem = {
    "account_id": (req.body.connection.id || "").split("@prod")[0],
    "meta": req.body.meta || {},
    "connections": [
      {
        "id": req.body.connection.id || "",
        "connected_at": new Date().toISOString(),
        "updated_at": new Date().toISOString(),
        "yield_leadership": req.body.connection.yield_leadership ? true : false,
        "meta": req.body.connection.meta || {}
      }
    ],
    "revision": 0,
    "updated_at": new Date().toISOString(),
    "joined_at": new Date().toISOString(),
    "role": req.body.connection.yield_leadership ? "CAPTAIN" : "MEMBER"
  };
  newp.members.push(mem);
  var v = newp.meta['Default:RawSquadAssignments_j'] ? 'Default:RawSquadAssignments_j' : 'RawSquadAssignments_j'
  if (newp.meta[v]) {
  	var rsa = JSON.parse(newp.meta[v]);
  	rsa.RawSquadAssignments.push({
    		memberId: (req.body.connection.id || "").split("@prod")[0],
    		absoluteMemberIdx: newp.members.length - 1
  	});
  	newp.meta[v] = JSON.stringify(rsa);
  	newp.revision++;
  }
  newp.updated_at = new Date().toISOString();
  global.parties[newp.id] = newp;

  const captain = newp.members.find((member) => member.role === "CAPTAIN");
  
  res.json({
    status: "JOINED",
    party_id: newp.id,
  });
  newp.members.forEach(async (member) => {
    functions.sendXmppMessageToId(member.account_id, {
        account_dn: req.body.connection.meta["urn:epic:member:dn_s"],
        account_id: (req.body.connection.id || "").split("@prod")[0],
        connection: {
          connected_at: new Date().toISOString(),
          id: req.body.connection.id,
          meta: req.body.connection.meta,
          updated_at: new Date().toISOString(),
        },
        joined_at: new Date().toISOString(),
        member_state_updated: req.body.meta || {},
        ns: "Fortnite",
        party_id: newp.id,
        revision: 0,
        sent: new Date().toISOString(),
        type: "com.epicgames.social.party.notification.v0.MEMBER_JOINED",
        updated_at: new Date().toISOString(),
    });

    functions.sendXmppMessageToId(member.account_id, {
        captain_id: captain.account_id,
        created_at: newp.created_at,
        invite_ttl_seconds: 14400,
        max_number_of_members: newp.config.max_size,
        ns: "Fortnite",
        party_id: newp.id,
        party_privacy_type: newp.config.joinability,
        party_state_overriden: {},
        party_state_removed: [],
        party_state_updated: {
          [v]: JSON.stringify(rsa)
        },
        party_sub_type: newp.meta['urn:epic:cfg:party-type-id_s'],
        party_type: "DEFAULT",
        revision: newp.revision,
        sent: new Date().toISOString(),
        type: "com.epicgames.social.party.notification.v0.PARTY_UPDATED",
        updated_at: new Date().toISOString(),
    });
  });
});

app.post('/party/api/v1/Fortnite/parties/:pid/invites/:accountId', verifyToken, async (req, res) => {
  var memory = functions.GetVersionInfo(req);
  var newp = global.parties[req.params.pid];
  if (!newp) return error.createError("errors.com.epicgames.party.not_found", `Party ${req.params.pid} does not exist!`, undefined, 51002, undefined, 404, res);
  var pIndex;
  if ((pIndex = newp.invites.filter(p => p.sent_to == req.params.accountId).findIndex(p => p.sent_by == req.user.accountId)) != -1)
    newp.invites.splice(pIndex, 1);

  var d = new Date();
  d.setHours(d.getHours() + 1);
  var invite = {
    party_id: newp.id,
    sent_by: req.user.accountId,
    meta: req.body,
    sent_to: req.params.accountId,
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: d.toISOString(),
    status: 'SENT'
  };

  newp.invites.push(invite);
  newp.updated_at = new Date().toISOString();
  global.parties[req.params.pid] = newp;

  var friends = await Friends.findOne({ accountId: req.user.accountId }).cache();
  const inviter = newp.members.find(x => x.account_id == req.user.accountId);

  res.status(204).end();
  functions.sendXmppMessageToId(req.params.accountId, {
    expires: invite.expires_at,
    meta: req.body,
    ns: "Fortnite",
    party_id: newp.id,
    inviter_dn: inviter.meta['urn:epic:member:dn_s'],
    inviter_id: req.user.accountId,
    invitee_id: req.params.accountId,
    members_count: newp.members.length,
    sent_at: invite.sent_at,
    updated_at: invite.updated_at,
    friends_ids: newp.members.filter(m => friends.list.accepted.find(f => f.accountId == m.account_id)).map(m => m.account_id),
    sent: new Date().toISOString(),
    type: "com.epicgames.social.party.notification.v0.INITIAL_INVITE"
  });
  if (req.query.sendPing == "true") {
    var pIndex;
    if ((pIndex = pings.filter(p => p.sent_to == req.params.accountId).findIndex(p => p.sent_by == req.user.accountId)) != -1)
      pings.splice(pIndex, 1);

    var d = new Date();
    d.setHours(d.getHours() + 1);
    var ping = {
      sent_by: req.user.accountId,
      sent_to: req.params.accountId,
      sent_at: new Date().toISOString(),
      expires_at: d.toISOString(),
      meta: req.body
    };
    pings.push(ping);

    functions.sendXmppMessageToId(req.params.accountId, {
          expires: invite.expires_at,
          meta: req.body.meta,
          ns: "Fortnite",
          pinger_dn: inviter.meta['urn:epic:member:dn_s'],
          pinger_id: req.user.accountId,
          sent: invite.sent_at,
          version: memory.build.toString().padEnd(5, 0),
          type: "com.epicgames.social.party.notification.v0.PING"
    });
  }
});


app.post([
  '/party/api/v1/Fortnite/parties/:pid/invites/:accountId/decline',
  '/party/api/v1/Fortnite/parties/:pid/invites/:accountId/*/decline'
  ], verifyToken, async (req, res) => {
  var newp = global.parties[req.params.pid];
  if (!newp) return error.createError("errors.com.epicgames.party.not_found", `Party ${req.params.pid} does not exist!`, undefined, 51002, undefined, 404, res);

  var invite = newp.invites.find(p => p.sent_to == req.params.accountId);
  if (!invite) return error.createError("errors.com.epicgames.party.not_found", `Invite ${req.params.pid} does not exist!`, undefined, 51002, undefined, 404, res);
  const inviter = newp.members.find(x => x.account_id == invite.sent_by);

  res.status(204).end();

  if (inviter) functions.sendXmppMessageToId(invite.sent_by, {
    expires: invite.expires_at,
    meta: req.body,
    ns: "Fortnite",
    party_id: newp.id,
    inviter_dn: inviter.meta['urn:epic:member:dn_s'],
    inviter_id: invite.sent_by,
    invitee_id: req.params.accountId,
    sent_at: invite.sent_at,
    updated_at: invite.updated_at,
    sent: new Date().toISOString(),
    type: "com.epicgames.social.party.notification.v0.INVITE_CANCELLED"
  });
});

app.post("/party/api/v1/Fortnite/members/:accountId/intentions/:senderId", verifyToken, async (req, res) => {
  var party = Object.values(global.parties).find(x => x.members.findIndex(m => m.account_id == req.params.senderId) != -1);
  if (!party) return error.createError("errors.com.epicgames.party.not_found", `Party does not exist!`, undefined, 51002, undefined, 404, res);
  const sender = party.members.find(x => x.account_id == req.params.senderId);
  const captain = party.members.find((member) => member.role === "CAPTAIN");
  var friends = await Friends.findOne({ accountId: req.params.accountId }).cache();

  var d = new Date();
  d.setHours(d.getHours() + 1);
  var intention = {
		"requester_id": req.params.senderId,
		"requester_dn": sender.meta['urn:epic:member:dn_s'],
		"requester_pl": captain.account_id,
		"requester_pl_dn": captain.meta['urn:epic:member:dn_s'],
		"requestee_id": req.params.accountId,
		"meta": req.body,
    "expires_at": d.toISOString(),
		"sent_at": new Date().toISOString(),
	};

  party.intentions.push(intention);
  res.json(intention);

  functions.sendXmppMessageToId(req.params.accountId, {
    expires_at: intention.expires_at,
    requester_id: req.params.senderId,
    requester_dn: sender.meta['urn:epic:member:dn_s'],
    requester_pl: captain.account_id,
    requester_pl_dn: captain.meta['urn:epic:member:dn_s'],
    requestee_id: req.params.accountId,
    meta: req.body,
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    friends_ids: party.members.filter(m => friends.list.accepted.find(f => f.accountId == m.account_id)).map(m => m.account_id),
    members_count: party.members.length,
    party_id: party.id,
    ns: "Fortnite",
    sent: new Date().toISOString(),
    type: "com.epicgames.social.party.notification.v0.INITIAL_INTENTION"
  });
});

function vxGenerateToken(key, payload) {
    const base64urlHeader = base64URLEncode("{}");

    const base64urlPayload = base64URLEncode(JSON.stringify(payload));

    const segments = [base64urlHeader, base64urlPayload];
    const toSign = segments.join(".");

    const hmac = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(key), sjcl.hash.sha256);
    const signature = sjcl.codec.base64.fromBits(hmac.encrypt(toSign));
    const base64urlSigned = signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/\=+$/, "");

    segments.push(base64urlSigned);

    return segments.join(".");
}


function base64URLEncode(value) {
    return Buffer.from(value).toString('base64').replace(/\+/g, "-").replace(/\//g, "_").replace(/\=+$/, "");
}

var lastClient;

app.post("/party/api/v1/Fortnite/parties/:pid/members/:accountId/conferences/connection", verifyToken, async (req, res) => {
  const { pid, accountId } = req.params;

  let { vivox, rtcp } = req.body.providers;
  const party = parties[pid];

  if (rtcp) {
    if (lastClient == undefined || new Date(lastClient.expires_at).getTime() <= Date.now()) {
      const response = await axios.post('https://api.epicgames.dev/auth/v1/oauth/token',
        "grant_type=client_credentials&deployment_id=8949d22a1748462abe3e938fd7e19e5c",
        {
          "Content-Type": "application/x-www-form-urlencoded",
          auth: {
            username: "xyza7891InagL5qaPE6DzJBNn14sBWgF",
            password: "NvJM0I6mKNEMCnn89DtEJTiZRfWW6YsAZjicl6IVols"
          }
        });

      lastClient = response.data;
    }

    if (!vcParticipants[pid]) vcParticipants[pid] = [];

    var p = {
      puid: accountId,
      clientIP: req.ip,
      hardMuted: false
    };
    if (!vcParticipants[pid].find(m => m.puid == p.puid)) vcParticipants[pid].push(p);
      var toProperCase = s => s.split("")[0].toUpperCase() + s.slice(1);
      var room = await axios.post(
        `https://api.epicgames.dev/rtc/v1/8949d22a1748462abe3e938fd7e19e5c/room/${pid}`,
        {
          participants: vcParticipants[pid]
        },
        {
          headers: {
            'authorization': toProperCase(lastClient.token_type) + ' ' + lastClient.access_token
          }
        }
      );
      var joinToken = room.data;

      var tokenMap = {};
      for (var participant of joinToken.participants) {
        tokenMap[participant.puid] = participant.token;
      }
      vcInfo[pid] = {
        name: joinToken.roomId,
        url: joinToken.clientBaseUrl,
        tokens: tokenMap
      }

    rtcp = {
      participant_token: vcInfo[pid].tokens[accountId],
      client_base_url: vcInfo[pid].url,
      room_name: vcInfo[pid].name
    };
  } else {
    const channel_uri = `sip:confctl-g-epicgames.p-${pid}@mtu1xp.vivox.com`;
    const user_uri = `sip:.epicgames.${accountId}.@mtu1xp.vivox.com`;

    const vivoxClaims = {
      "iss": "epicgames",
      "sub": accountId,
      "exp": Math.floor(new Date().addHours(2).getTime() / 1000),
      "vxa": "join",
      "f": user_uri,
      "t": channel_uri
    };

    const token = vxGenerateToken("zcETsPpEAysznTyDXK4TEzwLQPcTvTAO", vivoxClaims);

    vivox = {
      "authorization_token": token,
      "channel_uri": channel_uri,
      "user_uri": user_uri
    }
  }

  res.json({
    providers: {
      rtcp,
      vivox,
    },
  });
});

module.exports = app;
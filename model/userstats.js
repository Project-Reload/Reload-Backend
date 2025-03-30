const mongoose = require("mongoose");

const UserStatsSchema = new mongoose.Schema(
    {
        created: { type: Date, required: true },
        accountId: { type: String, required: true, unique: true },
        solo: { type: Object, required: true },
        duo: { type: Object, required: true },
        trio: { type: Object, required: true },
        squad: { type: Object, required: true },
        ltm: { type: Object, required: true },
    },
    {
        collection: "userstats"
    }
)

const model = mongoose.model("UserStatsSchema", UserStatsSchema);

module.exports = model;
const mongoose = require("mongoose");

const SACCodesSchema = new mongoose.Schema(
    {
        created: { type: Date, required: true },
        createdby: { type: String, required: true },
        owneraccountId: { type: String, required: true },
        code: { type: String, required: true },
        code_lower: { type: String, required: true },
        code_higher: { type: String, required: true },
    }, 
    {
    collection: "SACcodes"
    }
);

const model = mongoose.model('SACCodeSchema', SACCodesSchema);

module.exports = model;
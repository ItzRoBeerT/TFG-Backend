const mongoose = require("mongoose");

const hashtagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
});

const Hashtag = mongoose.model("Hashtag", hashtagSchema);

module.exports = Hashtag;

const mongoose = require("mongoose");

const postHashtagSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Post",
    },
    hashtagId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Hashtag",
    },
});

const Post_Hashtag = mongoose.model("Post_Hashtag", postHashtagSchema);

module.exports = Post_Hashtag;

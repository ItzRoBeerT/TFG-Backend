const mongoose = require("mongoose");
const validator = require("validator");

const postSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true,
    },
    image: {
        type: String,
        required: false,
        trim: true,
        validate(value) {
            if (!validator.isURL(value)) {
                throw new Error("Image is invalid");
            }
        },
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    likes: {
        type: Number,
        default: 0,
    },
    likedBy:[
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "User",
        },
      }
    ],
    comments: [
        {
            comment: {
                type: String,
                required: true,
                trim: true,
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: "User",
            },
        },
    ],
});

const Post = mongoose.model("Post", postSchema);
module.exports = Post;

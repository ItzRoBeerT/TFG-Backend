const express = require("express");
//import mongoose from "mongoose";
const auth = require("../middleware/auth");
const Post = require("../models/Post");
const Hashtag = require("../models/Hashtag");
const Post_Hashtags = require("../models/Post_Hashtag");
const User = require("../models/User");
const router = express.Router();

//create a new post
router.post("/create", auth, async (req, res) => {
    const post = new Post({ ...req.body, userId: req.user._id });
    try {
        //buscar hashtags en el content del post
        const regex = /#\w+/g;
        const hashtags = post.content.match(regex);
        if (hashtags) {
            //si hay hashtags, guardarlos en la tabla Post_Hashtag
            for (let i = 0; i < hashtags.length; i++) {
                const existingHashtag = await Hashtag.findOne({ name: hashtags[i] });
                let hashtagId;
                if (!existingHashtag) {
                    const newHashtag = new Hashtag({ name: hashtags[i] });
                    await newHashtag.save();
                    hashtagId = newHashtag._id;
                } else {
                    hashtagId = existingHashtag._id;
                }
                const postHashtag = new Post_Hashtags({ postId: post._id, hashtagId: hashtagId });
                await postHashtag.save();
            }
        }
        await post.save();
        res.send(post);
    } catch (error) {
        res.send(error);
    }
});

//buscador
router.get("/search/:searchText/", auth, async (req, res) => {
    const searchText = req.params.searchText;
    try {
        //buscar posts por texto
        const postsByContent = await Post.find({ content: { $regex: searchText, $options: "i" } }).populate("userId", "name");
        //buscar posts por hashtags
        const hashtags = await Hashtag.find({ name: { $regex: searchText, $options: "i" } });
        const hashtagIds = hashtags.map((hashtag) => hashtag._id);
        const postsByHashtag = await Post_Hashtags.find({ hashtagId: { $in: hashtagIds } }).populate("postId", "content");

        //buscar usuario por nickname
        const users = await User.find({ nickname: { $regex: searchText, $options: "i" } });

        const posts = postsByContent.concat(postsByHashtag.map((postHashtag) => postHashtag.postId));

        res.send({ posts, users });
    } catch (error) {
        res.send(error);
    }
});

//obtain all posts where the user is the owner
router.get("/all", auth, async (req, res) => {
    try {
        const posts = await Post.find({ user: req.user._id });
        res.send(posts);
    } catch (error) {
        res.send(error);
    }
});

//obtain a post where the user is the owner
router.get("/get/:id", auth, async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
        if (!post) {
            return res.status(404).send();
        }
        res.send(post);
    } catch (error) {
        res.send(error);
    }
});

//add a comment to a post
router.post("/addComment/:id", auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).send();
        }
        post.comments = post.comments.concat({ comment: req.body.comment, userId: req.user._id });
        await post.save();
        res.send(post);
    } catch (error) {
        res.send(error);
    }
});

//give a like to a post
router.post("/like/:id", auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).send();
        }

        //verificar si el usuario ya dio like
        if (post.likedBy.some((like) => like.userId.equals(req.user._id))) {
            return res.status(400).send({ error: "You already liked this post!" });
        }

        post.likes = post.likes + 1;
        post.likedBy = post.likedBy.concat({ userId: req.user._id });
        await post.save();
        res.send(post);
    } catch (error) {
        res.send(error);
    }
});

//update a post where the user is the owner
router.patch("/updatePost/:id", auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ["content", "image"];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (!isValidOperation) {
        return res.status(400).send({ error: "Invalid updates!" });
    }
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
        if (!post) {
            return res.status(404).send();
        }
        updates.forEach((update) => (post[update] = req.body[update]));
        await post.save();
        res.send(post);
    } catch (error) {
        res.send(error);
    }
});

//delete a post where the user is the owner
router.delete("/deletePost/:id", auth, async (req, res) => {
    try {
        const post = await Post.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!post) {
            return res.status(404).send();
        }
        res.send(post);
    } catch (error) {
        res.send(error);
    }
});

module.exports = router;

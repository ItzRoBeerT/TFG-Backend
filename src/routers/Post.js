const express = require("express");
//import mongoose from "mongoose";
const auth = require("../middleware/auth");
const Post = require("../models/Post");
const router = express.Router();

//create a new post
router.post("/create", auth, async (req, res) => {
    const post = new Post({ ...req.body, userId: req.user._id });
    try {
        await post.save();
        res.status(201).send(post);
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

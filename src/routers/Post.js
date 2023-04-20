const express = require("express");
//import mongoose from "mongoose";
const auth = require("../middleware/auth");
const Post = require("../models/Post");
const Hashtag = require("../models/Hashtag");
const Post_Hashtags = require("../models/Post_Hashtag");
const User = require("../models/User");
const router = express.Router();

//#region SCHEMAS SWAGGER
//SCHEMA POST
/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       properties:
 *          content:
 *              type: string
 *              description: The content of the post
 *          image:
 *              type: string
 *              description: The image of the post
 *          userId:
 *              type: string
 *              description: The user id of the post
 *          likes:
 *              type: number
 *              description: The likes of the post
 *          likedBy:
 *              type: array
 *              description: The users that liked the post
 *              items:
 *                 type: string
 *                 description: The user id of the user that liked the post
 *                 example: 5f9f5c0b0b9b0c0b0b9b0c0b
 *          comments:
 *              type: array
 *              description: The comments of the post
 *              items:
 *                type: object
 *                properties:
 *                 comment:
 *                      type: string
 *                      description: The comment of the post
 *                      example: This is a comment
 *                 userId:
 *                    type: string
 *                    description: The user id of the user that commented the post
 *                    example: 5f9f5c0b0b9b0c0b0b9b0c0b
 *       required:
 *         - content
 *         - userId
 *       example:
 *          content: This is a post
 *          image: https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png
 *          userId: 5f9f5c0b0b9b0c0b0b9b0c0b
 *          likes: 0
 *          likedBy: []
 *          comments: []
 */
//SCHEMA HASHTAG
/**
 * @swagger
 * components:
 *   schemas:
 *     Hashtag:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the hashtag
 *           example: \(#)hashtag
 *       required:
 *         - name
 *       example:
 *         name: \#hashtag
 */
//SCHEMA POST_HASHTAG
/**
 * @swagger
 * components:
 *   schemas:
 *     Post_Hashtag:
 *       type: object
 *       properties:
 *         postId:
 *           type: string
 *           description: The post id of the post
 *           example: 5f9f5c0b0b9b0c0b0b9b0c0b
 *         hashtagId:
 *           type: string
 *           description: The hashtag id of the hashtag
 *           example: 5f9f5c0b0b9b0c0b0b9b0c0b
 *       required:
 *         - postId
 *         - hashtagId
 *       example:
 *         postId: 5f9f5c0b0b9b0c0b0b9b0c0b
 *         hashtagId: 5f9f5c0b0b9b0c0b0b9b0c0b
 */
//#endregion

//create a new post
/**
 * @swagger
 * /create:
 *   post:
 *      summary: Create a new post
 *      tags: [Post]
 *      security:
 *         - bearerAuth: []
 *      requestBody:
 *          required: true
 *          content:
 *             application/json:
 *               schema:
 *                $ref: '#/components/schemas/Post'
 *      responses:
 *       200:
 *          description: The post was successfully created
 *       500:
 *          description: Some server error
 *       401:
 *          description: Unauthorized
 *       400:
 *          description: Bad request
 */
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
        res.status(500).send({ error: "Internal server error" });
    }
});

//buscador
/**
 * @swagger
 * /post/search/{searchText}:
 *   get:
 *     summary: Search posts by content, hashtags or users
 *     tags: [Post]
 *     security:
 *        - bearerAuth: []
 *     parameters:
 *      - in: path
 *        name: searchText
 *        schema:
 *          type: string
 *          required: true
 *          description: The text to search
 *     responses:
 *      200:
 *          description: The posts were obtained
 *      500:
 *          description: Some server error
 *      401:
 *          description: Unauthorized
 *      400:
 *          description: Bad request
 *      404:
 *          description: Not found
 */
router.get("/post/search/:searchText/", auth, async (req, res) => {
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
        res.status(500).send({ error: "Internal server error" });
    }
});

//obtain all posts where the user is the owner
/**
 * @swagger
 * /all:
 *   get:
 *      summary: Obtain all posts where the user is the owner
 *      tags: [Post]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *          200:
 *             description: The posts were obtained
 *          500:
 *              description: Some server error
 *          401:
 *              description: Unauthorized
 *          400:
 *              description: Bad request
 *          404:
 *              description: Not found
 */
router.get("/all", auth, async (req, res) => {
    try {
        const posts = await Post.find({ user: req.user._id });
        if (!posts) {
            return res.status(404).send({ error: "No posts found" });
        }
        res.send(posts);
    } catch (error) {
        res.status(500).send({ error: "Internal server error" });
    }
});

//obtain a post where the user is the owner
/**
 * @swagger
 * /get/{id}:
 *      get:
 *          summary: Obtain a post where the user is the owner
 *          tags: [Post]
 *          security:
 *              - bearerAuth: []
 *          parameters:
 *              - in: path
 *                name: id
 *                schema:
 *                type: string
 *                required: true
 *                description: The post id
 *          responses:
 *              200:
 *                  description: The post was obtained
 *              500:
 *                  description: Some server error
 *              401:
 *                  description: Unauthorized
 *              400:
 *                  description: Bad request
 *              404:
 *                  description: Not found
 */
router.get("/get/:id", auth, async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
        if (!post) {
            return res.status(404).send();
        }
        res.send(post);
    } catch (error) {
        res.status(500).send({ error: "Internal server error" });
    }
});

//add a comment to a post
/**
 * @swagger
 * /addComment/{id}:
 *   post:
 *     summary: add a comment to a post
 *     tags: [Post]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: this is the post id
 *       - in: body
 *         name: comment
 *         schema:
 *           type: object
 *           properties:
 *             content:
 *               type: string
 *           required:
 *             - content
 *           example:
 *             content: "content test"
 *         description: The comment to add
 *     responses:
 *       200:
 *         description: comment added
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Some server error
 */
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
        res.status(500).send({ error: "Internal server error" });
    }
});
//give a like to a post
/**
 * @swagger
 * /like/{id}:
 *   post:
 *     summary: give a like to a post
 *     tags: [Post]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: this is the post id
 *     responses:
 *       200:
 *         description: like added
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Some server error
 */
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
        res.status(500).send({ error: "Internal server error" });
    }
});

//update a post where the user is the owner
/**
 * @swagger
 * /updatePost/{id}:
 *   patch:
 *     summary: Update a post where the user is the owner
 *     tags: [Post]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The post id
 *       - in: body
 *         name: post
 *         schema:
 *           type: object
 *           properties:
 *             content:
 *               type: string
 *             image:
 *               type: string
 *           required:
 *             - content
 *             - image
 *           example:
 *             content: "content test"
 *             image: "image test"
 *         description: The post to update
 *     responses:
 *       200:
 *         description: The post was updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Some server error
 */
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
        res.status(500).send({ error: "Internal server error" });
    }
});

//delete a post where the user is the owner
/**
 * @swagger
 * /deletePost/{id}:
 *   delete:
 *     summary: Delete a post where the user is the owner
 *     tags: [Post]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The post id
 *     responses:
 *       200:
 *         description: The post was deleted
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Some server error
 */
router.delete("/deletePost/:id", auth, async (req, res) => {
    try {
        const post = await Post.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!post) {
            return res.status(404).send();
        }
        res.send(post);
    } catch (error) {
        res.status(500).send({ error: "Internal server error" });
    }
});

module.exports = router;

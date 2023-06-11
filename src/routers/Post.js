const express = require('express');
//import mongoose from "mongoose";
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Hashtag = require('../models/Hashtag');
const Post_Hashtags = require('../models/Post_Hashtag');
const User = require('../models/User');
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
 * /post/create:
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
router.post('/post/create', auth, async (req, res) => {
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
        res.status(500).send({ error: 'Internal server error' });
    }
});

//buscador
/**
 * @swagger
 * /post/search/{searchText}:
 *   get:
 *     summary: Search posts by content, hashtags or users
 *     tags: [Post]
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
router.get('/post/search/:searchText', async (req, res) => {
    const searchText = req.params.searchText;
    try {
        let posts;
        let users;

        // Verificar si searchText es un hashtag
        if (searchText.startsWith('#')) {
            // Buscar posts por hashtags
            const hashtags = await Hashtag.find({ name: { $regex: searchText.substring(1), $options: 'i' } });
            const hashtagIds = hashtags.map((hashtag) => hashtag._id);
            const postsByHashtag = await Post_Hashtags.find({ hashtagId: { $in: hashtagIds } }).populate('postId').lean();

            // Filtrar resultados nulos
            const filteredPostsByHashtag = postsByHashtag.filter((postHashtag) => postHashtag.postId !== null);

            posts = filteredPostsByHashtag.map((postHashtag) => postHashtag.postId);
        } else {
            // Buscar posts por texto
            const postsByContent = await Post.find({ content: { $regex: searchText, $options: 'i' } }).lean();

            // Buscar usuario por nickname
            users = await User.find({ nickname: { $regex: searchText, $options: 'i' } });

            // Filtrar resultados nulos
            const filteredPostsByContent = postsByContent.filter((post) => post !== null);

            posts = filteredPostsByContent;
        }

        res.send({ posts, users });
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

//obtain all posts where the user is the owner
/**
 * @swagger
 * /post/myPosts:
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
router.get('/post/myPosts', auth, async (req, res) => {
    try {
        const posts = await Post.find({ user: req.user._id });
        if (!posts) {
            return res.status(404).send({ error: 'No posts found' });
        }
        res.send(posts);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

//obtain all posts where the user id is the owner
router.get('/post/getByUserId/:id', async (req, res) => {
    try {
        const posts = await Post.find({ userId: req.params.id }).populate('userId', 'name');
        if (!posts) {
            return res.status(404).send({ error: 'No posts found' });
        }
        res.send(posts);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

//obtain all posts where the user nickname is the owner
/**
 * @swagger
 * /post/getByNickname/{nickname}:
 *   get:
 *     summary: Get posts by user nickname
 *     tags: [Post]
 *     parameters:
 *       - in: path
 *         name: nickname
 *         required: true
 *         schema:
 *           type: string
 *         description: Apodo del usuario para filtrar las publicaciones
 *     responses:
 *       '200':
 *         description: Publicaciones encontradas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       '404':
 *         description: Usuario o publicaciones no encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

router.get('/post/getByNickname/:nickname', async (req, res) => {
    try {
        const user = await User.findOne({ nickname: req.params.nickname });
        if (!user) {
            return res.status(404).send({ error: 'No user found' });
        }
        const posts = await Post.find({ userId: user._id }).sort({ date: 'desc' });
        if (!posts) {
            return res.status(404).send({ error: 'No posts found' });
        }
        res.send(posts);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /post/getById/{id}:
 *   get:
 *     summary: Get post by id
 *     tags: [Post]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la publicación
 *     responses:
 *       '200':
 *         description: Publicación encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       '404':
 *         description: Publicación no encontrada
 *       '500':
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

router.get('/post/getById/:id', async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id }).populate('userId', 'name');
        if (!post) {
            return res.status(404).send();
        }
        res.send(post);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

//obtain most popular posts
/**
 * @swagger
 * /post/popular/{page}:
 *   get:
 *     summary: Obtain most popular posts
 *     tags: [Post]
 *     parameters:
 *       - in: path
 *         name: page
 *         schema:
 *           type: integer
 *         required: true
 *         description: Page number
 *     responses:
 *       200:
 *         description: The posts were obtained
 *       500:
 *         description: Some server error
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Bad request
 *       404:
 *         description: Not found
 */
router.get('/post/popular/:page', async (req, res) => {
    try {
        const page = req.params.page || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const posts = await Post.find({}).sort({ likes: 'desc' }).limit(limit).skip(skip);
        if (!posts) {
            return res.status(404).send({ error: 'No posts found' });
        }
        res.send(posts);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

//add a comment to a post
/**
 * @swagger
 * /post/addComment/{id}:
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
router.post('/post/addComment/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).send();
        }
        post.comments = post.comments.concat({ comment: req.body.comment, userId: req.user._id });
        await post.save();
        res.send(post);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});
//give a like to a post
/**
 * @swagger
 * /post/like/{id}:
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
router.post('/post/like/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).send();
        }

        //verificar si el usuario ya dio like
        if (post.likedBy.some((like) => like.userId.equals(req.user._id))) {
            return res.status(400).send({ error: 'You already liked this post!' });
        }

        post.likes = post.likes + 1;
        post.likedBy = post.likedBy.concat({ userId: req.user._id });
        await post.save();
        res.send(post);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /post/unlike/{id}:
 *   post:
 *     summary: remove a like to a post
 *     tags: [Post]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la publicación
 *     responses:
 *       '200':
 *         description: Dislike aplicado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       '400':
 *         description: No has dado like a esta publicación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '404':
 *         description: Publicación no encontrada
 *       '500':
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/post/unlike/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).send();
        }

        //verificar si el usuario ya dio like
        if (!post.likedBy.some((like) => like.userId.equals(req.user._id))) {
            return res.status(400).send({ error: 'You have not liked this post!' });
        }

        post.likes = post.likes - 1;
        post.likedBy = post.likedBy.filter((like) => !like.userId.equals(req.user._id));
        await post.save();
        res.send(post);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

//update a post where the user is the owner
/**
 * @swagger
 * /post/updatePost/{id}:
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
router.patch('/post/updatePost/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['content', 'image'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (updates.length === 0) {
        return res.status(400).send({ error: 'No updates provided!' });
    }
    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
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
        console.log(error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

//delete a post where the user is the owner
/**
 * @swagger
 * /post/deletePost/{id}:
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
router.delete('/post/deletePost/:id', auth, async (req, res) => {
    try {
        const post = await Post.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!post) {
            return res.status(404).send();
        }
        res.send(post);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

//get all posts
router.get('/post/getAllPosts', async (req, res) => {
    try {
        const posts = await Post.find({});
        res.send(posts);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /post/deleteComment/{id}:
 *  delete:
 *   summary: delete a comment by id
 *   tags: [Post]
 *   security:
 *    - bearerAuth: []
 *   consumes:
 *    - application/json
 *   parameters:
 *    - in: path
 *      name: id
 *      schema:
 *       type: string
 *      required: true
 *      description: ID del comentario
 *   responses:
 *    200:
 *     description: El comentario ha sido eliminado
 *    400:
 *     description: Solicitud incorrecta
 *    401:
 *     description: No autorizado
 *    404:
 *     description: No encontrado
 *    500:
 *     description: Error del servidor
 */

router.delete('/post/deleteComment/:id', auth, async (req, res) => {
    try {
        const post = await Post.findOne({ 'comments._id': req.params.id });

        if (!post) {
            return res.status(404).send();
        }

        // Buscar el comentario dentro del post
        const comment = post.comments.find((comment) => comment._id.equals(req.params.id));

        if (!comment) {
            return res.status(404).send();
        }

        // Verificar si el usuario autenticado es el dueño del comentario
        if (comment.userId.toString() !== req.user._id.toString()) {
            return res.status(401).send({ error: 'No tienes permiso para realizar esta acción' });
        }

        // Eliminar el comentario del post
        post.comments = post.comments.filter((comment) => !comment._id.equals(req.params.id));

        await post.save();
        res.send(post);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /post/getRecentPosts/{page}:
 *   get:
 *     summary: Get recent posts
 *     tags:
 *       - Post
 *     parameters:
 *       - in: path
 *         name: page
 *         schema:
 *           type: integer
 *         required: true
 *         description: The page number
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       '500':
 *         description: Internal server error
 */

router.get('/post/getRecentPosts/:page', async (req, res) => {
    try {

        const page = req.params.page || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const posts = await Post.find({}).sort({ date: -1 }).skip(skip).limit(limit);
        res.send(posts);
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

module.exports = router;

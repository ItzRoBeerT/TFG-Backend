const express = require("express");
const User = require("../models/User");
const router = new express.Router();
const auth = require("../middleware/auth");
const Post = require("../models/Post");

//create a new user
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The user's name
 *         email:
 *           type: string
 *           description: The user's email
 *         password:
 *           type: string
 *           description: The user's password
 *         nickname:
 *           type: string
 *           description: The user's nickname
 *         avatar:
 *          type: string
 *          description: The user's avatar
 *         age:
 *          type: number
 *          description: The user's age
 *         friends:
 *          type: array
 *          description: Array of objects representing the user's friends.
 *          items:
 *           type: object
 *           properties:
 *              friend:
 *                   type: string
 *                   description: The ID of the friend user, which references the "User" schema.
 *                   example: 6123456789abcdef0123456
 *         tokens:
 *          type: array
 *          description:  Array of objects representing the user's authentication tokens
 *          items:
 *           type: object
 *           properties:
 *              token:
 *                  type: string
 *                  description: The user's authentication token
 *                  example: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
 *       required:
 *         - name
 *         - email
 *         - password
 *         - nickname
 *       example:
 *         name: John Doe
 *         email: johndoe@email.com
 *         password: johndoe21
 *         nickname: johndoe
 */

/**
 * @swagger
 * /user/createAccount:
 *   post:
 *     summary: Create a new user
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       '200':
 *         description: The user was successfully created
 *       '400':
 *         description: Bad Request
 *       '500':
 *         description: Internal Server Error
 */
router.post("/user/createAccount", async (req, res) => {
    const user = new User(req.body);
    try {
        await user.save();
        res.send("account created");
    } catch (e) {
       res.status(400).send({ error: e.message });
    }
});

router.get("/", (req, res) => {
    res.send("Hello World!");
});

//get all users (for testing purposes)
/**
 * @swagger
 * /all:
 *   get:
 *     summary: return all users
 *     tags:
 *       - User
 *     responses:
 *       '200':
 *         description: all users
 *         content:
 *          application/json:
 *           schema:
 *            type: array
 *            items:
 *              $ref: '#/components/schemas/User'
 *       '500':
 *         description: Internal Server Error
 */
router.get("/all", async (req, res) => {
    try {
        const users = await User.find({});
        res.send(users);
    } catch (e) {
        res.status(500).send();
    }
});

router.get("/user/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }
        res.send(user);
    } catch (e) {
        res.status(500).send();
    }
});

//login user
/**
 * @swagger
 * /user/login:
 *   post:
 *     summary: Log in a user
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       '200':
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       '400':
 *         description: Invalid email or password
 *       '500':
 *         description: Internal server error
 */
router.post("/user/login", async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        res.send({ user, token });
    } catch (e) {
        res.status(401).send({ error: "Invalid email or password" });
    }
});

//return user profile
/**
 * @swagger
 * /user/me:
 *   get:
 *     summary: Retrieve the authenticated user's profile
 *     description: Use this endpoint to retrieve the profile information of the currently authenticated user. Authentication is required to access this endpoint.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Return the user's profile and authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: The authentication token for the user
 *       '400':
 *         description: The request was invalid or malformed
 *       '401':
 *         description: The user is not authenticated or the authentication token is invalid or expired
 *       '404':
 *         description: The authenticated user's profile could not be found
 */
router.get("/user/me", auth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(404).send({ error: "The authenticated user's profile could not be found" });
        }
        res.send({ user: req.user, token: req.token });
    } catch (e) {
        res.status(500).send({ error: "An error occurred while retrieving the authenticated user's profile" });
    }
});

//add a new friend
/**
 * @swagger
 * /user/addFriend/{id}:
 *  post:
 *   summary: Add a new friend
 *   description: Use this endpoint to add a new friend to the authenticated user's friend list. Authentication is required to access this endpoint.
 *   tags: [User]
 *   security:
 *    - bearerAuth: []
 *   parameters:
 *     - in: path
 *       name: id
 *       schema:
 *        type: string
 *        required: true
 *        description: The ID of the friend to add
 *   responses:
 *    '200':
 *       description: The friend was successfully added
 *    '400':
 *       description: The friend could not be added
 *    '404':
 *       description: The user or friend could not be found
 *    '500':
 *       description: Internal server error
 */
router.post("/user/addFriend/:id", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        const friend = await User.findById(req.params.id);
        if (!friend) {
            return res.status(404).send({ error: "Friend not found" });
        }

        const isFriend = user.friends.find((f) => f.friend.toString() === friend._id.toString());

        if (isFriend) {
            return res.status(400).send({ error: "Friend already added" });
        }

        user.friends.push({ friend: friend._id });
        await user.save();

        res.send({ message: "Friend added successfully", user });
    } catch (error) {
        res.status(500).send({ error: "Internal server error" });
    }
});

//get all friends
/**
 * @swagger
 * /user/getFriends:
 *   get:
 *    summary: Retrieve the authenticated user's friends
 *    description: Use this endpoint to retrieve the friends of the currently authenticated user. Authentication is required to access this endpoint.
 *    tags: [User]
 *    security:
 *      - bearerAuth: []
 *    responses:
 *     '200':
 *          description: Return the user's friends
 *          content:
 *              application/json:
 *                 schema:
 *                 type: array
 *                 items:
 *                 $ref: '#/components/schemas/User'
 *     '400':
 *         description: The request was invalid or malformed
 *     '401':
 *         description: The user is not authenticated or the authentication token is invalid or expired
 *     '404':
 *         description: The authenticated user's profile could not be found
 *     '500':
 *         description: Internal server error
 */
router.get("/user/getFriends", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate("friends.friend"); //populate the friends array with the friend object
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        const friends = user.friends.map((f) => f.friend);
        res.send(friends);
    } catch (error) {
        res.status(500).send({ error: "Internal server error" });
    }
});

//delete a friend
/**
 * @swagger
 * /user/deleteFriend/{id}:
 *  delete:
 *   summary: Delete a friend
 *   description: Use this endpoint to delete a friend from the authenticated user's friend list. Authentication is required to access this endpoint.
 *   tags: [User]
 *   security:
 *   - bearerAuth: []
 *   parameters:
 *    - in: path
 *      name: id
 *      schema:
 *      type: string
 *      required: true
 *      description: The ID of the friend to delete
 *   responses:
 *    '200':
 *       description: The friend was successfully deleted
 *    '400':
 *       description: The friend could not be deleted
 *    '404':
 *       description: The user or friend could not be found
 *    '500':
 *       description: Internal server error
 */
router.delete("/user/deleteFriend/:id", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        const friend = await User.findById(req.params.id);
        if (!friend) {
            return res.status(404).send({ error: "Friend not found" });
        }

        user.friends = user.friends.filter((f) => f.friend.toString() !== friend._id.toString());
        await user.save();
        res.send({ message: "Friend deleted successfully", user });
    } catch (error) {
        res.status(500).send({ error: "Internal server error" });
    }
});

//logout user
/**
 * @swagger
 * /user/logout:
 *   post:
 *      summary: Logout the authenticated user
 *      description: Use this endpoint to logout the currently authenticated user. Authentication is required to access this endpoint.
 *      tags: [User]
 *      security:
 *          - bearerAuth: []
 *      responses:
 *          '200':
 *               description: The user was successfully logged out
 *          '401':
 *              description: The user is not authenticated or the authentication token is invalid or expired
 *          '500':
 *              description: Internal server error
 */
router.post("/user/logout", auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token;
        });

        await req.user.save();
        res.send("Logged out");
    } catch (e) {
        console.log(e);
        res.status(500).send({ error: "Internal server error" });
    }
});

//delete user
/**
 * @swagger
 * /user/deleteAccount:
 *  delete:
 *      summary: Delete the authenticated user's account
 *      description: Use this endpoint to delete the currently authenticated user's account. Authentication is required to access this endpoint.
 *      tags: [User]
 *      security:
 *         - bearerAuth: []
 *      responses:
 *         '200':
 *            description: The user's account was successfully deleted
 *         '401':
 *            description: The user is not authenticated or the authentication token is invalid or expired
 *         '500':
 *            description: Internal server error
 */
router.delete("/user/deleteAccount", auth, async (req, res) => {
    try {
        const delteUser = await User.findByIdAndDelete({ _id: req.user._id });

        if (delteUser) {
            await Post.deleteMany({ userId: req.user._id });
            //eliminar el usuario de los amigos de los demas
            const users = await User.find();
            users.forEach(async (user) => {
                user.friends = user.friends.filter((f) => f.friend.toString() !== req.user._id.toString());
                await user.save();
            });
        }
        res.send("Account deleted");
    } catch (e) {
        res.status(500).send("something went wrong");
    }
});

//get user by nickname
router.get("/user/nickname/:nickname", async (req, res) => {
    try {
        const user = await User.findOne({ nickname: req.params.nickname });
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }
        res.send(user);
    } catch (error) {
        res.status(500).send({ error: "Internal server error" });
    }
});

//obtener todos los friends de un usuario
router.get("/user/getFriends/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("friends.friend"); //populate the friends array with the friend object
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        const friends = user.friends.map((f) => f.friend);
        res.send(friends);
    } catch (error) {
        res.status(500).send({ error: "Internal server error" });
    }
} );

// actualizar usuario logueado

router.patch("/user/update", auth, async (req, res) => {
    try {
        const updates = Object.keys(req.body);
        const allowedUpdates = ["nickname", "email", "password", "name", "lastName", "age", "bio", "avatar"];
        const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).send({ error: "Invalid updates" });
        }

        updates.forEach((update) => (req.user[update] = req.body[update]));
        await req.user.save();
        res.send(req.user);
    } catch (error) {
        res.status(500).send({ error: "Internal server error" });
    }
});



 

module.exports = router;
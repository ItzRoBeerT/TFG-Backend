const express = require("express");
const User = require("../models/User");
const router = new express.Router();
const auth = require("../middleware/auth");
const Post = require("../models/Post");

router.post("/createAccount", async (req, res) => {
  const user = new User(req.body);
  try {
    await user.save();
    res.send("account created");
  } catch (e) {
    res.send(e);
  }
});

router.get("/hello", (req, res) => {
  res.send("Hello World!");
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password);
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (e) {
    res.status(400).send();
  }
});

router.get("/me", auth, async (req, res) => {
  res.send(req.user);
});

//add a new friend
router.post("/addFriend/:id", auth, async (req, res) => {
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

    res.send("Friend added");
  } catch (error) {
    res.status(500).send({ error: "Internal server error" });
  }
});

//get all friends
router.get("/getFriends", auth, async (req, res) => {
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
router.delete("/deleteFriend/:id", auth, async (req, res) => {
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
    res.send("Friend deleted");
  } catch (error) {
    res.status(500).send({ error: "Internal server error" });
  }
});

//logout
router.get("/logout", auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token;
    });
    await req.user.save();
    res.send("Logged out");
  } catch (e) {
    res.status(500).send({ error: "Internal server error" });
  }
});

//delete user
router.delete("/deleteAccount", auth, async (req, res) => {
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

module.exports = router;

const express = require("express");
const User = require("../models/User");
const router = new express.Router();
const auth = require("../middleware/auth");

router.post("/createAccount", async (req, res) => {
  const user = new User(req.body);
  try {
    await user.save();
  } catch (e) {
    res.send(e);
  }
});
router.get("/hello", (req, res) => {
  res.send("Hello World!");
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (e) {
    res.status(400).send();
  }
});

router.get("/me", auth, async (req, res) => {
  res.send(req.user);
});

router.get("/logout", auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token;
    });
    await req.user.save();
    res.send("Logged out");
  } catch (e) {
    res.status(500).send();
  }
});

module.exports = router;

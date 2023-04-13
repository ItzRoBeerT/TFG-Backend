const express = require("express");

require("./db/mongoose");
const userRouter = require("./routers/User");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(userRouter);

app.listen(port, () => {
  console.log("Server is up on port " + port);
});

//the url is 
//http://localhost:3000/createAccount

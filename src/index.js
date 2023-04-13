const express = require("express");

require("./db/mongoose");
const userRouter = require("./routers/User");
const postRouter = require("./routers/Post");

const app = express();
const port = process.env.PORT; 

app.use(express.json());
app.use(userRouter);
app.use(postRouter);

app.listen(port, () => {
  console.log("Server is up on port " + port);
});

//the url is 
//http://localhost:3000/createAccount

//to run the project use the command 

/*
login
{
     "email":"thisismytest1@gmail.com",
     "password": "qwerty12"
}

*/
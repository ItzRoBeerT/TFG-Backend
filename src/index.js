const express = require("express");
const cors = require("cors");
require("./db/mongoose");
const userRouter = require("./routers/User");
const postRouter = require("./routers/Post");

// settings
const app = express();
const port = process.env.PORT;

//#region swagger
const path = require("path");

//swagger
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Social Media API",
            version: "1.0.0",
        },
        servers: [
            {
                url: "https://tfg-backend.vercel.app/",
                
            },
        ],
    },
    apis: [`${path.join(__dirname, "./routers/*.js")}`],
};
app.use("/api-doc", swaggerUI.serve, swaggerUI.setup(swaggerJsDoc(swaggerOptions)));
//#endregion

// middlewares
app.use(cors());
app.use(express.json());
app.use(userRouter);
app.use(postRouter);


app.listen(port, () => {
    console.log("Server is up on port " + port);
});
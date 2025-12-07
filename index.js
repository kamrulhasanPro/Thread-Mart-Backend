// defined
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const app = express();
const port = process.env.PORT || 2000;

// middleware
dotenv.config();
app.use(express.json());
app.use(cors());
app.use(async (req, res, next) => {
  console.log(
    `🔰Now api call ${req.host} 🌐from ${
      req.url
    } 🕑 at ${new Date().toLocaleString()}`
  );
  next();
});

// connect mongodb
const client = new MongoClient(process.env.MONGODB_URI);
client.connect().then(() => {
  app.listen(port, (req, res) => {
    console.log("MongoDb and Server running.");
  });
});

// basic
app.get("/", (req, res) => {
  return res.json({
    status: 200,
    message: "Server is running now",
  });
});

// error
app.get(/.*/, (req, res) => {
  return res.json({
    status: 404,
    message: "Not Found Page",
  });
});

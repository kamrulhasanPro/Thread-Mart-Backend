require("dotenv").config();
const { MongoClient } = require("mongodb");

// connect mongodb
const mongoUri = process.env.MONGODB_URI;
console.log({mongoUri})
const client = new MongoClient(process.env.MONGODB_URI);
// db collection
const db = client.db("ThreadMart");

const usersCollection = db.collection("users");
const productsCollection = db.collection("products");
const ordersCollection = db.collection("orders");
const trackingCollection = db.collection("trackingOrders");

module.exports = {
    client,
    db,
    usersCollection,
    productsCollection,
    ordersCollection,
    trackingCollection,
};

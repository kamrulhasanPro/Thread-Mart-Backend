require("dotenv").config();
const { MongoClient } = require("mongodb");

// connect mongodb
const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri);
// db collection
const db = client.db("ThreadMart");

const usersCollection = db.collection("users");
const productsCollection = db.collection("products");
const ordersCollection = db.collection("orders");
const trackingCollection = db.collection("trackingOrders");

const connectDB = async () => {
    if (!mongoUri) {
        throw new Error("MONGODB_URI is not defined");
    }

    await client.connect();
    console.log("MongoDB connected successfully.");
};

module.exports = {
    client,
    db,
    usersCollection,
    productsCollection,
    ordersCollection,
    trackingCollection,
    connectDB,
};

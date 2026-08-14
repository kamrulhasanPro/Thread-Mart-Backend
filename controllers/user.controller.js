const { ObjectId } = require("mongodb");
const { usersCollection } = require("../config/db");
const { createToken } = require("../utils/createToken");

// ------------User------------
const registerUser = async (req, res) => {
    const { name, email, photoURL, role } = req.body;
    console.log(req.body);
    try {
        const isExist = await usersCollection.findOne({ email });

        if (isExist) {
            return res.send({ message: "user already exist" });
        }
        const newUser = {
            name,
            email,
            photoURL,
            status: "pending",
            role,
        };
        console.log(newUser);
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
    } catch (error) {
        console.log("user register post api problem.", error);
        res.status(500).json({
            status: 500,
            message: "User register api some problem.",
        });
    }
};

// user login
const loginUser = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await usersCollection.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "User Not find",
            });
        }

        const token = createToken(user);

        const isProd = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: isProd ? "none" : "lax",
            secure: isProd,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            message: "Login successful",
        });
    } catch (error) {
        console.log("user login post api problem.", error);
        res.status(500).json({
            status: 500,
            message: "User login api some problem.",
        });
    }
};

// logout
const logoutUser = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    });

    res.json({ message: "Logged out successfully" });
};

// get a user
const getUserByEmail = async (req, res) => {
    try {
        const query = { email: req.params.email };
        const result = await usersCollection.findOne(query);
        res.json(result);
    } catch (error) {
        console.log("user role get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "user role get api some problem. it",
            
        });
    }
};

// get users
const getUsers = async (req, res) => {
    try {
        const { search, status } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        if (status) {
            query.status = status;
        }
        const result = await usersCollection.find(query).toArray();
        res.json(result);
    } catch (error) {
        console.log("users get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "users get api some problem.",
        });
    }
};

// update user status
const updateUserStatus = async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const update = req.body;
        const result = await usersCollection.updateOne(query, {
            $set: update,
        });
        console.log(update);
        res.json(result);
        console.log(query, update);
    } catch (error) {
        console.log("user Status patch api problem.", error);
        res.status(500).json({
            status: 500,
            message: "user Status patch api some problem.",
        });
    }
};

// update user profile
const updateUserProfile = async (req, res) => {
    try {
        const update = { $set: req.body };
        const { email } = req.params;
        const query = { email };
        const result = await usersCollection.updateOne(query, update);
        return res.json(result);
    } catch (error) {
        console.log("user update profile patch api problem.", error);
        res.status(500).json({
            status: 500,
            message: "user update profile patch api some problem.",
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getUserByEmail,
    getUsers,
    updateUserStatus,
    updateUserProfile,
};

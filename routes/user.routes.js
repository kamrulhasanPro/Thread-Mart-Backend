const express = require("express");
const router = express.Router();
const {
    verifyToken,
} = require("../middleware/verifyToken");
const {
    verifyRole,
} = require("../middleware/verifyRole");
const {
    registerUser,
    loginUser,
    logoutUser,
    getUserByEmail,
    getUsers,
    updateUserStatus,
    updateUserProfile,
} = require("../controllers/user.controller");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/user/:email", getUserByEmail);
router.get("/users", verifyToken, verifyRole("admin"), getUsers);
router.patch("/user/:id/update", verifyToken, verifyRole("admin"), updateUserStatus);
router.patch(
    "/user/:email/profile",
    verifyToken,
    verifyRole("buyer", "admin", "manager"),
    updateUserProfile
);

module.exports = router;

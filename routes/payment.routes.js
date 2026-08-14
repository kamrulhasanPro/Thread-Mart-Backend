const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/verifyToken");
const { verifyRole } = require("../middleware/verifyRole");
const {
    createCheckoutSession,
    getSessionStatus,
} = require("../controllers/payment.controller");

router.post(
    "/create-checkout-session",
    verifyToken,
    verifyRole("buyer"),
    createCheckoutSession
);
router.get("/session-status", getSessionStatus);

module.exports = router;

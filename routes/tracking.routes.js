const express = require("express");
const router = express.Router();
const { addTracking, getTracking } = require("../controllers/tracking.controller");

router.patch("/tracking-add/:orderId", addTracking);
router.get("/tracking-get/:orderId", getTracking);

module.exports = router;

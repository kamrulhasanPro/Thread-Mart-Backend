const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/verifyToken");
const { verifyRole } = require("../middleware/verifyRole");
const {
    getAdminDashboardStats,
    getManagerDashboardStats,
    getBuyerDashboardStats,
    getOrderStats,
    getOrderStatusStats,
    getBuyerSpendMoney,
} = require("../controllers/dashboard.controller");

router.get("/admin/dashboard-stats", verifyToken, verifyRole("admin"), getAdminDashboardStats);
router.get("/manager/dashboard-stats", verifyToken, verifyRole("manager"), getManagerDashboardStats);
router.get("/buyer/dashboard-stats", verifyToken, verifyRole("buyer"), getBuyerDashboardStats);
router.get("/order-stats", verifyToken, verifyRole("admin", "manager", "buyer"), getOrderStats);
router.get("/orderStatus-stats", verifyToken, verifyRole("admin", "manager", "buyer"), getOrderStatusStats);
router.get("/buyer-spend-money", verifyToken, verifyRole("buyer"), getBuyerSpendMoney);

module.exports = router;

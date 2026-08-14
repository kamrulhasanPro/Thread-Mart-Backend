const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/verifyToken");
const { verifyRole } = require("../middleware/verifyRole");
const {
    createOrder,
    getOrdersByManagerStatus,
    getOrderById,
    updateOrderStatus,
    getMyOrders,
    getAllOrders,
    deleteOrder,
} = require("../controllers/order.controller");

router.post("/orders", verifyToken, verifyRole("buyer"), createOrder);
router.get("/orders/:email/orderStatus", verifyToken, verifyRole("manager"), getOrdersByManagerStatus);
router.get("/order/:id/specific", getOrderById);
router.patch("/orders/:id/statusUpdate", verifyToken, verifyRole("manager"), updateOrderStatus);
router.get("/my-orders/:email", verifyToken, verifyRole("buyer"), getMyOrders);
router.get("/all-orders", verifyToken, verifyRole("admin"), getAllOrders);
router.delete("/order/:id/delete", verifyToken, verifyRole("buyer"), deleteOrder);

module.exports = router;

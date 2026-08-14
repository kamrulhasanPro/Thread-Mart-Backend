const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/verifyToken");
const { verifyRole } = require("../middleware/verifyRole");
const {
    getProducts,
    getManageProducts,
    getProductById,
    createProduct,
    deleteProduct,
    updateProduct,
    getAllProductsAdmin,
} = require("../controllers/product.controller");

router.get("/products", getProducts);
router.get("/manage-product", verifyToken, verifyRole("manager"), getManageProducts);
router.get("/product/:id/specific", getProductById);
router.post("/product/post", verifyToken, verifyRole("manager"), createProduct);
router.delete("/product/:id/delete", verifyToken, verifyRole("manager", "admin"), deleteProduct);
router.patch("/product/:id/update", verifyToken, verifyRole("admin", "manager"), updateProduct);
router.get("/manage-all-products", verifyToken, verifyRole("admin"), getAllProductsAdmin);

module.exports = router;

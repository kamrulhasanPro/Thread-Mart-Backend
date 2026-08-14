const { ObjectId } = require("mongodb");
const { ordersCollection, trackingCollection } = require("../config/db");
const { generateTrackingNumber } = require("../utils/generateTrackingNumber");

// ---------------orders-----------
const createOrder = async (req, res) => {
    if (req.user.status === "suspend") {
        return res.status(403).json({
            message: `Your Account has been suspend. Please contact with admin.`,
        });
    }

    try {
        const newOrder = req.body;
        const checkProduct = await ordersCollection.findOne({
            productId: newOrder?.productId,
            orderStatus: "pending",
            "customer.buyerEmail": newOrder.customer.buyerEmail,
        });
        console.log(checkProduct);
        if (checkProduct)
            return res.send({
                status: 409,
                message:
                    "Already add this product please wait for rejected or approved.",
            });
        const result = await ordersCollection.insertOne(newOrder);
        res.send(result);
    } catch (error) {
        console.log("A order post api problem.", error);
        res.status(500).json({
            status: 500,
            message: "A order post api some problem.",
        });
    }
};

// get pending or approved order
const getOrdersByManagerStatus = async (req, res) => {
    try {
        const email = req.params.email;
        const { status } = req.query;
        console.log(email, status);
        const result = await ordersCollection
            .find({
                managerEmail: email,
                orderStatus:
                    status === "approved"
                        ? { $nin: ["pending", "rejected", "Delivered"] }
                        : status,
            })
            .toArray();
        res.json(result);
    } catch (error) {
        console.log("pending/approve orders get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "pending/approve orders get api some problem.",
        });
    }
};

// a orders get
const getOrderById = async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await ordersCollection.findOne(query);
        res.json(result);
    } catch (error) {
        console.log("a orders get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "a orders get api some problem.",
        });
    }
};

// update order status
const updateOrderStatus = async (req, res) => {
    if (req.user.status === "suspend") {
        return res.status(403).json({
            message: `Your Account has been suspend. Please contact with admin.`,
        });
    }
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const update = req.body;
        console.log(update);
        if (update.orderStatus === "approved") {
            update.approvedAt = new Date();
            const result = await ordersCollection.updateOne(query, {
                $set: update,
            });

            const track = await trackingCollection.insertOne({
                orderId: req.params.id,
                trackingNumber: generateTrackingNumber(),
                updates: [
                    {
                        status: "Picked",
                        location: "Warehouse",
                        note: "Ready to ship",
                        updateAt: new Date(),
                    },
                ],
            });
            console.log(track);
            res.json(result);
        } else {
            const result = await ordersCollection.updateOne(query, {
                $set: update,
            });
            res.json(result);
            console.log(query, update);
        }
    } catch (error) {
        console.log("orderStatus patch api problem.", error);
        res.status(500).json({
            status: 500,
            message: "orderStatus patch api some problem.",
        });
    }
};

// get my-orders for buyer
const getMyOrders = async (req, res) => {
    try {
        const query = { "customer.buyerEmail": req.params.email };
        const result = await ordersCollection.find(query).toArray();
        res.json(result);
    } catch (error) {
        console.log("my-orders get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "my-orders get api some problem.",
        });
    }
};

// all orders
const getAllOrders = async (req, res) => {
    try {
        const { search, status } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: "i" } },
                { "customer.buyerEmail": { $regex: search, $options: "i" } },
            ];
        }

        if (status) {
            query.orderStatus = status;
        }

        console.log(query);
        const result = await ordersCollection.find(query).toArray();
        res.json(result);
    } catch (error) {
        console.log("all orders get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "all orders get api some problem.",
        });
    }
};

// delete my-order for buyer
const deleteOrder = async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await ordersCollection.deleteOne(query);
        res.json(result);
    } catch (error) {
        console.log("order delete api problem.", error);
        res.status(500).json({
            status: 500,
            message: "orders delete api some problem.",
        });
    }
};

module.exports = {
    createOrder,
    getOrdersByManagerStatus,
    getOrderById,
    updateOrderStatus,
    getMyOrders,
    getAllOrders,
    deleteOrder,
};

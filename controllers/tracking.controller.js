const { ObjectId } = require("mongodb");
const { ordersCollection, trackingCollection } = require("../config/db");

// --------------tracking timeline----------
const addTracking = async (req, res) => {
    const updateTrack = req.body;
    updateTrack.updateAt = new Date();
    const query = { orderId: req.params.orderId };
    try {
        const result = await trackingCollection.updateOne(
            query,
            {
                $push: { updates: updateTrack },
            },
            { upsert: true }
        );

        const updateOrderStatus = await ordersCollection.updateOne(
            { _id: new ObjectId(req.params.orderId) },
            {
                $set: { orderStatus: updateTrack.status },
            }
        );
        res.json(result);
    } catch (error) {
        console.log("new tracking updated or add  api problem.", error);
        res.status(500).json({
            status: 500,
            message: "new tracking updated or add api some problem.",
        });
    }
};

// tracking add
const getTracking = async (req, res) => {
    try {
        const query = { orderId: req.params.orderId };
        const result = await trackingCollection.findOne(query);
        res.json(result);
    } catch (error) {
        console.log("get tracking api problem.", error);
        res.status(500).json({
            status: 500,
            message: "get tracking api some problem.",
        });
    }
};

module.exports = {
    addTracking,
    getTracking,
};

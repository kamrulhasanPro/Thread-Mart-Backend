const { usersCollection, productsCollection, ordersCollection } = require("../config/db");

// states admin
const getAdminDashboardStats = async (req, res) => {
    const totalUsers = await usersCollection.countDocuments();
    const totalProducts = await productsCollection.countDocuments();
    const totalOrders = await ordersCollection.countDocuments();

    const totalManagers = await usersCollection.countDocuments({
        role: "manager",
    });

    res.json({
        totalUsers,
        totalManagers,
        totalProducts,
        totalOrders,
    });
};

// states manager
const getManagerDashboardStats = async (req, res) => {
    const myProducts = await productsCollection.countDocuments({
        managerEmail: req.user.email,
    });

    const pendingOrders = await ordersCollection.countDocuments({
        managerEmail: req.user.email,
        orderStatus: "pending",
    });

    const approvedOrders = await ordersCollection.countDocuments({
        managerEmail: req.user.email,
        orderStatus: { $nin: ["pending", "rejected", "Delivered"] },
    });

    const deliveredOrders = await ordersCollection.countDocuments({
        managerEmail: req.user.email,
        orderStatus: "Delivered",
    });

    res.json({
        myProducts,
        pendingOrders,
        approvedOrders,
        deliveredOrders,
    });
};

// states buyer
const getBuyerDashboardStats = async (req, res) => {
    const myOrders = await ordersCollection.countDocuments({
        "customer.buyerEmail": req.user.email,
    });

    const pendingOrders = await ordersCollection.countDocuments({
        "customer.buyerEmail": req.user.email,
        orderStatus: "pending",
    });

    const deliveredOrders = await ordersCollection.countDocuments({
        "customer.buyerEmail": req.user.email,
        orderStatus: "Delivered",
    });

    const rejectedOrders = await ordersCollection.countDocuments({
        "customer.buyerEmail": req.user.email,
        orderStatus: "rejected",
    });

    res.json({
        myOrders,
        pendingOrders,
        rejectedOrders,
        deliveredOrders,
    });
};

// --------rechart data------------
// order total and revenue
const getOrderStats = async (req, res) => {
    console.log(req.user);
    const { role, email } = req.user;
    const query = {};
    if (role === "manager") {
        query.orderStatus = "Delivered";
        query.managerEmail = email;
    } else if (role === "admin") {
        query.orderStatus = "Delivered";
    } else if (role === "buyer") {
        query.orderStatus = "Delivered";
        query["customer.buyerEmail"] = email;
    }
    try {
        const getOrderStats = await ordersCollection
            .aggregate([
                {
                    $addFields: { createdAtDate: { $toDate: "$createdAt" } },
                },
                {
                    $match: query,
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$createdAtDate" },
                        },
                        totalOrders: {
                            $sum: 1,
                        },
                        revenue: {
                            $sum: "$totalPrice",
                        },
                    },
                },
                {
                    $sort: { _id: 1 },
                },
            ])
            .toArray();

        res.json(getOrderStats);
    } catch (error) {
        console.log("rechart orders stats get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "rechart orders stats get api some problem.",
        });
    }
};

// order status
const getOrderStatusStats = async (req, res) => {
    try {
        const { role, email } = req.user;
        const query = {};
        if (role === "manager") {
            query.managerEmail = email;
        } else if (role === "buyer") {
            query["customer.buyerEmail"] = email;
        }

        const getOrderStatusStats = await ordersCollection
            .aggregate([
                {
                    $match: query,
                },
                {
                    $group: {
                        _id: "$orderStatus",
                        orders: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        status: "$_id",
                        orders: 1,
                    },
                },
            ])
            .toArray();

        const STATUS_MAP = {
            pending: ["pending"],
            approved: [
                "approved",
                "packed",
                "picked",
                "shipped",
                "out for delivery",
                "in transit",
            ],
            delivered: ["delivered"],
            rejected: ["rejected"],
        };

        const normalize = getOrderStatusStats.map((item) => {
            return {
                status: item.status.toLowerCase(),
                orders: item?.orders,
            };
        });

        const finalData = Object.keys(STATUS_MAP).map((finalStatus) => {
            const relatedStatuses = STATUS_MAP[finalStatus];

            const totalOrders = normalize
                .filter((item) => relatedStatuses.includes(item.status))
                .reduce((per, next) => per + next.orders, 0);

            return {
                status: finalStatus,
                orders: totalOrders,
            };
        });
        console.log(finalData);
        res.json(finalData);
    } catch (error) {
        console.log("rechart order status stats get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "rechart orders status stats get api some problem.",
        });
    }
};

// buyer total spend money
const getBuyerSpendMoney = async (req, res) => {
    try {
        const { email } = req.user;
        const getSpendMoney = await ordersCollection
            .aggregate([
                {
                    $match: { "customer.buyerEmail": email },
                },
                {
                    $group: {
                        _id: { $toDate: "$createdAt" },
                    },
                },
            ])
            .toArray();
        res.json(getSpendMoney);
    } catch (error) {
        console.log("rechart buyer spend money get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "rechart buyer spend money get api some problem.",
        });
    }
};

module.exports = {
    getAdminDashboardStats,
    getManagerDashboardStats,
    getBuyerDashboardStats,
    getOrderStats,
    getOrderStatusStats,
    getBuyerSpendMoney,
};

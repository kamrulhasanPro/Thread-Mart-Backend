const { ObjectId } = require("mongodb");
const { productsCollection } = require("../config/db");

// -----------------product-----------------
const getProducts = async (req, res) => {
    try {
        const { limit, search, category, showOnHomePage, skip, sort } = req.query;
        const query = {};
        if (category) {
            query.category = category;
        }
        if (showOnHomePage) {
            query.showOnHomePage = Boolean(showOnHomePage);
        }

        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: "i" } },
                { "customer.buyerEmail": { $regex: search, $options: "i" } },
            ];
        }

        const sorting = {};
        if (sort === "latest") {
            sorting.createdAt = -1;
        } else if (sort === "oldest") {
            sorting.createdAt = 1;
        }

        const result = await productsCollection
            .find(query)
            .sort(sorting)
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .toArray();
        const quantity = await productsCollection.countDocuments();
        console.log(query, quantity);

        res.send({ result, quantity });
    } catch (error) {
        console.log("all product get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "all product get api some problem.",
        });
    }
};

// get manager product
const getManageProducts = async (req, res) => {
    try {
        const { email, search, filter } = req.query;
        const query = {};
        if (email) {
            query.managerEmail = email;
        }
        if (search) {
            query.productName = { $regex: search, $options: "i" };
        }

        if (filter) {
            query.category = filter;
        }
        console.log(query);
        const result = await productsCollection.find(query).toArray();
        res.send(result);
    } catch (error) {
        console.log("manage product get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "manage product get api some problem.",
        });
    }
};

// a product get
const getProductById = async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await productsCollection.findOne(query);
        res.send(result);
    } catch (error) {
        console.log("A product get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "A product get api some problem.",
        });
    }
};

// a product post
const createProduct = async (req, res) => {
    if (req.user.status === "suspend") {
        return res.status(403).json({
            message: `Your Account has been suspend. Please contact with admin.`,
        });
    }
    try {
        const newProduct = req.body;
        const result = await productsCollection.insertOne(newProduct);
        res.send(result);
    } catch (error) {
        console.log("A product post api problem.", error);
        res.status(500).json({
            status: 500,
            message: "A product post api some problem.",
        });
    }
};

// a product delete
const deleteProduct = async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await productsCollection.deleteOne(query);
        res.send(result);
    } catch (error) {
        console.log("A product delete api problem.", error);
        res.status(500).json({
            status: 500,
            message: "A product delete api some problem.",
        });
    }
};

// a product update
const updateProduct = async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const update = { $set: req.body };
        const result = await productsCollection.updateOne(query, update, {
            upsert: true,
        });
        res.send(result);
    } catch (error) {
        console.log("A product update api problem.", error);
        res.status(500).json({
            status: 500,
            message: "A product update api some problem.",
        });
    }
};

// get all product
const getAllProductsAdmin = async (req, res) => {
    try {
        const result = await productsCollection.find().toArray();
        res.send(result);
    } catch (error) {
        console.log("manage all product get api problem.", error);
        res.status(500).json({
            status: 500,
            message: "manage all product get api some problem.",
        });
    }
};

module.exports = {
    getProducts,
    getManageProducts,
    getProductById,
    createProduct,
    deleteProduct,
    updateProduct,
    getAllProductsAdmin,
};

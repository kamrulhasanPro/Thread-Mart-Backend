// defined
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ObjectId } = require("mongodb");
const Stripe = require("stripe");

const app = express();
const port = process.env.PORT || 2000;

// middleware
dotenv.config();
app.use(
  cors({
    origin: [`${process.env.YOUR_DOMAIN}`, "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
app.use(async (req, res, next) => {
  console.log(
    `🔰Now api call ${req.host} 🌐from ${
      req.url
    } 🕑 at ${new Date().toLocaleString()}`
  );
  next();
});

// tracking number create
const generateTrackingNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TRK-${date}-${random}`;
};

// verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// verify role
const verifyRoll = (...allowsRole) => {
  return async (req, res, next) => {
    console.log(allowsRole);
    const user = await usersCollection.findOne({ email: req.user?.email });
    req.user.status = user?.status;
    const role = user?.role;
    if (!allowsRole.includes(role)) {
      return res.status(403).json({
        message: `you are forbidden user. not access for ${allowsRole}`,
      });
    }
    next();
  };
};

// connect mongodb
const client = new MongoClient(process.env.MONGODB_URI);
client.connect().then(() => {
  app.listen(port, (req, res) => {
    console.log("MongoDb and Server running.");
  });
});
// db collection
const db = client.db("ThreadMart");
const usersCollection = db.collection("users");
const productsCollection = db.collection("products");
const ordersCollection = db.collection("orders");
const trackingCollection = db.collection("trackingOrders");

// ------------User------------
app.post("/register", async (req, res) => {
  const { name, email, photoURL, role } = req.body;
  console.log(req.body);
  try {
    // checkUser
    const isExist = await usersCollection.findOne({ email });

    if (isExist) {
      return res.send({ message: "user already exist" });
    }
    const newUser = {
      name,
      email,
      photoURL,
      status: "pending",
      role,
    };
    console.log(newUser);
    const result = await usersCollection.insertOne(newUser);
    res.send(result);
  } catch (error) {
    console.log("user register post api problem.", error);
    res.status(500).json({
      status: 500,
      message: "User register api some problem.",
    });
  }
});

// create token use function
const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// user login
app.post("/login", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "User Not find",
      });
    }

    // token create
    const token = createToken(user);

    // set cookie
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Login successful",
    });
  } catch (error) {
    console.log("user login post api problem.", error);
    res.status(500).json({
      status: 500,
      message: "User login api some problem.",
    });
  }
});

// logout
app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  res.json({ message: "Logged out successfully" });
});

// get a user
app.get("/user/:email", async (req, res) => {
  try {
    const query = { email: req.params.email };
    const result = await usersCollection.findOne(query);
    res.json(result);
  } catch (error) {
    console.log("user role get api problem.", error);
    res.status(500).json({
      status: 500,
      message: "user role get api some problem.",
    });
  }
});

// get users
app.get("/users", verifyToken, verifyRoll("admin"), async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }
    const result = await usersCollection.find(query).toArray();
    res.json(result);
  } catch (error) {
    console.log("users get api problem.", error);
    res.status(500).json({
      status: 500,
      message: "users get api some problem.",
    });
  }
});

// update user status
app.patch(
  "/user/:id/update",
  verifyToken,
  verifyRoll("admin"),
  async (req, res) => {
    try {
      const query = { _id: new ObjectId(req.params.id) };
      const update = req.body;
      const result = await usersCollection.updateOne(query, {
        $set: update,
      });
      console.log(update);
      res.json(result);
      console.log(query, update);
    } catch (error) {
      console.log("user Status patch api problem.", error);
      res.status(500).json({
        status: 500,
        message: "user Status patch api some problem.",
      });
    }
  }
);

// -----------------product-----------------
app.get("/products", async (req, res) => {
  try {
    const { limit, category, showOnHomePage, skip } = req.query;
    const query = {};
    if (category) {
      query.category = category;
    }
    if (showOnHomePage) {
      query.showOnHomePage = Boolean(showOnHomePage);
    }

    const result = await productsCollection
      .find(query)
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
});

// get manager product
app.get(
  "/manage-product",
  verifyToken,
  verifyRoll("manager"),
  async (req, res) => {
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
  }
);

// a product get
app.get("/product/:id/specific", async (req, res) => {
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
});

// a product post
app.post(
  "/product/post",
  verifyToken,
  verifyRoll("manager"),
  async (req, res) => {
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
  }
);

// a product delete
app.delete(
  "/product/:id/delete",
  verifyToken,
  verifyRoll("manager", "admin"),
  async (req, res) => {
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
  }
);

// a product update
app.patch(
  "/product/:id/update",
  verifyToken,
  verifyRoll("admin", "manager"),
  async (req, res) => {
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
  }
);

// get all product
app.get(
  "/manage-all-products",
  verifyToken,
  verifyRoll("admin"),
  async (req, res) => {
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
  }
);

// ---------------orders-----------
app.post("/orders", verifyToken, verifyRoll("buyer"), async (req, res) => {
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
});

// get pending or approved order
app.get(
  "/orders/:email/orderStatus",
  verifyToken,
  verifyRoll("manager"),
  async (req, res) => {
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
  }
);

// a orders get
app.get("/order/:id/specific", async (req, res) => {
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
});

// update order status
app.patch(
  "/orders/:id/statusUpdate",
  verifyToken,
  verifyRoll("manager"),
  async (req, res) => {
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

        // add tracking
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
  }
);

// get my-orders for buyer
app.get(
  "/my-orders/:email",
  verifyToken,
  verifyRoll("buyer"),
  async (req, res) => {
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
  }
);

// all orders
app.get("/all-orders", verifyToken, verifyRoll("admin"), async (req, res) => {
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
});

// delete my-order for buyer
app.delete(
  "/order/:id/delete",
  verifyToken,
  verifyRoll("buyer"),
  async (req, res) => {
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
  }
);

// --------------tracking timeline----------
// tracking add
app.patch("/tracking-add/:orderId", async (req, res) => {
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
});

app.get("/tracking-get/:orderId", async (req, res) => {
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
});

// --------------Stripe Payment------------
app.post(
  "/create-checkout-session",
  verifyToken,
  verifyRoll("buyer"),
  async (req, res) => {
    const {
      orderQuantity,
      productPrice,
      email,
      productId,
      productName,
      images,
      orderId,
    } = req.body;
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              images: [...images],
              metadata: {
                productId,
                email,
              },
            },
            unit_amount: productPrice,
          },
          quantity: Number(orderQuantity),
        },
      ],
      mode: "payment",
      customer_email: email,
      metadata: {
        productId,
        email,
        orderId,
      },
      success_url: `${process.env.YOUR_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.YOUR_DOMAIN}/payment-cancel?session_id={CHECKOUT_SESSION_ID}`,
    });

    res.json({ url: session.url });
  }
);

// stripe retrieve
app.get("/session-status", async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
  console.log(session);
  const query = {
    _id: new ObjectId(session.metadata.orderId),
  };

  const checkPayment = await ordersCollection.findOne(query);

  // check is payment paid?
  if (checkPayment?.paymentStatus === "paid") {
    return res.json({
      status: 409,
      message: "Payment already processed",
    });
  }

  // update payment status
  await ordersCollection.updateOne(query, {
    $set: { paymentStatus: session.payment_status },
  });

  res.send({
    status: session.status,
    transaction: session.payment_intent,
    customer_email: session.customer_details.email,
    amount: session.amount_total,
  });
});

// states admin
app.get(
  "/admin/dashboard-stats",
  verifyToken,
  verifyRoll("admin"),
  async (req, res) => {
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
  }
);

// states manager
app.get(
  "/manager/dashboard-stats",
  verifyToken,
  verifyRoll("manager"),
  async (req, res) => {
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
  }
);

// states buyer
app.get(
  "/buyer/dashboard-stats",
  verifyToken,
  verifyRoll("buyer"),
  async (req, res) => {
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
  }
);

// basic
app.get("/", (req, res) => {
  return res.json({
    status: 200,
    message: "Server is running now",
  });
});

// check profuse
app.get("/check-cookie", (req, res) => {
  res.json(req.cookies);
});

app.get(
  "/check-roll",
  verifyToken,
  verifyRoll("admin", "buyer"),
  (req, res) => {
    res.json(req.user.role);
  }
);

// not found page
app.get(/.*/, (req, res) => {
  return res.json({
    status: 404,
    message: "Not Found Page",
  });
});

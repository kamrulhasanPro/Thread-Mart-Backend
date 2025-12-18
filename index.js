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
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
dotenv.config();
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
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
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

// -----------------product-----------------
app.get("/products", async (req, res) => {
  try {
    const { limit, category } = req.query;
    const query = {};
    if (category) {
      query.category = category;
    }

    const result = await productsCollection
      .find(query)
      .limit(parseInt(limit))
      .toArray();
    res.send(result);
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
      const { email } = req.query;
      const query = {};
      if (email) {
        query.managerEmail = email;
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
app.post("/product/post", async (req, res) => {
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
});

// a product delete
app.delete(
  "/product/:id/delete",
  verifyToken,
  verifyRoll("manager"),
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
app.patch("/product/:id/update", async (req, res) => {
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
});

// ---------------orders-----------
app.post("/orders", async (req, res) => {
  try {
    const newOrder = req.body;
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

// --------------Stripe Payment------------
app.post("/create-checkout-session", async (req, res) => {
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
});

app.get("/session-status", async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
  console.log(session);
  const query = {
    _id: new ObjectId(session.metadata.orderId),
  };
  const checkPayment = await ordersCollection.findOne(query);
  console.log(checkPayment);
  if (checkPayment?.paymentStatus === "paid") {
    return res.json({
      status: 409,
      message: "Payment already processed",
    });
  }

  await ordersCollection.updateOne(query, {
    $set: { paymentStatus: session.payment_status },
  });

  res.send({
    status: session.status,
    customer_email: session.customer_details.email,
  });
});

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

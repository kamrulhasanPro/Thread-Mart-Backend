// defined
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const Stripe = require("stripe");
const { connectDB } = require("./config/db");
const { verifyToken } = require("./middleware/verifyToken");
const { verifyRole } = require("./middleware/verifyRole");
const userRoutes = require("./routes/user.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const trackingRoutes = require("./routes/tracking.routes");
const paymentRoutes = require("./routes/payment.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();
const port = process.env.PORT || 3000;

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
app.set("stripe", stripe);

app.use(async (req, res, next) => {
  console.log(
    `🔰Now api call ${req.host} 🌐from ${req.url
    } 🕑 at ${new Date().toLocaleString()}`
  );
  next();
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(port, () => {
      console.log("MongoDb and Server running.", port);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

startServer();

app.use(userRoutes);
app.use(productRoutes);
app.use(orderRoutes);
app.use(trackingRoutes);
app.use(paymentRoutes);
app.use(dashboardRoutes);

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
  verifyRole("admin", "buyer"),
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


module.exports = app;

// defined
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient } = require("mongodb");
const app = express();
const port = process.env.PORT || 2000;

// middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
dotenv.config();
app.use(express.json());
app.use(cookieParser());
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
  return (req, res, next) => {
    console.log(allowsRole);
    if (!allowsRole.includes(req.user.role)) {
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

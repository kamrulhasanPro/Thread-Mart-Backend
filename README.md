# Thread Mart Backend

Thread Mart Backend is the Node.js and Express API that powers the Thread Mart application. It handles user registration and login, product catalog management, order processing, Stripe checkout, order tracking, and role-based dashboard access using a MongoDB database.

---

# Features

## User management

- User registration with name, email, photo URL, role, and initial status of `pending`
- User login flow that issues a JWT and stores it in an HTTP-only cookie
- User logout that clears the auth cookie
- Fetching users by email or listing users with optional search/status filters
- Admin-controlled user status updates
- Profile updates for buyers, managers, and admins

## Product management

- Public product listing with optional filtering, pagination, search, and sorting
- Manager-only product management views
- Product detail lookup by ID
- Manager-only product creation
- Manager/admin product deletion
- Admin/manager product updates
- Admin-only listing of all products

## Order management

- Buyer-only order creation with duplicate prevention for the same pending product order
- Manager-only order review by manager email and status filter
- Order lookup by ID
- Manager-only order status updates
- Buyer-order history by email
- Admin-only listing of all orders
- Buyer-only order deletion

## Tracking

- Tracking timeline creation or update for an order ID
- Retrieval of tracking details by order ID
- Status updates to the corresponding order when tracking is added

## Payments

- Stripe Checkout session creation for buyer orders
- Retrieving the Stripe session status
- Updating the order `paymentStatus` after payment status retrieval

## Dashboard and statistics

- Admin dashboard summary counts for users, managers, products, and orders
- Manager dashboard summary for managed products and orders
- Buyer dashboard summary for personal orders
- Revenue/order trend data by day
- Order status aggregation data for charts
- Buyer spend summary endpoint

## Authorization and access control

- JWT-based token verification using cookies
- Role-based middleware checks for `admin`, `manager`, and `buyer`
- Suspend status enforcement for certain create/update flows

---

# Tech Stack

| Technology          | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| Node.js             | JavaScript runtime for the backend server       |
| Express.js          | Web framework for REST endpoints and middleware |
| MongoDB Node Driver | Database connection and document operations     |
| JWT                 | Token generation and verification               |
| Stripe              | Payment checkout and payment status retrieval   |
| CORS                | Cross-origin request handling                   |
| cookie-parser       | Reading and writing authenticated cookies       |
| dotenv              | Loading environment variables from `.env`       |
| nodemon             | Local development auto-reload                   |

---

# Project Structure

```text
THREAD-MART-BACKEND/
├── config/
│   └── db.js
├── controllers/
│   ├── dashboard.controller.js
│   ├── order.controller.js
│   ├── payment.controller.js
│   ├── product.controller.js
│   ├── tracking.controller.js
│   └── user.controller.js
├── middleware/
│   ├── verifyRole.js
│   └── verifyToken.js
├── public/
├── routes/
│   ├── dashboard.routes.js
│   ├── order.routes.js
│   ├── payment.routes.js
│   ├── product.routes.js
│   ├── tracking.routes.js
│   └── user.routes.js
├── utils/
│   ├── createToken.js
│   └── generateTrackingNumber.js
├── .env
├── .gitignore
├── index.js
├── package-lock.json
├── package.json
├── vercel.json
```

### `config/`

Database and MongoDB connection setup.

### `controllers/`

Application business logic for users, products, orders, tracking, payments, and dashboard analytics.

### `middleware/`

Token validation and role-based authorization checks.

### `routes/`

Express route definitions for the public API and protected endpoints.

### `utils/`

Reusable utilities such as JWT generation and tracking number creation.

### `public/`

The project includes a static public directory, but it is currently empty.

### `index.js`

Server bootstrap file. It loads environment variables, enables CORS, configures Stripe, starts the MongoDB connection, mounts route modules, and starts the Express server.

---

# API Documentation

## Authentication / User APIs

| Method | Endpoint               | Description                                                                    | Auth                      |
| ------ | ---------------------- | ------------------------------------------------------------------------------ | ------------------------- |
| POST   | `/register`            | Register a new user. Saves name, email, photo URL, role, and status `pending`. | Public                    |
| POST   | `/login`               | Looks up a user by email, creates a JWT, and sets a cookie named `token`.      | Public                    |
| POST   | `/logout`              | Clears the auth cookie.                                                        | Public                    |
| GET    | `/user/:email`         | Fetch a user by email.                                                         | Public                    |
| GET    | `/users`               | Search and filter users by name/email and status.                              | JWT + admin               |
| PATCH  | `/user/:id/update`     | Update a user record by ID.                                                    | JWT + admin               |
| PATCH  | `/user/:email/profile` | Update a user profile by email.                                                | JWT + buyer/admin/manager |

## Product APIs

| Method | Endpoint                | Description                                                                                              | Auth                |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------------- | ------------------- |
| GET    | `/products`             | List products with optional `limit`, `search`, `category`, `showOnHomePage`, `skip`, and `sort` filters. | Public              |
| GET    | `/manage-product`       | List products for a manager by `email`, `search`, or `filter`.                                           | JWT + manager       |
| GET    | `/product/:id/specific` | Fetch a single product by ID.                                                                            | Public              |
| POST   | `/product/post`         | Create a product. Blocks suspended users.                                                                | JWT + manager       |
| DELETE | `/product/:id/delete`   | Delete a product by ID.                                                                                  | JWT + manager/admin |
| PATCH  | `/product/:id/update`   | Update a product by ID.                                                                                  | JWT + admin/manager |
| GET    | `/manage-all-products`  | List all products for admins.                                                                            | JWT + admin         |

## Order APIs

| Method | Endpoint                     | Description                                                                                      | Auth          |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------ | ------------- |
| POST   | `/orders`                    | Create an order. Prevents duplicate pending product orders for the same buyer.                   | JWT + buyer   |
| GET    | `/orders/:email/orderStatus` | Get orders for a manager by email and status filter.                                             | JWT + manager |
| GET    | `/order/:id/specific`        | Fetch an order by ID.                                                                            | Public        |
| PATCH  | `/orders/:id/statusUpdate`   | Update an order status. If approved, creates a tracking record with a generated tracking number. | JWT + manager |
| GET    | `/my-orders/:email`          | Get all orders for a buyer by email.                                                             | JWT + buyer   |
| GET    | `/all-orders`                | List all orders with optional search and status filters.                                         | JWT + admin   |
| DELETE | `/order/:id/delete`          | Delete an order by ID.                                                                           | JWT + buyer   |

## Tracking APIs

| Method | Endpoint                 | Description                                                                   | Auth   |
| ------ | ------------------------ | ----------------------------------------------------------------------------- | ------ |
| PATCH  | `/tracking-add/:orderId` | Add a new tracking update and update the order status to the tracking status. | Public |
| GET    | `/tracking-get/:orderId` | Fetch tracking history for an order.                                          | Public |

## Payment APIs

| Method | Endpoint                   | Description                                                                                                       | Auth        |
| ------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------- |
| POST   | `/create-checkout-session` | Creates a Stripe Checkout session using the order/payment payload.                                                | JWT + buyer |
| GET    | `/session-status`          | Retrieves the Stripe session by `session_id`, checks the order, and updates the order payment status when needed. | Public      |

## Dashboard APIs

| Method | Endpoint                   | Description                                                                         | Auth                      |
| ------ | -------------------------- | ----------------------------------------------------------------------------------- | ------------------------- |
| GET    | `/admin/dashboard-stats`   | Returns admin summary counts for users, managers, products, and orders.             | JWT + admin               |
| GET    | `/manager/dashboard-stats` | Returns manager dashboard counts for managed products and orders.                   | JWT + manager             |
| GET    | `/buyer/dashboard-stats`   | Returns buyer dashboard counts for personal orders.                                 | JWT + buyer               |
| GET    | `/order-stats`             | Returns order trend/revenue aggregation by date for admin, manager, or buyer scope. | JWT + admin/manager/buyer |
| GET    | `/orderStatus-stats`       | Returns grouped order status statistics for dashboards.                             | JWT + admin/manager/buyer |
| GET    | `/buyer-spend-money`       | Returns buyer spend aggregation data.                                               | JWT + buyer               |

Additional routes included in the app:

- `GET /`
- `GET /check-cookie`
- `GET /check-roll`
- `GET /.*/` fallback response returning `404 Not Found Page`

---

# Authentication

The backend uses JWT-based authentication stored in a cookie.

## Login flow

1. A client sends a `POST /login` request with the user email.
2. The server looks up the user in the `users` collection.
3. If the user exists, it calls `createToken(user)`.
4. The token payload includes:
   - `id`
   - `name`
   - `email`
   - `role`
5. The token is signed with `JWT_SECRET` and expires in 7 days.
6. The token is sent back to the browser as an HTTP-only cookie named `token`.

## Token verification

The middleware in `middleware/verifyToken.js` does this:

- Reads `req.cookies.token`
- Returns `401 Unauthorized access` if the cookie is missing
- Calls `jwt.verify(token, process.env.JWT_SECRET)`
- Attaches the decoded payload to `req.user`
- Returns `403 Invalid token` on verification failure

## Role enforcement

The middleware in `middleware/verifyRole.js`:

- Looks up the user in the `users` collection using `req.user.email`
- Sets `req.user.status = user?.status`
- Reads `user.role`
- Allows the request only if the role is included in the allowed roles array
- Returns `403` when the user is not permitted

This is used on product, order, dashboard, and user routes.

---

# Authorization / Roles

The implemented roles in the current codebase are:

| Role      | Verified behavior                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------- |
| `admin`   | Can access all admin user management, product admin routes, all order listings, and admin dashboard stats |
| `manager` | Can access manager product routes, manager order review/update routes, and manager dashboard stats        |
| `buyer`   | Can access buyer order creation/history, buyer checkout, buyer stats, and buyer profile access            |

The code also checks `req.user.status` in some flows, and suspended users are blocked from creating products or orders with a `403` response.

---

# Database

The project uses MongoDB via the native MongoDB Node driver.

## Connection setup

The application connects in `config/db.js` as follows:

- `MongoClient` is created with `process.env.MONGODB_URI`
- `connectDB()` calls `client.connect()`
- the database name is `ThreadMart`

## Collections used

The current backend connects to these collections:

- `users`
- `products`
- `orders`
- `trackingOrders`

## Startup flow

`index.js` does the following:

1. Loads environment variables with `dotenv.config()`
2. Calls `connectDB()`
3. Starts the Express server on `PORT` or port `3000`
4. Mounts all route modules

---

# Environment Variables

The codebase uses the following environment variables. No secret values are included here.

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development_or_production
STRIPE_SECRET_KEY=your_stripe_secret_key
YOUR_DOMAIN=https://your-app-domain
```

These names are referenced directly in the runtime code:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV`
- `STRIPE_SECRET_KEY`
- `YOUR_DOMAIN`

---

# Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root using the required variables listed above.

3. Start the backend in development mode:

```bash
npm run dev
```

4. Or run the production entry point:

```bash
npm start
```

The application listens on port `3000` by default unless `PORT` is set in the environment.

---

# Deployment

The project includes a `vercel.json` configuration for Vercel deployment:

- builds the app from `index.js`
- forwards `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS` methods to the Node app

This backend is configured for serverless hosting on Vercel and uses the runtime environment variables defined above.

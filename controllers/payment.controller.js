const { ObjectId } = require("mongodb");
const { ordersCollection } = require("../config/db");

// --------------Stripe Payment------------
const createCheckoutSession = async (req, res) => {
    const {
        orderQuantity,
        productPrice,
        email,
        productId,
        productName,
        images,
        orderId,
    } = req.body;

    const stripe = req.app.get("stripe");
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
};

// stripe retrieve
const getSessionStatus = async (req, res) => {
    const stripe = req.app.get("stripe");
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    console.log(session);
    const query = {
        _id: new ObjectId(session.metadata.orderId),
    };

    const checkPayment = await ordersCollection.findOne(query);

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
        transaction: session.payment_intent,
        customer_email: session.customer_details.email,
        amount: session.amount_total,
    });
};

module.exports = {
    createCheckoutSession,
    getSessionStatus,
};

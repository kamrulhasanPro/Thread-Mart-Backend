const { usersCollection } = require("../config/db");

// verify role
const verifyRole = (...allowsRole) => {
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

module.exports = { verifyRole };

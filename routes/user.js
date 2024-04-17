
const router = require("express").Router()
const User = require("../models/user")
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken")
//REGISTER
router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    if (!password) {
        return res.status(400).json({ status: false, message: "Password is required." });
    }
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ status: false, message: "Email already exists. Try a new one." });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({
            email,
            password: hashedPassword,
        });
        await newUser.save();
        res.status(201).json({ status: true, message: "User registered successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: false, message: "Email and password are required." });
    }

    try {
        const user = await User.findOne({ email }).select("+password"); // Assuming password field is set to select: false in your model
        if (!user || (user.social && !user.password)) {
            // Keeping the error message generic to avoid enumeration attacks
            return res.status(401).json({ status: false, message: "Invalid credentials." });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ status: false, message: "Invalid credentials." });
        }

        const id = user._id;
        const token = jwt.sign({ id }, process.env.JWTSECRET, { expiresIn: "7d" });

        // Using destructuring to exclude password and other sensitive fields from the response
        const { password: _, ...userData } = user.toObject();

        return res.status(200).json({
            status: true,
            user: userData,
            token
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: "Server error" });
    }
});

module.exports = router

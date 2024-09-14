
const router = require("express").Router()
const User = require("../models/user")
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken")

// GET all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find(); // Retrieve all users
        res.status(200).json(users); // Return the user data
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET user by ID
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id); // Find user by ID
        if (!user) {
            return res.status(404).json({ message: 'User not found' }); // Return 404 if not found
        }
        res.status(200).json(user); // Return the user data
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});
// DeleteAll
router.delete('/users', async (req, res) => {
    try {
        const result = await User.deleteMany(); // Deletes all documents in the 'users' collection
        res.status(200).json({ message: 'All users have been deleted', result });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});
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

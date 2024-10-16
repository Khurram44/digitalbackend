const mongoose = require("mongoose")

// Define the schema for Category
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Ensures no duplicate categories
        trim: true
    },
    order: {
        type: Number,
        default: 0, // Default order value
        required: true
    },
}, { timestamps: true }); // Automatically creates `createdAt` and `updatedAt` fields


module.exports = mongoose.model('Category', categorySchema);

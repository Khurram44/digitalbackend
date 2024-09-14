const mongoose = require("mongoose")

const addCompanySchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    bedrijfsnaam: {
        type: String,
        required: true,
    },
    contactperson: {
        type: String,
        required: true,
    },
    categories: {
        type: Map, // This stores categories as key-value pairs
        of: String, // Value will be 'x' or empty string
        default: {}  // Default to an empty object
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    Facebookadres: {
        type: String,
        required: true,
    },
    accepted: {
        type: String, // Can be 'pending', 'accepted', or 'rejected'
        default: 'pending'
    }
},
    { timestamps: true }
)

const addCompany = mongoose.model('addCompany', addCompanySchema);

module.exports = addCompany;

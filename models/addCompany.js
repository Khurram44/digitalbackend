const mongoose = require("mongoose")

const addCompanySchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    Bedrijfsnaam: {
        type: String,
        required: true,
    },
    contactperson: {
        type: String,
        required: true,
    },
    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',  // Reference to Category model
        required: true
    }],
    Facebookadres: {
        type: String,
        required: true,
        unique: true,
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

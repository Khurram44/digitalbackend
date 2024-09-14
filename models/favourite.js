const mongoose = require("mongoose")

const favoriteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Scrape' // Assuming you have an Item model
    },
    createdAt: { type: Date, default: Date.now }
});

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;

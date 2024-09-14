const express = require('express');
const router = express.Router();
const Favorite = require('../models/favourite');

// Add a favorite
router.post('/add', async (req, res) => {
    try {
        const { userId, itemId } = req.body;

        // Check if both user and item are provided
        if (!userId || !itemId) {
            return res.status(400).json({ message: 'UserId and ItemId are required' });
        }

        // Create a new favorite
        const favorite = new Favorite({ userId, itemId });
        await favorite.save();

        res.status(201).json({ message: 'Favorite added successfully', favorite });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Remove a favorite
router.delete('/remove', async (req, res) => {
    try {
        const { userId, itemId } = req.body;

        // Check if both user and item are provided
        if (!userId || !itemId) {
            return res.status(400).json({ message: 'UserId and ItemId are required' });
        }

        // Delete the favorite
        const result = await Favorite.deleteOne({ userId, itemId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Favorite not found' });
        }

        res.status(200).json({ message: 'Favorite removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Get all favorites for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Find all favorites for the user
        const favorites = await Favorite.find({ userId }).populate('itemId');

        res.status(200).json({ favorites });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

module.exports = router;

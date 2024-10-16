// routes/category.js
const router = require("express").Router()
const category = require("../models/category");
const Category = require('../models/category');

// Add a new category
router.post('/add', async (req, res) => {
    try {
        const { name, order } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Naam is verplicht.' });
        }

        // Reorder existing categories
        if (order !== undefined) {
            await Category.updateMany(
                { order: { $gte: order } }, // Update categories with an order greater than or equal to the new category's order
                { $inc: { order: 1 } } // Increment their order
            );
        }

        const newCategory = new Category({ name, order });
        const savedCategory = await newCategory.save();
        res.status(201).json({ status: true, message: 'Categorie succesvol toegevoegd', result: savedCategory });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Categorie bestaat al.' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories.sort((s,t)=>s.order-t.order));
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get a category by ID
router.get('/:id', async (req, res) => {
    const { categoryIds } = req.body;

    try {
        // Reorder logic (similar to what you have)
        const updatedCategories = await Promise.all(categoryIds.map((id, index) => {
            return Category.findByIdAndUpdate(id, { order: index }, { new: true }); // Use { new: true } to return updated document
        }));

        res.status(200).json({ message: 'Categories reordered successfully.', categories: updatedCategories });
    } catch (error) {
        console.error("Error reordering categories:", error);
        res.status(500).json({ message: 'Failed to reorder categories.' });
    }
});

router.put('/reorder', async (req, res) => {
    const { categoryIds } = req.body;

    // Validate input
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return res.status(400).json({ status: false, message: 'Invalid category IDs.' });
    }

    try {
        // Update the order of each category
        const updatePromises = categoryIds.map((id, index) => {
            return category.findByIdAndUpdate(id, { order: index }, { new: true });
        });

        await Promise.all(updatePromises); // Wait for all updates to complete

        // Success response
        res.status(200).json({ status: true, message: 'Categories reordered successfully.' });
    } catch (error) {
        console.error("Error reordering categories:", error); // Log the error
        res.status(500).json({ status: false, message: 'Failed to reorder categories.', error: error.message });
    }
});


// Update a category by ID
router.put('/:id', async (req, res) => {
    try {
        const { name, order } = req.body;

        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Categorie niet gevonden' });
        }

        // Handle order change
        if (order !== undefined && order !== category.order) {
            // If the order is being changed
            await Category.updateMany(
                { order: { $gte: Math.min(order, category.order), $lte: Math.max(order, category.order) } }, // Adjust order for other categories in the range
                { $inc: { $gt: category.order ? 1 : 0 } } // Increment their order
            );
            category.order = order;
        }

        category.name = name || category.name;
        const updatedCategory = await category.save();
        res.status(200).json({ status: true, message: 'Categorie succesvol bijgewerkt', result: updatedCategory });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


// Delete a category by ID
router.delete('/:id', async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) {
            return res.status(404).json({ message: 'Categorie niet gevonden' });
        }
        res.status(200).json({status:true, message: 'Categorie succesvol verwijderd' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;

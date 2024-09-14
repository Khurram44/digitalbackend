// routes/category.js
const router = require("express").Router()
const Category = require('../models/category');

// Add a new category
router.post('/add', async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required.' });
        }

        const newCategory = new Category({ name });

        const savedCategory = await newCategory.save();
        res.status(201).json({ status: true, message: 'Category Added successfully', result: savedCategory });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Category already exists.' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get a category by ID
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(200).json(category);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update a category by ID
router.put('/:id', async (req, res) => {
    try {
        const { name } = req.body;

        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        category.name = name || category.name;
        const updatedCategory = await category.save();
        res.status(200).json({ status: true, message: 'Category Updated successfully', result: updatedCategory });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete a category by ID
router.delete('/:id', async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;

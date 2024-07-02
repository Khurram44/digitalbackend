const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Business = require('../models/excelfile');  // Import your Business model

// Configure multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload', upload.single('file'), async (req, res) => {
    if (req.file) {
        try {
            // Read the Excel file from the buffer
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet);

            // Initialize a counter for new and skipped records
            let newCount = 0;
            let skipCount = 0;

            // Process each row and save to MongoDB
            for (const row of rows) {
                // Check if business already exists
                const existingBusiness = await Business.findOne({ Bedrijfsnaam: row['Bedrijfsnaam'] });
                if (existingBusiness) {
                    // Increment skip count and continue to the next iteration
                    skipCount++;
                    continue;
                }

                // Create a new business record
                const newBusiness = new Business({
                    Bedrijfsnaam: row['Bedrijfsnaam'],
                    Facebookadres: row['Facebookadres'],
                    Winkels: row['Winkels'] === 'x',
                    Horeca: row['Horeca'] === 'x',
                    Verenigingen: row['Verenigingen'] === 'x',
                    Bedrijven: row['Bedrijven'] === 'x',
                    Evenementen: row['Evenementen'] === 'x',
                    Lifestyle: row['Lifestyle'] === 'x',
                    Recreatie: row['Recreatie'] === 'x',
                    Sport: row['Sport'] === 'x',
                    Cultuur: row['Cultuur'] === 'x',
                });
                // Save the new business
                await newBusiness.save();
                newCount++;
            }

            res.send(`File uploaded. ${newCount} new records added, ${skipCount} duplicates skipped.`);
        } catch (err) {
            console.error(err);
            res.status(500).send(err.message);
        }
    } else {
        res.status(400).send('No file uploaded.');
    }
});

router.get('/getjson', async (req, res) => {
    try {
        const businesses = await Business.find({});
        res.json(businesses);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// Edit
router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const updatedBusiness = await Business.findByIdAndUpdate(id, updateData, { new: true });

        if (updatedBusiness) {
            res.json({ message: 'Business updated successfully', data: updatedBusiness });
        } else {
            res.status(404).send({ message: 'Business not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
});

// Delete
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Business.findByIdAndDelete(id);

        if (result) {
            res.send({ message: 'Business deleted successfully', id: result._id });
        } else {
            res.status(404).send({ message: 'Business not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// DeleteAll
router.delete('/delete-all', async (req, res) => {
    try {
        // This command will remove all documents from the 'businesses' collection
        const result = await Business.deleteMany({});
        
        if(result.deletedCount > 0) {
            res.send({ message: `Successfully deleted ${result.deletedCount} entries.` });
        } else {
            res.status(404).send({ message: 'No entries found to delete.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

module.exports = router;

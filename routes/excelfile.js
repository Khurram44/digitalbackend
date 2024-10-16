const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Business = require('../models/excelfile');  // Import your Business model
const addCompany = require('../models/addCompany');

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
                //Categories GET here
                // const categories = await category.find()
                // const businessCategories = categories.map(m=>{
                //     m.
                // })
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
        // Fetch accepted companies from the AddCompany model
        const acceptedCompanies = await addCompany.find({ accepted: 'accepted' });

        // Fetch all businesses from the Business model
        const businesses = await Business.find({});

        // Transform the AddCompany documents to match the Business structure
        const transformedCompanies = acceptedCompanies.map(company => {
            console.log("Company Categories:", company.categories); // Debugging

            return {
                _id: company._id,
                Bedrijfsnaam: company.bedrijfsnaam,
                Facebookadres: company.Facebookadres || company.email, // Use Facebookadres or email if missing

                // Use the get() method to access values from the Map
                Winkels: company.categories.get('Winkels') === "true",
                Horeca: company.categories.get('Horeca') === "true",
                Verenigingen: company.categories.get('Verenigingen') === "true",
                Bedrijven: company.categories.get('Bedrijven') === "true",
                Evenementen: company.categories.get('Evenementen') === "true",
                Lifestyle: company.categories.get('Lifestyle') === "true",
                Recreatie: company.categories.get('Recreatie') === "true",
                Sport: company.categories.get('Sport') === "true",
                Cultuur: company.categories.get('Cultuur') === "true",

                __v: company.__v,
            };
        });

        // Combine the transformed companies into the businesses array
        const mergedBusinesses = businesses.concat(transformedCompanies);

        // Return the merged array of businesses
        res.status(200).json(mergedBusinesses);
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

// Route to delete all businesses and companies
router.delete('/delete-all', async (req, res) => {
    try {
        // Delete all accepted companies
        const companiesDeleted = await addCompany.deleteMany({ accepted: 'accepted' });

        // Delete all businesses
        const businessesDeleted = await Business.deleteMany({});

        // Respond with a message indicating the number of deleted entries
        res.send({ message: `Successfully deleted ${businessesDeleted.deletedCount} businesses and ${companiesDeleted.deletedCount} companies.` });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// Route to delete a business or company by ID
// Route to delete a business or accepted company by ID
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Check if the ID belongs to the Business model
        const business = await Business.findById(id);
        if (business) {
            await Business.findByIdAndDelete(id); // Delete the business
            return res.send({ message: 'Business deleted successfully', id: business._id });
        }

        // If not found in Business, check in AddCompany for accepted companies
        const acceptedCompany = await addCompany.findOneAndDelete({ _id: id, accepted: 'accepted' });
        if (acceptedCompany) {
            return res.send({ message: 'Accepted company deleted successfully', id: acceptedCompany._id });
        }

        // If neither was found
        res.status(404).send({ message: 'Business or accepted company not found' });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

module.exports = router;

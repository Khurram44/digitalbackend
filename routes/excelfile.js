const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Business = require('../models/excelfile');  // Import your Business model
const addCompany = require('../models/addCompany');
const category = require('../models/category');
const { default: mongoose } = require('mongoose');

// Configure multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// router.post('/upload', upload.single('file'), async (req, res) => {
//     if (req.file) {
//         try {
//             // Read the Excel file
//             const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
//             const sheetName = workbook.SheetNames[0];
//             const worksheet = workbook.Sheets[sheetName];
//             const rows = XLSX.utils.sheet_to_json(worksheet);

//             let newCount = 0;
//             let skipCount = 0;

//             // Retrieve all available categories from the Category model
//             const categories = await category.find();
//             const categoryMap = new Map(categories.map(cat => [cat.name.toLowerCase(), cat._id]));

//             for (const row of rows) {
//                 // Check if the business already exists
//                 const existingBusiness = await Business.findOne({ Bedrijfsnaam: row['Bedrijfsnaam'] });
//                 if (existingBusiness) {
//                     skipCount++;
//                     continue;
//                 }

//                 // Dynamically assign categories from the row data
//                 const businessCategories = [];
//                 for (const categoryName in row) {
//                     if (row[categoryName] === 'x' && categoryMap.has(categoryName.toLowerCase())) {
//                         businessCategories.push(categoryMap.get(categoryName.toLowerCase()));
//                     }
//                 }

//                 const newBusiness = new Business({
//                     Bedrijfsnaam: row['Bedrijfsnaam'],
//                     Facebookadres: row['Facebookadres'],
//                     categories: businessCategories
//                 });

//                 await newBusiness.save();
//                 newCount++;
//             }

//             res.send(`File uploaded. ${newCount} new records added, ${skipCount} duplicates skipped.`);
//         } catch (err) {
//             console.error(err);
//             res.status(500).send(err.message);
//         }
//     } else {
//         res.status(400).send('No file uploaded.');
//     }
// });
router.post('/upload', upload.single('file'), async (req, res) => {
    if (req.file) {
        try {
            // Read the Excel file
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet);

            let newCount = 0;
            let skipCount = 0;
            let missingCategories = [];
            const uploadedFacebookadresSet = new Set(); // Set to track Facebookadres in the uploaded sheet

            // Retrieve all available categories from the Category model
            const categories = await category.find();
            const categoryMap = new Map(categories.map(cat => [cat.name.toLowerCase(), cat._id]));

            const businessesToSave = []; // Array to hold businesses to save

            for (const row of rows) {
                const businessCategories = [];
                let isBusinessValid = true; // Flag to determine if the business is valid

                for (const categoryName in row) {
                    if (row[categoryName] === 'x') {
                        const lowerCaseCategory = categoryName.toLowerCase();
                        if (categoryMap.has(lowerCaseCategory)) {
                            businessCategories.push(categoryMap.get(lowerCaseCategory));
                        } else {
                            if (!missingCategories.includes(categoryName)) {
                                missingCategories.push(categoryName);
                                isBusinessValid = false;
                            }
                        }
                    }
                }

                const facebookadres = row['Facebookadres'];
                if (!facebookadres) {
                    continue; // Skip rows with no Facebookadres
                }

                // Check if the Facebookadres already exists in the database or in the uploaded sheet
                const existingBusiness = await Business.findOne({ Facebookadres: facebookadres });
                
                if (existingBusiness || uploadedFacebookadresSet.has(facebookadres)) {
                    skipCount++;
                    continue; // Skip duplicate Facebookadres
                }

                // Mark this Facebookadres as processed in the uploaded sheet
                uploadedFacebookadresSet.add(facebookadres);

                // If the business is valid, prepare it for saving
                if (isBusinessValid) {
                    businessesToSave.push(new Business({
                        Bedrijfsnaam: row['Bedrijfsnaam'],
                        Facebookadres: facebookadres,
                        categories: businessCategories
                    }));
                }
            }

            if (missingCategories.length > 0) {
                return res.status(400).send(
                    `The following categories are missing: ${missingCategories.join(', ')}. Please add these categories to the system before proceeding.`
                );
            }

            // Save all valid businesses
            for (const business of businessesToSave) {
                await business.save();
                newCount++;
            }

            // Send success response
            res.status(200).send({ status: true, message: `${newCount} new records added, ${skipCount} duplicates skipped.` });
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
        // Fetch accepted companies and populate the 'categories' field with category names
        const acceptedCompanies = await addCompany.find({ accepted: 'accepted' })
            .populate('categories', 'name'); // Populate category names

        // Log accepted companies for debugging
        console.log('Accepted Companies:', acceptedCompanies);

        // Fetch all businesses and populate 'categories' field
        const businesses = await Business.find({}).populate('categories', 'name');

        // Format businesses to return only category names
        const businessesWithFormattedCategories = businesses.map(business => ({
            ...business.toObject(),
            categories: business.categories.map(category => category.name) // Extract category names
        }));

        const acceptedCompaniesWithFormattedCategories = acceptedCompanies.map(company => ({
            ...company.toObject(),
            categories: company.categories.map(category => category ? category.name : null) // Handle null categories
        }));

        // Combine accepted companies and businesses into a single array
        const combinedData = [...acceptedCompaniesWithFormattedCategories, ...businessesWithFormattedCategories];

        // Log the combined data to check the final output
        console.log('Combined Data:', combinedData);

        // Send response
        res.status(200).json(combinedData);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});


router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { Bedrijfsnaam, Facebookadres, categories } = req.body;

    // Validate required fields
    if (!Bedrijfsnaam || !Facebookadres) {
        return res.status(400).json({ message: 'Bedrijfsnaam and Facebookadres are required' });
    }

    try {
        // Check if the business or company exists
        const business = await Business.findById(id);
        const company = await addCompany.findById(id);

        if (!business && !company) {
            return res.status(404).json({ message: 'Business or Company not found' });
        }

        // If categories are passed as names, find the corresponding ObjectIds
        let categoryIds = [];
        if (categories && categories.length > 0) {
            const categoryDocuments = await category.find({ name: { $in: categories } }).select('_id');
            categoryIds = categoryDocuments.map(cat => cat._id);

            if (categoryIds.length === 0) {
                return res.status(404).json({ message: 'Some or all categories not found' });
            }
        }

        // Update the business if it exists
        let updatedBusiness = null;
        if (business) {
            updatedBusiness = await Business.findByIdAndUpdate(
                id,
                { Bedrijfsnaam, Facebookadres, categories: categoryIds.length > 0 ? categoryIds : business.categories },
                { new: true }
            ).populate('categories');  // Populating categories directly in the query
        }

        // Update the company if it exists
        let updatedCompany = null;
        if (company) {
            updatedCompany = await addCompany.findByIdAndUpdate(
                id,
                { Bedrijfsnaam, Facebookadres, categories: categoryIds.length > 0 ? categoryIds : company.categories },
                { new: true }
            ).populate('categories');  // Populating categories directly in the query
        }

        // Format the categories for both company and business (if they exist) to return names instead of ObjectIds
        const formattedUpdatedBusiness = updatedBusiness ? {
            ...updatedBusiness.toObject(),
            categories: updatedBusiness.categories.map(category => category.name)
        } : null;

        const formattedUpdatedCompany = updatedCompany ? {
            ...updatedCompany.toObject(),
            categories: updatedCompany.categories.map(category => category.name)
        } : null;

        // Return the updated document(s)
        res.json({
            status: true,
            message: 'Update successful',
            data: {
                updatedBusiness: formattedUpdatedBusiness,
                updatedCompany: formattedUpdatedCompany
            }
        });
    } catch (err) {
        console.error('Error occurred during update:', err);
        res.status(500).json({ message: 'Server error' });
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

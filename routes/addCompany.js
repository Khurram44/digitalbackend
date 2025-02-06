const router = require("express").Router()
const AddCompany = require("../models/addCompany")
const axios = require('axios');
const sendEmail = require('../emailService'); // Adjust the path as needed
const category = require("../models/category");

// router.post('/add-company', async (req, res) => {
//     try {
//         const {
//             bedrijfsnaam,
//             Facebookadres,
//             contactperson,
//             email,
//             categories // Expecting categories from the request
//         } = req.body;

//         // Ensure categories is an array, default to an empty array if not provided
//         const validCategories = Array.isArray(categories) ? categories : [];

//         if (!bedrijfsnaam || !Facebookadres || !contactperson || !email) {
//             return res.status(400).json({ message: 'All fields are required.' });
//         }

//          // Check if the Facebookadres (URL) already exists in the database
//          const existingCompany = await AddCompany.findOne({ Facebookadres });
//          if (existingCompany) {
//              return res.status(409).json({ message: 'Deze URL bestaat al.' });
//          }


//         // Fetch valid categories from your categories API
//         const validCategoriesResponse = await axios.get('https://digitalbackend-production-bfa4.up.railway.app/categories/');
//         const allValidCategories = validCategoriesResponse.data;

//         if (!allValidCategories || allValidCategories.length === 0) {
//             return res.status(500).json({ message: 'Unable to fetch valid categories.' });
//         }

//         // Prepare the dynamic categories object with boolean values
//         const selectedCategories = {};

//         // Initialize all valid categories to false
//         allValidCategories.forEach(cat => {
//             selectedCategories[cat.name] = false; // Start with false
//         });

//         // Update the categories based on the request, ensuring only valid categories are allowed
//         validCategories.forEach(cat => {
//             if (selectedCategories.hasOwnProperty(cat)) {
//                 selectedCategories[cat] = true; // Set to true if category is valid and selected
//             }
//         });

//         // Create the new company document
//         const newCompany = new AddCompany({
//             bedrijfsnaam,
//             Facebookadres,
//             contactperson,
//             email,
//             categories: selectedCategories // Store as a dynamic object
//         });

//         // Save to the database
//         const savedCompany = await newCompany.save();

//         // Send email to the user
//         await sendEmail(
//             email,
//             'companyRegistration',
//             { bedrijfsnaam }
//         );

//         // Send email to the admin
//         await sendEmail(
//             process.env.GMAIL_USER,
//             'Nieuwe Bedrijfsregistratie',
//             'adminNotification',
//             { bedrijfsnaam, contactperson }
//         );

//         // Return success response with the desired format
//         return res.status(201).json({
//             status:true,
//             ...selectedCategories, // Spread the selected categories into the response
//             _id: savedCompany._id,
//             Bedrijfsnaam: savedCompany.bedrijfsnaam,
//             Facebookadres: savedCompany.Facebookadres,
//             __v: savedCompany.__v // Include the version key if necessary
//         });
//     } catch (err) {
//         // Handle unique email error
//         if (err.code === 11000) {
//             return res.status(409).json({ message: 'Email already registered.' });
//         }
//         // General server error
//         return res.status(500).json({ message: 'Server error', error: err.message });
//     }
// });

router.post('/add-company', async (req, res) => {
    const { email, Bedrijfsnaam, contactperson, categories, Facebookadres } = req.body;

    try {
        // Convert category names to their corresponding ObjectIds
        let categoryIds = [];
        if (categories && categories.length > 0) {
            // Fetch categories by their names
            const categoryDocs = await category.find({ name: { $in: categories } }).select('_id');
            categoryIds = categoryDocs.map(cat => cat._id);

            if (categoryIds.length !== categories.length) {
                return res.status(404).json({ message: 'One or more categories not found' });
            }
        }

        // Create a new company instance with ObjectIds for categories
        const newCompany = new AddCompany({
            email,
            Bedrijfsnaam,
            contactperson,
            categories: categoryIds, // Store category ObjectIds here
            Facebookadres
        });

        // Save the company to the database
        await newCompany.save();

        // Send email to the user
        await sendEmail(
            email,                       // recipient email address
            'Bedrijfsregistratie',        // subject of the email to the user
            'companyRegistration',        // template file name
            { Bedrijfsnaam }              // data for the template
        );

        // Send email to the admin
        await sendEmail(
            process.env.GMAIL_USER,       // admin email address
            'Nieuwe Bedrijfsregistratie', // subject of the email to the admin
            'adminNotification',          // template file name
            { Bedrijfsnaam, contactperson } // data for the template
        );

        // Respond with success
        res.status(201).json({ status: true, message: 'Company added successfully', company: newCompany });
    } catch (error) {
        // Handle duplicate key error for email or Facebookadres
        if (error.code === 11000) {
            const field = error.keyPattern.email ? 'email' : 'URL Social media account';
            return res.status(400).json({ message: `${field} bestaat al. Probeer een andere.` });
        }
        // Handle other validation errors
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});



// Get All Company

router.get('/getcompanies', async (req, res) => {
    try {
        // Retrieve all companies and populate categories with their names
        const companies = await AddCompany.find().populate({
            path: 'categories',  // Populate the categories field
            select: 'name'       // Only select the 'name' field from categories
        });

        // Format the response to include category names only (as an array of strings)
        const formattedCompanies = companies.map(company => ({
            ...company.toObject(),
            categories: company.categories.map(category => category.name) // Extract category names
        }));

        res.status(200).json(formattedCompanies); // Return the formatted data
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET user by ID
router.get('/company/:id', async (req, res) => {
    try {
        const user = await AddCompany.findById(req.params.id); // Find user by ID
        if (!user) {
            return res.status(404).json({ message: 'Company not found' }); // Return 404 if not found
        }
        res.status(200).json(user); // Return the user data
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// DeleteAll
router.delete('/deletecompany', async (req, res) => {
    try {
        const result = await AddCompany.deleteMany(); // Deletes all documents in the 'users' collection
        res.status(200).json({ message: 'All companies have been deleted', result });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.delete('/company/:id', async (req, res) => {
    try {
        // Find the company by ID and delete it
        const result = await AddCompany.findByIdAndDelete(req.params.id);

        // Check if the company was found and deleted
        if (!result) {
            return res.status(404).json({ message: 'Company not found' }); // Return 404 if not found
        }

        res.status(200).json({ message: 'Company has been deleted', result });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// // Accept company registration
// router.post('/accept-company/:id', async (req, res) => {
//     try {
//         const companyId = req.params.id;

//         // Find the company by ID and update its status to 'accepted'
//         const company = await AddCompany.findByIdAndUpdate(companyId, { accepted: 'accepted' }, { new: true });

//         if (!company) {
//             return res.status(404).json({ message: 'Company not found' });
//         }

//         // Send email notification to the user
//         await sendEmail(
//             company.email,
//             'Bedrijfsregistratie Geaccepteerd',
//             'companyAccepted', // You can create this EJS template
//             { bedrijfsnaam: company.bedrijfsnaam }
//         );

//         res.status(200).json({ message: 'Bedrijf succesvol geaccepteerd', company });
//     } catch (err) {
//         res.status(500).json({ message: 'Server error', error: err.message });
//     }
// });

router.post('/accept-company/:id', async (req, res) => {
    try {
        const companyId = req.params.id;
        const { categories } = req.body;

        const company = await AddCompany.findById(companyId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        let updatedCategories = company.categories;

        if (categories && categories.length > 0) {
            const categoryDocs = await category.find({ name: { $in: categories } }).select('_id');
            const categoryIds = categoryDocs.map(cat => cat._id);

            console.log('Category Docs:', categoryDocs); // Log the fetched category documents
            console.log('Category IDs:', categoryIds);   // Log the fetched category IDs

            if (categoryIds.length === 0) {
                return res.status(404).json({ message: 'None of the provided categories were found' });
            }

            updatedCategories = categoryIds; // Use new category ObjectIds
        }

        const updatedCompany = await AddCompany.findByIdAndUpdate(
            companyId,
            {
                accepted: 'accepted',
                categories: updatedCategories
            },
            { new: true }
        ).populate({
            path: 'categories',
            select: 'name'
        });

        console.log('Updated Company:', updatedCompany); // Log the updated company

        await sendEmail(
            company.email,
            'Bedrijfsregistratie Geaccepteerd',
            'companyAccepted',
            { Bedrijfsnaam: updatedCompany.Bedrijfsnaam }
        );

        res.status(200).json({
            message: 'Bedrijf succesvol geaccepteerd',
            company: updatedCompany,
            preSelectedCategories: updatedCategories
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


// Reject company registration
router.post('/reject-company/:id', async (req, res) => {
    try {
        const companyId = req.params.id;

        // Find the company by ID and update its status to 'rejected'
        const company = await AddCompany.findByIdAndUpdate(companyId, { accepted: 'rejected' }, { new: true });

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Send email notification to the user
        await sendEmail(
            company.email,
            'Bedrijfsregistratie Geweerd',
            'companyRejected', // You can create this EJS template
            { Bedrijfsnaam: company.Bedrijfsnaam }
        );

        res.status(200).json({ message: 'Bedrijf succesvol geweigerd', company });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;

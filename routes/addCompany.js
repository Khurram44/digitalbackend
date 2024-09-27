const router = require("express").Router()
const AddCompany = require("../models/addCompany")
const axios = require('axios');
const sendEmail = require('../emailService'); // Adjust the path as needed

// router.post('/add-company', async (req, res) => {
//     try {
//         const {
//             bedrijfsnaam,
//             Facebookadres,
//             contactperson,
//             email,
//             categories // Expecting categories array from the request
//         } = req.body;

//         if (!bedrijfsnaam || !Facebookadres || !contactperson || !email) {
//             return res.status(400).json({ message: 'All fields are required.' });
//         }

//         // Fetch valid categories from your categories API
//         const validCategoriesResponse = await axios.get('https://digitalbackend-production.up.railway.app/categories/');
//         const validCategories = validCategoriesResponse.data;

//         // Prepare the dynamic categories object
//         const selectedCategories = {};

//         // Initialize all categories with empty string
//         validCategories.forEach(cat => {
//             selectedCategories[cat.name] = ''; // Start with empty string
//         });

//         // Update the categories based on the request
//         categories.forEach(cat => {
//             if (selectedCategories.hasOwnProperty(cat)) {
//                 selectedCategories[cat] = 'x'; // Set to 'x' if selected
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
//             'Company Registration Received',
//             'companyRegistration',
//             { bedrijfsnaam }
//         );

//         // Send email to the admin
//         await sendEmail(
//             process.env.GMAIL_USER,
//             'New Company Registration',
//             'adminNotification',
//             { bedrijfsnaam, contactperson }
//         );
//          // Return success response
//           res.status(201).json({
//             status: true,
//             message: 'Company successfully added.',
//             company: savedCompany
//         });
//     } catch (err) {
//         if (err.code === 11000) {
//             return res.status(409).json({ message: 'Email already registered.' });
//         }
//         res.status(500).json({ message: 'Server error', error: err.message });
//     }
// });

router.post('/add-company', async (req, res) => {
    try {
        const {
            bedrijfsnaam,
            Facebookadres,
            contactperson,
            email,
            categories // Expecting categories from the request
        } = req.body;

        // Ensure categories is an array, default to an empty array if not provided
        const validCategories = Array.isArray(categories) ? categories : [];

        if (!bedrijfsnaam || !Facebookadres || !contactperson || !email) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Fetch valid categories from your categories API
        const validCategoriesResponse = await axios.get('https://digitalbackend-production.up.railway.app/categories/');
        const allValidCategories = validCategoriesResponse.data;

        if (!allValidCategories || allValidCategories.length === 0) {
            return res.status(500).json({ message: 'Unable to fetch valid categories.' });
        }

        // Prepare the dynamic categories object with boolean values
        const selectedCategories = {};

        // Initialize all valid categories to false
        allValidCategories.forEach(cat => {
            selectedCategories[cat.name] = false; // Start with false
        });

        // Update the categories based on the request, ensuring only valid categories are allowed
        validCategories.forEach(cat => {
            if (selectedCategories.hasOwnProperty(cat)) {
                selectedCategories[cat] = true; // Set to true if category is valid and selected
            }
        });

        // Create the new company document
        const newCompany = new AddCompany({
            bedrijfsnaam,
            Facebookadres,
            contactperson,
            email,
            categories: selectedCategories // Store as a dynamic object
        });

        // Save to the database
        const savedCompany = await newCompany.save();

        // Send email to the user
        await sendEmail(
            email,
            'Company Registration Received',
            'companyRegistration',
            { bedrijfsnaam }
        );

        // Send email to the admin
        await sendEmail(
            process.env.GMAIL_USER,
            'New Company Registration',
            'adminNotification',
            { bedrijfsnaam, contactperson }
        );

        // Return success response with the desired format
        return res.status(201).json({
            status:true,
            ...selectedCategories, // Spread the selected categories into the response
            _id: savedCompany._id,
            Bedrijfsnaam: savedCompany.bedrijfsnaam,
            Facebookadres: savedCompany.Facebookadres,
            __v: savedCompany.__v // Include the version key if necessary
        });
    } catch (err) {
        // Handle unique email error
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Email already registered.' });
        }
        // General server error
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});




// Get All Company

router.get('/getcompanies', async (req, res) => {
    try {
        const users = await AddCompany.find(); // Retrieve all users
        res.status(200).json(users); // Return the user data
    } catch (err) {
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

// Accept company registration
router.post('/accept-company/:id', async (req, res) => {
    try {
        const companyId = req.params.id;

        // Find the company by ID and update its status to 'accepted'
        const company = await AddCompany.findByIdAndUpdate(companyId, { accepted: 'accepted' }, { new: true });

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Send email notification to the user
        await sendEmail(
            company.email,
            'Company Registration Accepted',
            'companyAccepted', // You can create this EJS template
            { bedrijfsnaam: company.bedrijfsnaam }
        );

        res.status(200).json({ message: 'Company accepted successfully', company });
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
            'Company Registration Rejected',
            'companyRejected', // You can create this EJS template
            { bedrijfsnaam: company.bedrijfsnaam }
        );

        res.status(200).json({ message: 'Company rejected successfully', company });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;

const express = require("express");
const env = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const { ApifyClient } = require('apify-client');
const Scrape = require("./models/scrape");
const { Semaphore } = require('async-mutex');
const axios = require('axios');
const fs = require('fs').promises;
const { createClient } = require('redis');
const cron = require('node-cron');

const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    legacyMode: true});

client.on('error', (err) => console.error('Redis Client Error', err));

async function connectToRedis() {
    try {
        await client.connect();
        console.log("Connected to Redis");
    } catch (err) {
        console.error("Could not connect to Redis", err);
    }
}
// Define the maximum concurrency
const MAX_CONCURRENCY = 2;
const semaphore = new Semaphore(MAX_CONCURRENCY);
env.config();

const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Initialize the ApifyClient with API token
const apifyClient = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to Database")).catch((err) => console.warn(err));

const excel = require('./routes/excelfile')
const auth = require('./routes/user')
const favorite = require('./routes/favourite')
const addcompany = require('./routes/addCompany')
const category = require('./routes/category');
const sendEmail = require("./emailService");


app.use('/exceldata', excel)
app.use('/auth', auth)
app.use('/company', addcompany)
app.use('/favourite', favorite)
app.use('/categories', category);

// Load your data
// const entities = JSON.parse(fs.readFileSync('data.json', 'utf8'));


app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Digital Backend API!" });
});

app.get("/cron/history", async (req, res) => {
    try {
        const history = await CronJob.find().sort({ createdAt: -1 }); // Sort by most recent
        res.status(200).send({ status: true, history });
    } catch (error) {
        res.status(500).send({ status: false, error: error.message });
    }
});

let isProcessing = false; // To track if the job is currently processing

app.get("/cron/status", (req, res) => {
    if (isProcessing) {
        res.status(200).send({ status: "processing" });
    } else {
        res.status(200).send({ status: "next run at: [insert time]" });
    }
});

// Schedule cron job at 12 PM and 12 AM Netherlands time
cron.schedule('0 0,12 * * *', async () => {
    const startTime = new Date();
    let isProcessing = true;

    try {
        // Send an email when the cron job starts
        await sendEmail('Cron Job Started', 'The cron job has started', startTime);

        // Call the /scrape API instead of calling the scraping function directly
        const response = await axios.get('https://digitalbackend-production.up.railway.app/scrape');

        // If the request is successful, log the data
        const scrapedData = response.data;
        console.log('Scraped data:', scrapedData);

        const endTime = new Date();
        const duration = endTime - startTime;

        // Create a new CronJob record
        await new CronJob({ startTime, endTime, duration, status: 'success', data: scrapedData }).save();

        // Send an email when the cron job completes successfully
        await sendEmail('Cron Job Completed', 'The cron job completed successfully.', startTime, endTime, duration);

    } catch (error) {
        const endTime = new Date();
        const duration = endTime - startTime;

        // Log the error and create a CronJob record with failure status
        console.error('Error during scraping:', error.message);
        await new CronJob({ startTime, endTime, duration, status: 'failed', errorMessage: error.message }).save();

        // Send an email if the cron job fails
        await sendEmail('Cron Job Failed', `The cron job failed with error: ${error.message}`, startTime, endTime, duration);
    } finally {
        isProcessing = false; // Reset the processing flag
    }
}, {
    scheduled: true,
    timezone: "Europe/Amsterdam"  // Set timezone to Netherlands time (CET/CEST)
});


//get scrped result
// app.get("/result", async (req, res) => {
//     try {
        
//         const result = await Scrape.aggregate([
//             {
//                 $sort: { "latestPost.time": -1 } // Sort based on the `time` field in `latestPost`
//             },
//         ]);

//         res.status(200).send({ status: true, result: result });
//     } catch (error) {
//         res.status(400).send({ status: false, error: error });
//     }
// });

app.get("/result", async (req, res) => {
    try {
        // Try to get the results from Redis
        const cachedResults = await client.get('scrapedResults');

        if (cachedResults) {
            // If results are found in cache, return them
            res.status(200).send({ status: true, result: JSON.parse(cachedResults) });
        } else {
            // If no results in cache, fetch from database as a fallback
            const result = await Scrape.aggregate([
                {
                    $sort: { "latestPost.time": -1 } // Sort based on the `time` field in `latestPost`
                },
            ]);

            res.status(200).send({ status: true, result: result });
        }
    } catch (error) {
        res.status(400).send({ status: false, error: error });
    }
});


app.delete("/result", async (req, res) => {
    try {
        
        await Scrape.deleteMany({});
        res.status(200).send({ status: true, message: "All results have been deleted." });
    } catch (error) {
        res.status(500).send({ status: false, error: error.message });
    }
});
app.delete("/result/:id", async (req, res) => {
    const { id } = req.params; // Get the ID from the URL parameters

    try {
        const deletedResult = await Scrape.findByIdAndDelete(id); // Find the document by ID and delete it

        if (deletedResult) {
            res.status(200).send({ status: true, message: "Result has been deleted.", data: deletedResult });
        } else {
            res.status(404).send({ status: false, message: "No result found with this ID." });
        }
    } catch (error) {
        res.status(500).send({ status: false, error: error.message });
    }
});



async function loadEntitiesFromFile(filename) {
    try {
        const data = await fs.readFile(filename, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading entities from file:', error);
        throw error;  // Handle or propagate the error as needed
    }
}

// Modify loadEntities() to use the file loading function

// async function loadEntities() {
//     try {
//         // Assuming ex.json is in the same directory as this script
//         const entities = await loadEntitiesFromFile('./ex.json');
//         return entities;
//     } catch (error) {
//         console.error('Failed to fetch entities:', error);
//         return [];  // Return an empty array or handle the error as needed
//     }
// }

async function loadEntities() {
    try {
        // Make an API call to fetch entities
        const response = await axios.get('https://digitalbackend-production.up.railway.app/exceldata/getjson');
        
        // Check if the response is successful and return the data
        if (response.status === 200) {
            return response.data; // Adjust this if your API returns data differently
        } else {
            console.error('Failed to fetch entities:', response.statusText);
            return []; // Return an empty array or handle the error as needed
        }
    } catch (error) {
        console.error('Failed to fetch entities:', error);
        return []; // Return an empty array or handle the error as needed
    }
}
app.get("/scrape", async (req, res) => {
    const entities = await loadEntities();  // Fetch entities right before they are needed

    let scrapedResults = [];
    let processedEntities = 0;
    console.log(entities.length);

    // Iterate through entities
    for (let i = 0; i < entities.length; i += 2) {
        const entity1 = entities[i];
        const entity2 = entities[i + 1];

        // Acquire the semaphore to control concurrency
        await semaphore.acquire();

        // Create promises for scraping both entities
        const scrapePromises = [];
        if (entity1) {
            scrapePromises.push(scrapeEntity(entity1, scrapedResults));
            processedEntities++;
            console.log(`${processedEntities}/${entities.length} completed.`);
        }
        if (entity2) {
            scrapePromises.push(scrapeEntity(entity2, scrapedResults));
            processedEntities++;
            console.log(`${processedEntities}/${entities.length} completed.`);
        }

        // Wait for both scraping operations to finish before releasing the semaphore
        await Promise.all(scrapePromises);

        // Release the semaphore
        semaphore.release();
        semaphore.release();
    }
    // Store the scraped results in Redis
    await client.set('scrapedResults', JSON.stringify(scrapedResults));
    // Respond with the scraped data
    res.json(scrapedResults);
});

async function scrapeEntity(entity, scrapedResults) {
    let categories = ['Winkels', 'Horeca', 'Verenigingen', 'Bedrijven', 'Evenementen', 'Lifestyle', 'Recreatie', 'Sport', 'Cultuur'].filter(category => entity[category] === 'x');

    try {
        // Fetch business details
        const businessDetailsInput = {
            startUrls: [{ url: entity.Facebookadres }],
            resultsLimit: 1,
        };
        const businessDetailsRun = await apifyClient.actor("KoJrdxJCTtpon81KY").call(businessDetailsInput);
        const businessDetails = businessDetailsRun && businessDetailsRun.defaultDatasetId ? await apifyClient.dataset(businessDetailsRun.defaultDatasetId).listItems() : [];

        // Fetch latest post
        const latestPostInput = {
            startUrls: [{ url: `${entity.Facebookadres}/posts` }],
            resultsLimit: 1,
        };
        const latestPostRun = await apifyClient.actor("KoJrdxJCTtpon81KY").call(latestPostInput);
        const latestPost = latestPostRun && latestPostRun.defaultDatasetId ? await apifyClient.dataset(latestPostRun.defaultDatasetId).listItems() : [];

        // Upsert the entry in the database
        const existingScrape = await Scrape.findOneAndUpdate(
            { Bedrijfsnaam: entity.Bedrijfsnaam },
            {
                Bedrijfsnaam: entity.Bedrijfsnaam,
                categories,
                businessDetails,
                latestPost,
            },
            { upsert: true, new: true }
        );

        // Avoid duplicates by checking existing scraped results
        const existingIndex = scrapedResults.findIndex(result => result.Bedrijfsnaam === existingScrape.Bedrijfsnaam);
        if (existingIndex === -1) {
            scrapedResults.push(existingScrape);
        }
    } catch (error) {
        console.error('Scraping error for:', entity.Bedrijfsnaam, error);
        scrapedResults.push({ Bedrijfsnaam: entity.Bedrijfsnaam, categories, error: error.message });
    }
}

// Connect to Redis
connectToRedis();
// Starting the server
app.listen(process.env.PORT, () => {
    console.log("Server started");
});

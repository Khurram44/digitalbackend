const express = require("express");
const env = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const { ApifyClient } = require('apify-client');
const fs = require('fs');
const Scrape = require("./models/scrape");
const { Semaphore } = require('async-mutex');
const axios = require('axios');
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

app.use('/exceldata', excel)
app.use('/auth', auth)
// Load your data
// const entities = JSON.parse(fs.readFileSync('data.json', 'utf8'));


app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Digital Backend API!" });
});

//get scrped result
app.get("/result", async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Page number, default to 1
    const limit = parseInt(req.query.limit) || 10; // Number of results per page, default to 10

    try {
        const skip = (page - 1) * limit;
        const total = await Scrape.countDocuments(); // Total number of documents in the collection
        const result = await Scrape.find().skip(skip).limit(limit); // Fetch documents for the current page

        res.status(200).send({
            status: true,
            result: result,
            total: total,
            page: page,
            pages: Math.ceil(total / limit) // Calculate total number of pages
        });
    } catch (error) {
        res.status(500).send({ status: false, error: error.message }); // Handle internal server error
    }
});
async function loadEntities() {
    try {
        // Update the URL to the actual location of your /exceldata/getjson endpoint
        const response = await axios.get('https://digitalbackend-f362d91cd976.herokuapp.com/exceldata/getjson');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch entities:', error);
        return [];  // Return an empty array or handle the error as needed
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

    // Respond with the scraped data
    res.json(scrapedResults);
});

async function scrapeEntity(entity, scrapedResults) {
    let categories = ['Winkels', 'Horeca', 'Verenigingen', 'Bedrijven', 'Evenementen'].filter(category => entity[category] === 'x');
    try {
        // Prepare Actor input for fetching business details
        const businessDetailsInput = {
            startUrls: [{ url: entity.Facebookadres }],
            resultsLimit: 1,
        };
        // Run the Actor to fetch business details
        const businessDetailsRun = await apifyClient.actor("KoJrdxJCTtpon81KY").call(businessDetailsInput);

        if (businessDetailsRun && businessDetailsRun.defaultDatasetId) {
            const { items: businessDetails } = await apifyClient.dataset(businessDetailsRun.defaultDatasetId).listItems();

            // Prepare Actor input for fetching latest post
            const latestPostInput = {
                startUrls: [{ url: `${entity.Facebookadres}/posts` }],
                resultsLimit: 1,
            };

            // Run the Actor to fetch latest post
            const latestPostRun = await apifyClient.actor("KoJrdxJCTtpon81KY").call(latestPostInput);

            if (latestPostRun && latestPostRun.defaultDatasetId) {
                const { items: latestPost } = await apifyClient.dataset(latestPostRun.defaultDatasetId).listItems();

                // Create a new instance of the Scrape model
                const existingScrape = await Scrape.findOneAndUpdate(
                    { Bedrijfsnaam: entity.Bedrijfsnaam },
                    {
                        Bedrijfsnaam: entity.Bedrijfsnaam,
                        categories,
                        businessDetails,
                        latestPost
                    },
                    { upsert: true, new: true }
                );
                scrapedResults.push(existingScrape);
            }
        }
    } catch (error) {
        console.error('Scraping error for:', entity.Bedrijfsnaam, error);
        scrapedResults.push({ Bedrijfsnaam: entity.Bedrijfsnaam, categories, error: error.message });
    }
}


// Starting the server
app.listen(process.env.PORT, () => {
    console.log("Server started");
});

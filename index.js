const express = require("express");
const env = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const { ApifyClient } = require('apify-client');
const Scrape = require("./models/scrape");
const { Semaphore } = require('async-mutex');
const axios = require('axios');
const fs = require('fs').promises;
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
    try {
        const result = await Scrape.find().sort({ createdAt: -1 }) // replace 'createdAt' with your timestamp field
        res.status(200).send({ status: true, result: result })
    } catch (error) {
        res.status(400).send({ status: false, error: error })
    }
})
app.delete("/result", async (req, res) => {
    try {
        await Scrape.deleteMany({});
        res.status(200).send({ status: true, message: "All results have been deleted." });
    } catch (error) {
        res.status(500).send({ status: false, error: error.message });
    }
});

// async function loadEntities() {
//     try {
//         // Update the URL to the actual location of your /exceldata/getjson endpoint
//         const response = await axios.get('http://localhost:5000/exceldata/getjson');
//         return response.data;
//     } catch (error) {
//         console.error('Failed to fetch entities:', error);
//         return [];  // Return an empty array or handle the error as needed
//     }
// }
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
async function loadEntities() {
    try {
        // Assuming ex.json is in the same directory as this script
        const entities = await loadEntitiesFromFile('./ex.json');
        return entities;
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
    let categories = ['Winkels', 'Horeca', 'Verenigingen', 'Bedrijven', 'Evenementen','Lifestyle','Recreatie','Sport','Cultuur'].filter(category => entity[category] === 'x');
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

// // Scraping route
// app.get("/scrape", async (req, res) => {
//     let scrapedResults = [];
//     let processedEntities = 0;
//     console.log(entities.length)
//     for (let entity of entities) {
//         let categories = ['Winkels', 'Horeca', 'Verenigingen', 'Bedrijven', 'Evenementen'].filter(category => entity[category] === 'x');
//         try {
//             // Prepare Actor input for fetching business details
//             const businessDetailsInput = {
//                 startUrls: [{ url: entity.Facebookadres }],
//                 resultsLimit: 1,
//             };

//             // Run the Actor to fetch business details
//             const businessDetailsRun = await apifyClient.actor("KoJrdxJCTtpon81KY").call(businessDetailsInput);

//             if (businessDetailsRun && businessDetailsRun.defaultDatasetId) {
//                 const { items: businessDetails } = await apifyClient.dataset(businessDetailsRun.defaultDatasetId).listItems();

//                 // Prepare Actor input for fetching latest post
//                 const latestPostInput = {
//                     startUrls: [{ url: `${entity.Facebookadres}/posts` }],
//                     resultsLimit: 1,
//                 };

//                 // Run the Actor to fetch latest post
//                 const latestPostRun = await apifyClient.actor("KoJrdxJCTtpon81KY").call(latestPostInput);

//                 if (latestPostRun && latestPostRun.defaultDatasetId) {
//                     const { items: latestPost } = await apifyClient.dataset(latestPostRun.defaultDatasetId).listItems();

//                     // Create a new instance of the Scrape model
//                     const existingScrape = await Scrape.findOneAndUpdate(
//                         { Bedrijfsnaam: entity.Bedrijfsnaam },
//                         {
//                             Bedrijfsnaam: entity.Bedrijfsnaam,
//                             categories,
//                             businessDetails,
//                             latestPost
//                         },
//                         { upsert: true, new: true }
//                     );
//                     scrapedResults.push(existingScrape);
//                     processedEntities++;
//                     console.log(`${processedEntities}/${entities.length} completed.`)
                                   
//                 }
//             }
//         } catch (error) {
//             console.error('Scraping error for:', entity.Bedrijfsnaam, error);
//             scrapedResults.push({ Bedrijfsnaam: entity.Bedrijfsnaam, categories, error: error.message });
//         }
//     }

//     // Respond with the scraped data
//     res.json(scrapedResults);
// });
// app.get("/scrape", async (req, res) => {
//     const totalEntities = entities.length;
//     let processedEntities = 0;
//     let scrapedResults = [];
//     console.log(totalEntities)

//     try {
//         const scrapePromises = entities.map(async (entity) => {
//             let categories = ['Winkels', 'Horeca', 'Verenigingen', 'Bedrijven', 'Evenementen'].filter(category => entity[category] === 'x');

//             const businessDetailsInput = {
//                 startUrls: [{ url: entity.Facebookadres }],
//                 resultsLimit: 1,
//             };

//             const latestPostInput = {
//                 startUrls: [{ url: `${entity.Facebookadres}/posts` }],
//                 resultsLimit: 1,
//             };

//             const [businessDetailsRun, latestPostRun] = await Promise.all([
//                 apifyClient.actor("KoJrdxJCTtpon81KY").call(businessDetailsInput),
//                 apifyClient.actor("KoJrdxJCTtpon81KY").call(latestPostInput)
//             ]);

//             if (businessDetailsRun && businessDetailsRun.defaultDatasetId && latestPostRun && latestPostRun.defaultDatasetId) {
//                 const [businessDetailsResponse, latestPostResponse] = await Promise.all([
//                     apifyClient.dataset(businessDetailsRun.defaultDatasetId).listItems(),
//                     apifyClient.dataset(latestPostRun.defaultDatasetId).listItems()
//                 ]);

//                 const existingScrape = await Scrape.findOneAndUpdate(
//                     { Bedrijfsnaam: entity.Bedrijfsnaam },
//                     {
//                         Bedrijfsnaam: entity.Bedrijfsnaam,
//                         categories,
//                         businessDetails: businessDetailsResponse.items,
//                         latestPost: latestPostResponse.items
//                     },
//                     { upsert: true, new: true }
//                 );
//                 processedEntities++;
//                 console.log(`${processedEntities}/${totalEntities} completed.`)
//                 return existingScrape;
//             }
//         });

//         scrapedResults = await Promise.all(scrapePromises.filter(p => p));
//     } catch (error) {
//         console.error('Scraping error:', error);
//         res.status(500).json({ error: 'An error occurred during scraping.' });
//         return;
//     }

//     const progressPercentage = Math.round((processedEntities / totalEntities) * 100);

//     res.json({ progress: progressPercentage, data: scrapedResults });
// });


// Starting the server
app.listen(process.env.PORT, () => {
    console.log("Server started");
});

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
const http = require('http');
const { Server } = require('socket.io');



// Define the maximum concurrency
const MAX_CONCURRENCY = 2;
const semaphore = new Semaphore(MAX_CONCURRENCY);
env.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors: {
        origin: ["http://localhost:3002","https://alles-in-tubbergen-admin.vercel.app","https://admin.allesintubbergen.nl"], // Replace with your frontend URL
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
      }
});
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const client = createClient({
    url:process.env.REDIS_URL,
    legacyMode: true
});

client.on('error', (err) => console.error('Redis Client Error', err));

async function connectToRedis() {
    try {
        await client.connect();
        console.log("Connected to Redis");
    } catch (err) {
        console.error("Could not connect to Redis", err);
    }
}
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

app.get("/get-progress",async(req,res)=>{
const d = await Progress.find()
res.send(d)
})
const { performance } = require('perf_hooks');
const sendEmail = require("./emailService");
const { cronSchedule } = require("./cron");
const Progress = require("./models/progress");

cronSchedule(io)

app.get("/result/cache", async (req, res) => {
    const start = performance.now();

    try {
        // Step 1: Check for cached data
        const cacheStart = performance.now();
        const cachedResult = await client.get('scrapedResults',async(err,rest)=>{
            if (err) {
                console.error('Error fetching from Redis:', err);
                return res.status(400).send({ status: false,res:"YES", error: err });
            }  
            if (rest) {
                console.log('Cached data found:'); // Log cached data
                // console.log(`Cache hit: ${cacheEnd - start} ms (fetch: ${cacheEnd - cacheStart} ms)`);
                return res.status(200).send({ status: true,res:"YES", result: JSON.parse(rest) });
            }
            // console.log(`Cache miss: ${cacheEnd - start} ms (fetch: ${cacheEnd - cacheStart} ms)`);
            const dbStart = performance.now();
            const result = await Scrape.aggregate([{ $sort: { "latestPost.time": -1 } }]);
            const dbEnd = performance.now();
    
            // Step 3: Store the fetched result in cache
            await client.set('scrapedResults', JSON.stringify(result)); // Cache with expiration of 1 hour
            const totalEnd = performance.now();
            console.log(`DB fetch time: ${dbEnd - dbStart} ms`);
            console.log(`Cache store time: ${totalEnd - dbEnd} ms`);
            console.log(`Total processing time: ${totalEnd - start} ms`);
    
            // Return the result
            res.status(200).send({ status: true, result: result });
    
        })
        
    } catch (error) {
        console.error('Error in /result/cache:', error);
        res.status(400).send({ status: false, error: error.message });
    }
});





// API to get results directly from MongoDB without using Redis cache

// app.get("/result/cache", async (req, res) => {
//     const start = performance.now();

//     try {
//         // Step 1: Check for cached data
//         const cacheStart = performance.now();
        
//         client.get('scrapedResults', async (err, rest) => {
//             if (err) {
//                 console.error('Error fetching from Redis:', err);
//                 return res.status(400).send({ status: false, res: "YES", error: err });
//             }  
//             if (rest) {
//                 console.log('Cached data found:');
//                 const cacheEnd = performance.now();
//                 console.log(`Cache hit: ${cacheEnd - start} ms (fetch: ${cacheEnd - cacheStart} ms)`);
//                 return res.status(200).send({ status: true, res: "YES", result: JSON.parse(rest) });
//             }
            
//             const cacheEnd = performance.now();
//             console.log(`Cache miss: ${cacheEnd - start} ms (fetch: ${cacheEnd - cacheStart} ms)`);

//             // Fetch data from the database
//             const dbStart = performance.now();
//             const result = await Scrape.aggregate([{ $sort: { "latestPost.time": -1 } }]);
//             const dbEnd = performance.now();

//             // Step 3: Store the fetched result in cache
//             await client.set('scrapedResults', JSON.stringify(result), 'EX', 3600); // Cache with expiration of 1 hour
//             const totalEnd = performance.now();
//             console.log(`DB fetch time: ${dbEnd - dbStart} ms`);
//             console.log(`Cache store time: ${totalEnd - dbEnd} ms`);
//             console.log(`Total processing time: ${totalEnd - start} ms`);

//             // Return the result
//             res.status(200).send({ status: true, result: result });
//         });
        
//     } catch (error) {
//         console.error('Error in /result/cache:', error);
//         res.status(500).send({ status: false, error: error.message || 'Internal Server Error' });
//     }
// });

// app.get("/result", async (req, res) => {
//     try {
//         const result = await Scrape.aggregate([
//             {
//                 $sort: { "latestPost.time": -1 } // Sort based on the `time` field in `latestPost`
//             },
//         ]);

//         res.status(200).send({ status: true, result: result });
//     } catch (error) {
//         res.status(400).send({ status: false, error: error.message });
//     }
// });

app.get("/result", async (req, res) => {
    try {
        const result = await Scrape.aggregate([
            {
                $sort: { "latestPost.time": -1 }
            },
            {
                $lookup: {
                    from: "categories",          // The name of your Category collection
                    localField: "categories",    // Field in Scrape model containing category IDs
                    foreignField: "_id",         // Field in Category model to match on
                    as: "categoryDetails"        // Output array to store matched categories
                }
            },
            {
                $addFields: {
                    categories: "$categoryDetails.name"  // Replace IDs with names
                }
            },
            {
                $project: {
                    categoryDetails: 0 // Optionally hide the temporary field
                }
            }
        ]);

        res.status(200).send({ status: true, result: result });
    } catch (error) {
        res.status(400).send({ status: false, error: error.message });
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
    const entities = [
        {
          "_id": "671bccf7e32583248eebd4b3",
          "Bedrijfsnaam": "Sportvereniging Mariaparochie Voetbal Vereniging 1929",
          "Facebookadres": "https://www.facebook.com/mvv29harbrinkhoek",
          "categories": [
            "Verenigingen",
            "Sport"
          ],
          "__v": 0
        },
        {
          "_id": "671bccf7e32583248eebd4b5",
          "Bedrijfsnaam": "Steggink Catering & Events",
          "Facebookadres": "https://www.facebook.com/StegginkCateringEvents",
          "categories": [
            "Bedrijven"
          ],
          "__v": 0
        }]
    // await loadEntities();  // Fetch entities right before they are needed

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
            scrapePromises.push(scrapeEntity(entity1, scrapedResults,entity1.categories));
            processedEntities++;
            console.log(`${processedEntities}/${entities.length} completed.`);
        }
        if (entity2) {
            scrapePromises.push(scrapeEntity(entity2, scrapedResults,entity2.categories));
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

async function scrapeEntity(entity, scrapedResults,categories) {
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


// Connect to Redis
connectToRedis();
//IO connection
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });

// Starting the server
server.listen(process.env.PORT, () => {
    console.log("Server started");
});

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
        console.log('Attempting to connect to Redis with URL:', process.env.REDIS_URL);
        await client.connect();
        console.log('Connected to Redis');
    } catch (err) {
        console.error('Could not connect to Redis:', err);
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
const { cronSchedule, scrapeFunction } = require("./cron");
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



app.post('/scrape', async (req, res) => {
    try {
        console.log("Scrape API called");
        console.log("Request Body:", req.body); // Log the request body to verify the input

        // Call the scrapeFunction with a mock `io` object
        const result = await scrapeFunction({ emit: () => {} });

        // Log the result of the scraping process
        console.log("Scraping Result:", result);

        // Send the response back to the client
        res.status(200).json({ 
            status: "success", 
            message: "Scraping completed", 
            data: result 
        });
    } catch (error) {
        console.error("Error in /scrape endpoint:", error);

        // Send an error response back to the client
        res.status(500).json({ 
            status: "error", 
            message: "Scraping failed", 
            error: error.message 
        });
    }
});
app.get('/scrapedata', async (req, res) => {
    try {
        const scrapedData = await Scrape.find().sort({ createdAt: -1 }); // Get the latest data first
        console.log("Scraped Data Retrieved:", scrapedData); // Log the full response

        res.status(200).json({
            status: "success",
            message: "Scraped data retrieved successfully",
            data: scrapedData
        });
    } catch (error) {
        console.error("Error in /scrape GET endpoint:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to retrieve data",
            error: error.message
        });
    }
});

app.get("/result", async (req, res) => {
    try {
        console.log("Fetching results from the database...");

        // Fetch all documents from the Scrape collection (for debugging)
        const allScrapes = await Scrape.find({});
        console.log("All Scrapes:", allScrapes);

        // Perform the aggregation
        const result = await Scrape.aggregate([
            {
                $sort: { "latestPost.time": -1 } // Sort by latestPost time (descending)
            },
            {
                $lookup: {
                    from: "categories",          // The name of your Category collection
                    localField: "categories",    // Field in Scrape model containing category IDs
                    foreignField: "_id",         // Field in Category model to match on
                    as: "categoryDetails"       // Output array to store matched categories
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

        console.log("Aggregation Result:", result);

        // Send the response
        res.status(200).send({ status: true, result: result });
    } catch (error) {
        console.error("Error in /result endpoint:", error);
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

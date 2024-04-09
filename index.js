const express = require("express");
const env = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const { ApifyClient } = require('apify-client');
const fs = require('fs');

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

mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to Database")).catch((err) => console.warn(err));

// Load your data
const entities = JSON.parse(fs.readFileSync('data.json', 'utf8'));

app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Digital Backend API!" });
  });
// Scraping route
app.get("/scrape", async (req, res) => {
    let scrapedResults = [];

    for (let entity of entities) {
        let categories = ['Winkels', 'Horeca', 'Verenigingen', 'Bedrijven', 'Evenementen'].filter(category => entity[category] === 'x');
        try {
            // Prepare Actor input for each URL
            const input = {
                startUrls: [{ url: entity.Facebookadres }],
                resultsLimit: 1, // This might need adjustments based on your needs
            };

            // Run the Actor and wait for it to finish
            const run = await apifyClient.actor("KoJrdxJCTtpon81KY").call(input);

            if (run && run.defaultDatasetId) {
                // Fetch Actor results from the run's dataset
                const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
                if (items.length > 0) {
                    scrapedResults.push({ Bedrijfsnaam: entity.Bedrijfsnaam, categories, items });
                }
            }
        } catch (error) {
            console.error('Scraping error for:', entity.Bedrijfsnaam, error);
            scrapedResults.push({ Bedrijfsnaam: entity.Bedrijfsnaam, categories, error: error.message });
        }
    }

    // Respond with the scraped data
    res.json(scrapedResults);
});   

// Starting the server
app.listen(process.env.PORT, () => {
    console.log("Server started");
});

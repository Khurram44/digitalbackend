const express = require("express");
const env = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const { ApifyClient } = require('apify-client');
const fs = require('fs');
const Scrape = require("./models/scrape");

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

// Load your data
const entities = JSON.parse(fs.readFileSync('data.json', 'utf8'));


app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Digital Backend API!" });
});

const excel = require('./routes/excelfile')
const auth = require('./routes/user')

app.use('/exceldata', excel)
app.use('/auth', auth)


//get scrped result
app.get("/result", async (req, res) => {
    try {
        const result = await Scrape.find()
        res.status(200).send({ status: true, result: result })
    } catch (error) {
        res.status(400).send({ status: false, error: error })
    }
})
// Scraping route
app.get("/scrape", async (req, res) => {
    let scrapedResults = [];

    for (let entity of entities) {
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

    // Respond with the scraped data
    res.json(scrapedResults);
});


// Starting the server
app.listen(process.env.PORT, () => {
    console.log("Server started");
});

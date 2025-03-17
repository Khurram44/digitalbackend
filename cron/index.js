// const cron = require("node-cron");
// const { Semaphore } = require('async-mutex');
// // Define the maximum concurrency
// const MAX_CONCURRENCY = 2;
// const semaphore = new Semaphore(MAX_CONCURRENCY);
// const { ApifyClient } = require('apify-client');
// const Scrape = require("../models/scrape");
// const sendEmail = require("../emailService");
// const Progress = require("../models/progress");
// const Business = require("../models/excelfile");


// const apifyClient = new ApifyClient({
//     token: process.env.APIFY_TOKEN,
// });
// // Schedule a cron job to run at 8 PM daily Pakistan time
// const cronSchedule = (io)=>{
//     cron.schedule(`${process.env.MINUTES} ${process.env.HOURS} * * *`, async () => {
//         console.log("Cron job running at 8 PM PKT");
//         sendEmail("ks7844201@gmail.com","Scrape Started","scrapeStarted",{finishedAt:  new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })})
//         io.emit("scrapeStatus", { status: "loading", message: "Scraping in process..." });
//         const result =await scrapeFunction(io)
//         io.emit("scrapeStatus", { status: "completed", message: "Scrape complete" });
//         console.log(result)
//         await updateProgress("Scrape complete",result.length,result.processed )
//         sendEmail("ks7844201@gmail.com","Scrape Finished","scrapeFinished",{finishedAt:  new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" }),total:result.total,scrapped:result.processed})

//         // Your task code here
//       },
//       {
//         timezone: "Asia/Karachi",
//       });
// }

// const scrapeFunction= async (io) => {
//     const entities = await Business.find()
//     // await loadEntities();  // Fetch entities right before they are needed

//     let scrapedResults = [];
//     let processedEntities = 0;
//     console.log(entities.length);
    
//     // Iterate through entities
//     for (let i = 0; i < entities.length; i += 2) {
//         const entity1 = entities[i];
//         const entity2 = entities[i + 1];

//         // Acquire the semaphore to control concurrency
//         await semaphore.acquire();

//         // Create promises for scraping both entities
//         const scrapePromises = [];
//         if (entity1) {
//             scrapePromises.push(scrapeEntity(entity1, scrapedResults,entity1.categories).then(async e=>{
//                 processedEntities++;
//                await updateProgress("Scraping in process...",entities.length,processedEntities )
//                 io.emit("scrapeProgress", { processed: processedEntities, total: entities.length });
//                 console.log(`${processedEntities}/${entities.length} completed.`);
//             }));
            
//         }
//         if (entity2) {
//             scrapePromises.push(scrapeEntity(entity2, scrapedResults,entity2.categories).then(async e=>{
//                 processedEntities++;
//                await updateProgress("Scraping in process...",entities.length,processedEntities )
//                 io.emit("scrapeProgress", { processed: processedEntities, total: entities.length });

//                 console.log(`${processedEntities}/${entities.length} completed.`);
            
//             }));
//           }

//         // Wait for both scraping operations to finish before releasing the semaphore
//         await Promise.all(scrapePromises);

//         // Release the semaphore
//         semaphore.release();
//         semaphore.release();
//     }

//     // Respond with the scraped data
//    return  {total:entities.length,processed:processedEntities,message:"results were scraped."};

// };

// async function scrapeEntity(entity, scrapedResults,categories) {
//     try { 
//         // Prepare Actor input for fetching business details
//         const businessDetailsInput = {
//             startUrls: [{ url: entity.Facebookadres }],
//             resultsLimit: 1,
//         };
//         // Run the Actor to fetch business details
//         const businessDetailsRun = await apifyClient.actor("KoJrdxJCTtpon81KY").call(businessDetailsInput);
//         if (businessDetailsRun && businessDetailsRun.defaultDatasetId) {
//             const { items: businessDetails } = await apifyClient.dataset(businessDetailsRun.defaultDatasetId).listItems();
//             // Prepare Actor input for fetching latest post
//             const latestPostInput = {
//                 startUrls: [{ url: `${entity.Facebookadres}/posts` }],
//                 resultsLimit: 1,
//             };
//             // Run the Actor to fetch latest post
//             const latestPostRun = await apifyClient.actor("KoJrdxJCTtpon81KY").call(latestPostInput);

//             if (latestPostRun && latestPostRun.defaultDatasetId) {
//                 const { items: latestPost } = await apifyClient.dataset(latestPostRun.defaultDatasetId).listItems();

//                 // Create a new instance of the Scrape model
//                 const existingScrape = await Scrape.findOneAndUpdate(
//                     { Bedrijfsnaam: entity.Bedrijfsnaam },
//                     {
//                         Bedrijfsnaam: entity.Bedrijfsnaam,
//                         categories,
//                         businessDetails,
//                         latestPost
//                     },
//                     { upsert: true, new: true }
//                 );
//                 scrapedResults.push(existingScrape);
//             }
//         }
//     } catch (error) {
//         console.error('Scraping error for:', entity.Bedrijfsnaam, error);
//         scrapedResults.push({ Bedrijfsnaam: entity.Bedrijfsnaam, categories, error: error.message });
//     }
// }

// const updateProgress = async (message,total,processed)=>{
//     try {
//         const progress =  await Progress.findByIdAndUpdate("671d3bfdefd91e6ab4d762f8",{
//             message: message,
//             total: total,
//             processed: processed,
//         })
//         await  progress.save()
//         return "Progress  saved";


//     } catch (error) {

//         return  "error.message";

        
//     }
// }
// module.exports = {cronSchedule}


const cron = require("node-cron");
const { Semaphore } = require('async-mutex');
const axios = require('axios'); // Add axios for HTTP requests
// Define the maximum concurrency
const MAX_CONCURRENCY = 2;
const semaphore = new Semaphore(MAX_CONCURRENCY);
const Scrape = require("../models/scrape");
const sendEmail = require("../emailService");
const Progress = require("../models/progress");
const Business = require("../models/excelfile");
const path = require('path');
const fs = require('fs');

// Schedule a cron job to run at 8 PM daily Pakistan time
const cronSchedule = (io) => {
    cron.schedule(`${process.env.MINUTES} ${process.env.HOURS} * * *`, async () => {
        console.log("Cron job running at 8 PM PKT");
        sendEmail("ks7844201@gmail.com", "Scrape Started", "scrapeStarted", { finishedAt: new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" }) });
        io.emit("scrapeStatus", { status: "loading", message: "Scraping in process..." });
        const result = await scrapeFunction(io);
        io.emit("scrapeStatus", { status: "completed", message: "Scrape complete" });
        console.log(result);
        await updateProgress("Scrape complete", result.length, result.processed);
        sendEmail("ks7844201@gmail.com", "Scrape Finished", "scrapeFinished", { finishedAt: new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" }), total: result.total, scrapped: result.processed });

        // Your task code here
    },
        {
            timezone: "Asia/Karachi",
        });
}

const scrapeFunction = async (io) => {
    try {
        // Fetch all business entities
        const entities = await Business.find().skip(114);
        let scrapedResults = [];
        let processedEntities = 0;

        console.log("Total Businesses to Scrape:", entities.length);

        // Process each entity one by one
        for (const entity of entities) {
            await semaphore.acquire();
            try {
                console.log(`Processing: ${entity.Bedrijfsnaam} - ${entity.Facebookadres}`);

                // Extract categories (ensure it's an array)
                const categories = Array.isArray(entity.categories) ? entity.categories : ["Uncategorized"];

                // Perform the scraping
                await scrapeEntity(entity, scrapedResults, categories);
                processedEntities++;

                console.log(`✅ Processed: ${entity.Bedrijfsnaam}`);
                console.log(`Current scrapedResults count:`, scrapedResults.length);

                // Emit real-time progress updates
                io.emit("scrapeProgress", { processed: processedEntities, total: entities.length });

                // Update the scraping progress
                await updateProgress("Scraping in process...", entities.length, processedEntities);

            } catch (error) {
                console.error(`❌ Error scraping ${entity.Bedrijfsnaam}:`, error);
            } finally {
                semaphore.release();
            }
        }

        console.log("✅ Scraping Completed. Total Results:", scrapedResults.length);

        // Return the results along with metadata
        return { 
            total: entities.length, 
            processed: processedEntities, 
            message: "Scraping completed successfully.",
            scrapedResults 
        };

    } catch (error) {
        console.error("❌ Scraping failed:", error);
        return { 
            total: 0, 
            processed: 0, 
            message: "Scraping failed.",
            error: error.message 
        };
    }
};
async function scrapeEntity(entity, scrapedResults, categories) {
    try {
        // Prepare the payload for your bot
        const payload = {
            urls: [entity.Facebookadres] // Ensure only one URL is passed
        };

        console.log(`Scraping URL: ${entity.Facebookadres}`); // Log the URL being scraped

        // Make a POST request to your bot's endpoint
        const response = await axios.post('http://0.0.0.0:8000/scrape', payload);

        if (response.data.status === "success") {
            const scrapedData = response.data.results[entity.Facebookadres];

            // Create a new instance of the Scrape model
            const existingScrape = await Scrape.findOneAndUpdate(
                { Bedrijfsnaam: entity.Bedrijfsnaam },
                {
                    Bedrijfsnaam: entity.Bedrijfsnaam,
                    categories,
                    businessDetails: {
                        name: scrapedData.profile.name,
                        profile_image: scrapedData.profile.profile_image,
                        profile_url: entity.Facebookadres // Add the profile URL here
                    },
                    latestPost: scrapedData.posts,
                    images: scrapedData.images,
                    date: scrapedData.date
                },
                { upsert: true, new: true }
            );

            console.log(`Scraped data for ${entity.Facebookadres}:`, existingScrape); // Log the scraped data
            scrapedResults.push(existingScrape);
        } else {
            throw new Error("Scraping failed: " + response.data.message);
        }
    } catch (error) {
        console.error('Scraping error for:', entity.Bedrijfsnaam, error);
        scrapedResults.push({ Bedrijfsnaam: entity.Bedrijfsnaam, categories, error: error.message });
    }
}
const updateProgress = async (message, total, processed) => {
    try {
        const progress = await Progress.findByIdAndUpdate("671d3bfdefd91e6ab4d762f8", {
            message: message,
            total: total,
            processed: processed,
        });
        await progress.save();
        return "Progress saved";
    } catch (error) {
        return "error.message";
    }
}

module.exports = { cronSchedule,scrapeFunction };
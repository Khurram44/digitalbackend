const Scrape = require('../models/scrape');

const router = require('express').Router();

//get scrped result
router.get("/get", async (req, res) => {
    try {
        console.log("Fetching results...");
        const result = await Scrape.find().lean();
        res.status(200).send({ status: true, result: result })
    } catch (error) {
        res.status(400).send({ status: false, error: error })
    }
})

module.exports = router;
